-- Migration: Add first_stage_id to get_user_stream_modules
-- Date: 2025-11-27
-- Description: Добавить ID первой ступени модуля для корректной навигации

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
    unlock_day INT,
    first_stage_id BIGINT  -- ДОБАВЛЕНО: ID первой ступени для навигации
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
    -- Первая ступень каждого модуля (для навигации)
    first_stages AS (
        SELECT DISTINCT ON (cs.stream_module_id)
            cs.stream_module_id,
            cs.id AS stage_id
        FROM public.course_stages cs
        WHERE cs.stream_module_id IN (SELECT stream_module_id FROM tariff_modules)
        ORDER BY cs.stream_module_id, cs.order_num
    ),
    -- Уроки потока пользователя
    stream_lessons AS (
        SELECT
            cs.stream_module_id AS module_id,
            l.id AS lesson_id,
            l.order_num,
            COALESCE(l.open_day_offset, l.order_num - 1) AS lesson_open_offset,
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
            COUNT(DISTINCT CASE
                WHEN v_current_day >= (sl.module_unlock_offset + sl.lesson_open_offset)
                THEN sl.lesson_id
            END) AS unlocked_lessons,
            COUNT(DISTINCT CASE
                WHEN v_current_day >= (sl.module_unlock_offset + sl.lesson_open_offset)
                AND v_current_day > (sl.module_unlock_offset + sl.lesson_open_offset + 2)
                AND (lp.is_completed IS NULL OR lp.is_completed = false)
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
        tm.unlock_offset_days AS unlock_day,
        fs.stage_id AS first_stage_id  -- ID первой ступени
    FROM public.stream_modules sm
    JOIN public.streams s ON s.id = sm.stream_id
    JOIN tariff_modules tm ON tm.stream_module_id = sm.id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    LEFT JOIN first_stages fs ON fs.stream_module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_stream_modules IS
'Возвращает модули потока пользователя из его тарифа.
Включает first_stage_id для корректной навигации на страницу уроков.';

GRANT EXECUTE ON FUNCTION public.get_user_stream_modules(uuid) TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Функция get_user_stream_modules обновлена:';
    RAISE NOTICE '  - Добавлено поле first_stage_id для навигации';
END $$;
