-- Migration: Add function to migrate user progress when changing streams
-- Date: 2025-11-27
-- Description: Функция для переноса прогресса пользователя на новый поток

-- Функция для миграции прогресса одного пользователя на новый поток
CREATE OR REPLACE FUNCTION migrate_user_progress_to_stream(
    p_user_id UUID,
    p_new_stream_id UUID
)
RETURNS TABLE (
    migrated_lesson_progress INT,
    migrated_submissions INT
) AS $$
DECLARE
    v_old_stream_id UUID;
    v_migrated_progress INT := 0;
    v_migrated_submissions INT := 0;
BEGIN
    -- Получаем текущий поток пользователя (до обновления)
    SELECT stream_id INTO v_old_stream_id
    FROM user_stream_enrollments
    WHERE user_id = p_user_id
    LIMIT 1;

    -- Если пользователь уже в этом потоке или нет старого потока - ничего не делаем
    IF v_old_stream_id IS NULL OR v_old_stream_id = p_new_stream_id THEN
        RETURN QUERY SELECT 0, 0;
        RETURN;
    END IF;

    -- Мигрируем lesson_progress
    -- Находим соответствие старых уроков новым по имени и order_num
    WITH lesson_mapping AS (
        SELECT
            old_l.id as old_lesson_id,
            new_l.id as new_lesson_id
        FROM lessons old_l
        JOIN lessons new_l ON new_l.name = old_l.name
            AND new_l.order_num = old_l.order_num
        WHERE (old_l.stream_id = v_old_stream_id OR old_l.stream_id IS NULL)
          AND new_l.stream_id = p_new_stream_id
    )
    UPDATE lesson_progress lp
    SET lesson_id = lm.new_lesson_id
    FROM lesson_mapping lm
    WHERE lp.lesson_id = lm.old_lesson_id
      AND lp.user_id = p_user_id
      AND NOT EXISTS (
          -- Не обновляем если уже есть запись для нового урока
          SELECT 1 FROM lesson_progress lp2
          WHERE lp2.user_id = p_user_id AND lp2.lesson_id = lm.new_lesson_id
      );

    GET DIAGNOSTICS v_migrated_progress = ROW_COUNT;

    -- Мигрируем submissions
    WITH lesson_mapping AS (
        SELECT
            old_l.id as old_lesson_id,
            new_l.id as new_lesson_id
        FROM lessons old_l
        JOIN lessons new_l ON new_l.name = old_l.name
            AND new_l.order_num = old_l.order_num
        WHERE (old_l.stream_id = v_old_stream_id OR old_l.stream_id IS NULL)
          AND new_l.stream_id = p_new_stream_id
    )
    UPDATE submissions s
    SET lesson_id = lm.new_lesson_id
    FROM lesson_mapping lm
    WHERE s.lesson_id = lm.old_lesson_id
      AND s.user_id = p_user_id;

    GET DIAGNOSTICS v_migrated_submissions = ROW_COUNT;

    RAISE NOTICE 'Migrated user % progress: % lesson_progress, % submissions',
        p_user_id, v_migrated_progress, v_migrated_submissions;

    RETURN QUERY SELECT v_migrated_progress, v_migrated_submissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_user_progress_to_stream IS
'Переносит прогресс пользователя (lesson_progress, submissions) на новый поток.
Сопоставляет уроки по имени и order_num.';

GRANT EXECUTE ON FUNCTION migrate_user_progress_to_stream(UUID, UUID) TO authenticated;


-- Функция для массовой миграции прогресса всех пользователей потока
CREATE OR REPLACE FUNCTION migrate_all_users_progress_to_stream(
    p_old_stream_id UUID,
    p_new_stream_id UUID
)
RETURNS TABLE (
    user_id UUID,
    migrated_lesson_progress INT,
    migrated_submissions INT
) AS $$
DECLARE
    v_user RECORD;
    v_result RECORD;
BEGIN
    FOR v_user IN
        SELECT use.user_id
        FROM user_stream_enrollments use
        WHERE use.stream_id = p_old_stream_id
    LOOP
        -- Сначала обновляем поток пользователя
        UPDATE user_stream_enrollments
        SET stream_id = p_new_stream_id
        WHERE user_stream_enrollments.user_id = v_user.user_id;

        -- Затем мигрируем прогресс
        SELECT * INTO v_result
        FROM migrate_user_progress_to_stream(v_user.user_id, p_new_stream_id);

        RETURN QUERY SELECT v_user.user_id, v_result.migrated_lesson_progress, v_result.migrated_submissions;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_all_users_progress_to_stream IS
'Переводит всех пользователей из старого потока в новый и мигрирует их прогресс.';

GRANT EXECUTE ON FUNCTION migrate_all_users_progress_to_stream(UUID, UUID) TO authenticated;


DO $$
BEGIN
    RAISE NOTICE 'Созданы функции миграции прогресса:';
    RAISE NOTICE '  - migrate_user_progress_to_stream(user_id, new_stream_id) - для одного пользователя';
    RAISE NOTICE '  - migrate_all_users_progress_to_stream(old_stream_id, new_stream_id) - для всех пользователей потока';
END $$;
