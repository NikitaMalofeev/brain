-- Migration: Add overdue_lessons to get_user_stream_modules
-- Date: 2025-11-27
-- Description: Добавить подсчёт просроченных уроков для страницы профиля

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
    overdue_lessons BIGINT,  -- ДОБАВЛЕНО: просроченные уроки
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
        RETURN; -- Нет потока - нет модулей
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

    -- Если нет тарифа - нет модулей
    IF v_tariff_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH
    -- Модули из тарифа пользователя (ЕДИНСТВЕННЫЙ источник модулей)
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
    -- Уроки для каждого модуля через calendar_events
    module_lessons AS (
        SELECT
            ce.module_id,
            ce.lesson_id,
            l.open_at,
            l.deadline_at
        FROM public.calendar_events ce
        LEFT JOIN public.lessons l ON l.id = ce.lesson_id
        WHERE ce.stream_id = v_stream_id
        AND ce.event_type = 'lesson_unlock'
        AND ce.module_id IS NOT NULL
    ),
    -- Статистика по урокам
    module_stats AS (
        SELECT
            ml.module_id,
            COUNT(DISTINCT ml.lesson_id) AS total_lessons,
            COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN ml.lesson_id END) AS completed_lessons,
            COUNT(DISTINCT CASE WHEN ml.open_at IS NULL OR ml.open_at <= now() THEN ml.lesson_id END) AS unlocked_lessons,
            -- Просроченные: открыт, есть дедлайн, дедлайн прошёл, не выполнен
            COUNT(DISTINCT CASE
                WHEN (ml.open_at IS NULL OR ml.open_at <= now())  -- урок открыт
                AND ml.deadline_at IS NOT NULL                    -- есть дедлайн
                AND ml.deadline_at < now()                        -- дедлайн прошёл
                AND (lp.is_completed IS NULL OR lp.is_completed = false)  -- не выполнен
                THEN ml.lesson_id
            END) AS overdue_lessons
        FROM module_lessons ml
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = ml.lesson_id AND lp.user_id = p_user_id
        GROUP BY ml.module_id
    )
    SELECT
        sm.id AS module_id,
        sm.name AS module_name,
        sm.order_num AS module_order_num,
        sm.color AS module_color,
        -- Модуль разблокирован если текущий день >= unlock_offset_days
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
    -- ТОЛЬКО модули из тарифа
    JOIN tariff_modules tm ON tm.stream_module_id = sm.id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_stream_modules IS
'Возвращает модули потока пользователя ТОЛЬКО из его тарифа.
Включает статистику: total_lessons, completed_lessons, unlocked_lessons, overdue_lessons.
overdue_lessons - уроки с прошедшим дедлайном которые не выполнены.';

GRANT EXECUTE ON FUNCTION public.get_user_stream_modules(uuid) TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Функция get_user_stream_modules обновлена:';
    RAISE NOTICE '  - Добавлено поле overdue_lessons (просроченные уроки)';
END $$;
