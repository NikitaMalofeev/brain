-- Migration: Fix preview functions to return real unlock_offset_days
-- Date: 2025-12-04
-- Description: Обновляем preview функции чтобы возвращать реальные unlock_offset_days для отображения периодов модулей

-- ============================================
-- 1. Обновляем функцию получения модулей для preview
--    Теперь возвращает реальные unlock_offset_days из tariff_stream_modules
-- ============================================
CREATE OR REPLACE FUNCTION public.get_preview_stream_modules()
RETURNS TABLE (
    module_id UUID,
    module_name TEXT,
    module_order_num INTEGER,
    module_color TEXT,
    is_unlocked BOOLEAN,
    total_lessons BIGINT,
    completed_lessons BIGINT,
    unlocked_lessons BIGINT,
    overdue_lessons BIGINT,
    stream_id UUID,
    stream_name TEXT,
    unlock_day INTEGER,
    first_stage_id BIGINT,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    overdue_assignments BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stream_id UUID;
    v_stream_start_date DATE;
    v_current_day INT;
BEGIN
    -- Получаем первый активный поток
    SELECT s.id, s.start_date INTO v_stream_id, v_stream_start_date
    FROM public.streams s
    WHERE s.is_active = true
    ORDER BY s.start_date DESC
    LIMIT 1;

    IF v_stream_id IS NULL THEN
        RETURN;
    END IF;

    -- Вычисляем текущий день от начала потока
    v_current_day := GREATEST(0, (CURRENT_DATE - v_stream_start_date));

    RETURN QUERY
    WITH
    -- Получаем unlock_offset_days из tariff_stream_modules (берём минимальный для каждого модуля)
    module_unlock_days AS (
        SELECT
            tsm.stream_module_id,
            MIN(tsm.unlock_offset_days) AS unlock_offset_days
        FROM public.tariff_stream_modules tsm
        JOIN public.stream_modules sm ON sm.id = tsm.stream_module_id
        WHERE sm.stream_id = v_stream_id
        GROUP BY tsm.stream_module_id
    ),
    -- Первый урок каждого модуля
    first_lessons AS (
        SELECT DISTINCT ON (l.stream_module_id)
            l.stream_module_id,
            l.id AS first_lesson_id
        FROM public.lessons l
        JOIN public.stream_modules sm ON sm.id = l.stream_module_id
        WHERE sm.stream_id = v_stream_id
        ORDER BY l.stream_module_id, l.order_num
    ),
    -- Подсчёт уроков
    module_stats AS (
        SELECT
            l.stream_module_id AS module_id,
            COUNT(l.id) AS total_lessons,
            0::BIGINT AS completed_lessons,
            COUNT(l.id) AS unlocked_lessons,
            0::BIGINT AS overdue_lessons
        FROM public.lessons l
        JOIN public.stream_modules sm ON sm.id = l.stream_module_id
        WHERE sm.stream_id = v_stream_id
        GROUP BY l.stream_module_id
    ),
    -- Подсчёт заданий
    module_assignments AS (
        SELECT
            l.stream_module_id AS module_id,
            COUNT(DISTINCT a.id) AS total_assignments,
            0::BIGINT AS completed_assignments,
            0::BIGINT AS overdue_assignments
        FROM public.lessons l
        JOIN public.assignments a ON a.lesson_id = l.id
        JOIN public.stream_modules sm ON sm.id = l.stream_module_id
        WHERE sm.stream_id = v_stream_id
        GROUP BY l.stream_module_id
    )
    SELECT
        sm.id AS module_id,
        sm.name AS module_name,
        sm.order_num AS module_order_num,
        sm.color AS module_color,
        false AS is_unlocked, -- Для preview все модули заблокированы (гость)
        COALESCE(ms.total_lessons, 0) AS total_lessons,
        COALESCE(ms.completed_lessons, 0) AS completed_lessons,
        COALESCE(ms.unlocked_lessons, 0) AS unlocked_lessons,
        COALESCE(ms.overdue_lessons, 0) AS overdue_lessons,
        v_stream_id AS stream_id,
        s.name AS stream_name,
        COALESCE(mud.unlock_offset_days, (sm.order_num - 1) * 7) AS unlock_day, -- Используем реальный unlock_offset_days или рассчитываем по порядку (неделя на модуль)
        fl.first_lesson_id AS first_stage_id,
        COALESCE(ma.total_assignments, 0) AS total_assignments,
        COALESCE(ma.completed_assignments, 0) AS completed_assignments,
        COALESCE(ma.overdue_assignments, 0) AS overdue_assignments
    FROM public.stream_modules sm
    JOIN public.streams s ON s.id = sm.stream_id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    LEFT JOIN first_lessons fl ON fl.stream_module_id = sm.id
    LEFT JOIN module_assignments ma ON ma.module_id = sm.id
    LEFT JOIN module_unlock_days mud ON mud.stream_module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$;

COMMENT ON FUNCTION public.get_preview_stream_modules() IS
'Получить модули для preview режима (гости). Возвращает модули первого активного потока с реальными unlock_offset_days для отображения периодов.';

-- ============================================
-- 2. Информация
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Preview функция get_preview_stream_modules обновлена:';
  RAISE NOTICE '- Теперь возвращает реальные unlock_offset_days для отображения периодов модулей в календаре';
  RAISE NOTICE '- Если unlock_offset_days не настроен, рассчитывается по порядку модуля (неделя на модуль)';
END $$;
