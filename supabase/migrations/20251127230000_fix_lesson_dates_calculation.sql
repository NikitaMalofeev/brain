-- Migration: Fix lesson dates calculation
-- Date: 2025-11-27
-- Description: Исправить расчёт дат уроков - использовать относительные offset'ы вместо абсолютных дат

-- 1. Обновляем функцию get_user_stream_modules - считать просроченность по offset'ам
DROP FUNCTION IF EXISTS public.get_user_stream_modules(uuid);

CREATE OR REPLACE FUNCTION public.get_user_stream_modules(p_user_id UUID)
RETURNS TABLE (
    module_id UUID,
    module_name TEXT,
    module_order_num INT,
    module_color TEXT,
    is_unlocked BOOLEAN,
    total_lessons BIGINT,
    completed_lessons BIGINT,
    unlocked_lessons BIGINT,
    overdue_lessons BIGINT,
    stream_id UUID,
    stream_name TEXT,
    unlock_day INT
) AS $$
DECLARE
    v_stream_id UUID;
    v_tariff_id UUID;
    v_stream_start_date DATE;
    v_current_day INT;
BEGIN
    -- Получаем поток пользователя
    SELECT use.stream_id INTO v_stream_id
    FROM public.user_stream_enrollments use
    WHERE use.user_id = p_user_id
    LIMIT 1;

    IF v_stream_id IS NULL THEN
        RETURN;
    END IF;

    -- Получаем дату начала потока
    SELECT start_date INTO v_stream_start_date
    FROM public.streams
    WHERE id = v_stream_id;

    -- Вычисляем текущий день от начала потока
    v_current_day := GREATEST(0, (CURRENT_DATE - v_stream_start_date));

    -- Получаем активный тариф пользователя
    SELECT tariff_id INTO v_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;

    IF v_tariff_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH
    -- Модули из тарифа пользователя
    tariff_modules AS (
        SELECT
            tsm.stream_module_id,
            COALESCE(tsm.unlock_offset_days, 0) AS unlock_offset_days,
            tsm.order_num AS tariff_order_num
        FROM public.tariff_stream_modules tsm
        JOIN public.stream_tariffs st ON st.id = tsm.stream_tariff_id
        WHERE st.stream_id = v_stream_id
          AND st.tariff_id = v_tariff_id
    ),
    -- Уроки потока пользователя
    stream_lessons AS (
        SELECT
            cs.stream_module_id AS module_id,
            l.id AS lesson_id,
            l.order_num,
            -- Используем open_day_offset, если нет - берём order_num - 1
            COALESCE(l.open_day_offset, l.order_num - 1) AS lesson_open_offset,
            -- unlock_offset модуля
            COALESCE(tm.unlock_offset_days, 0) AS module_unlock_offset
        FROM public.lessons l
        JOIN public.course_stages cs ON cs.id = l.stage_id
        JOIN tariff_modules tm ON tm.stream_module_id = cs.stream_module_id
        WHERE l.stream_id = v_stream_id
    ),
    -- Статистика по урокам
    module_stats AS (
        SELECT
            sl.module_id,
            COUNT(DISTINCT sl.lesson_id) AS total_lessons,
            COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN sl.lesson_id END) AS completed_lessons,
            -- Урок открыт если: текущий_день >= module_unlock_offset + lesson_open_offset
            COUNT(DISTINCT CASE
                WHEN v_current_day >= (sl.module_unlock_offset + sl.lesson_open_offset)
                THEN sl.lesson_id
            END) AS unlocked_lessons,
            -- Урок просрочен если:
            -- 1. Урок открыт (текущий_день >= module_unlock_offset + lesson_open_offset)
            -- 2. Дедлайн прошёл (текущий_день > module_unlock_offset + lesson_open_offset + 2)
            -- 3. Урок не выполнен
            COUNT(DISTINCT CASE
                WHEN v_current_day >= (sl.module_unlock_offset + sl.lesson_open_offset)  -- открыт
                AND v_current_day > (sl.module_unlock_offset + sl.lesson_open_offset + 2)  -- дедлайн прошёл (+2 дня)
                AND (lp.is_completed IS NULL OR lp.is_completed = false)  -- не выполнен
                THEN sl.lesson_id
            END) AS overdue_lessons
        FROM stream_lessons sl
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = sl.lesson_id AND lp.user_id = p_user_id
        GROUP BY sl.module_id
    )
    SELECT
        sm.id AS module_id,
        sm.name AS module_name,
        sm.order_num AS module_order_num,
        sm.color AS module_color,
        tm.unlock_offset_days <= v_current_day AS is_unlocked,
        COALESCE(ms.total_lessons, 0) AS total_lessons,
        COALESCE(ms.completed_lessons, 0) AS completed_lessons,
        COALESCE(ms.unlocked_lessons, 0) AS unlocked_lessons,
        COALESCE(ms.overdue_lessons, 0) AS overdue_lessons,
        v_stream_id AS stream_id,
        s.name AS stream_name,
        tm.unlock_offset_days AS unlock_day
    FROM public.stream_modules sm
    JOIN public.streams s ON s.id = sm.stream_id
    JOIN tariff_modules tm ON tm.stream_module_id = sm.id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_stream_modules IS
'Возвращает модули потока пользователя из его тарифа.
Даты уроков рассчитываются относительно start_date потока:
- open = stream.start_date + module.unlock_offset_days + lesson.open_day_offset
- deadline = open + 2 дня';

GRANT EXECUTE ON FUNCTION public.get_user_stream_modules(uuid) TO authenticated;


-- 2. Функция для обновления open_day_offset уроков потока
CREATE OR REPLACE FUNCTION fix_lesson_offsets_for_stream(p_stream_id UUID)
RETURNS INT AS $$
DECLARE
    v_updated INT := 0;
BEGIN
    -- Обновляем open_day_offset = order_num - 1 для всех уроков потока
    UPDATE lessons l
    SET open_day_offset = l.order_num - 1
    WHERE l.stream_id = p_stream_id
      AND (l.open_day_offset IS NULL OR l.open_day_offset = 0);

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RAISE NOTICE 'Updated % lessons with correct open_day_offset for stream %', v_updated, p_stream_id;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fix_lesson_offsets_for_stream(UUID) TO authenticated;


-- 3. Исправляем уроки текущего потока
SELECT fix_lesson_offsets_for_stream('6dfe5fb1-7db5-4e7e-b790-64c710b3d06f');


DO $$
BEGIN
    RAISE NOTICE 'Функция get_user_stream_modules обновлена:';
    RAISE NOTICE '  - Даты уроков теперь рассчитываются относительно start_date потока';
    RAISE NOTICE '  - open = stream.start_date + module.unlock_offset_days + lesson.open_day_offset';
    RAISE NOTICE '  - deadline = open + 2 дня';
    RAISE NOTICE '  - Урок просрочен только если текущий день > open + 2';
END $$;
