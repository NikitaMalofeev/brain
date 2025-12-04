-- Migration: Create preview functions for guests
-- Date: 2025-12-04
-- Description: Preview функции для отображения данных гостям без тарифа/потока

-- ============================================
-- 1. Функция получения модулей для preview (гостевой режим)
--    Возвращает модули первого активного потока без проверки доступов
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
    -- Получаем все модули потока
    all_modules AS (
        SELECT
            sm.id AS stream_module_id,
            0 AS unlock_offset_days, -- Для preview все модули начинаются с 0
            sm.order_num AS module_order
        FROM public.stream_modules sm
        WHERE sm.stream_id = v_stream_id
    ),
    -- Первый урок каждого модуля
    first_lessons AS (
        SELECT DISTINCT ON (l.stream_module_id)
            l.stream_module_id,
            l.id AS first_lesson_id
        FROM public.lessons l
        WHERE l.stream_module_id IN (SELECT stream_module_id FROM all_modules)
        ORDER BY l.stream_module_id, l.order_num
    ),
    -- Подсчёт уроков
    module_stats AS (
        SELECT
            l.stream_module_id AS module_id,
            COUNT(l.id) AS total_lessons,
            0::BIGINT AS completed_lessons,
            COUNT(l.id) AS unlocked_lessons, -- Для preview все уроки "разблокированы" визуально
            0::BIGINT AS overdue_lessons
        FROM public.lessons l
        WHERE l.stream_module_id IN (SELECT stream_module_id FROM all_modules)
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
        WHERE l.stream_module_id IN (SELECT stream_module_id FROM all_modules)
        GROUP BY l.stream_module_id
    )
    SELECT
        sm.id AS module_id,
        sm.name AS module_name,
        sm.order_num AS module_order_num,
        sm.color AS module_color,
        true AS is_unlocked, -- Для preview все модули разблокированы визуально
        COALESCE(ms.total_lessons, 0) AS total_lessons,
        COALESCE(ms.completed_lessons, 0) AS completed_lessons,
        COALESCE(ms.unlocked_lessons, 0) AS unlocked_lessons,
        COALESCE(ms.overdue_lessons, 0) AS overdue_lessons,
        v_stream_id AS stream_id,
        s.name AS stream_name,
        0 AS unlock_day, -- Для preview unlock_day = 0
        fl.first_lesson_id AS first_stage_id,
        COALESCE(ma.total_assignments, 0) AS total_assignments,
        COALESCE(ma.completed_assignments, 0) AS completed_assignments,
        COALESCE(ma.overdue_assignments, 0) AS overdue_assignments
    FROM public.stream_modules sm
    JOIN public.streams s ON s.id = sm.stream_id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    LEFT JOIN first_lessons fl ON fl.stream_module_id = sm.id
    LEFT JOIN module_assignments ma ON ma.module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$;

COMMENT ON FUNCTION public.get_preview_stream_modules() IS
'Получить модули для preview режима (гости). Возвращает модули первого активного потока без проверки доступов.';

-- ============================================
-- 2. Функция получения событий календаря для preview
--    Возвращает события первого активного потока без проверки доступов
-- ============================================
CREATE OR REPLACE FUNCTION public.get_preview_calendar_events(p_month DATE)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    description TEXT,
    event_date DATE,
    event_time TIME,
    event_type TEXT,
    external_url TEXT,
    lesson_id INT,
    material_id UUID,
    technique_id UUID,
    cover_image TEXT,
    module_id UUID,
    module_name TEXT,
    module_color TEXT,
    can_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stream_id UUID;
BEGIN
    -- Получаем первый активный поток
    SELECT s.id INTO v_stream_id
    FROM public.streams s
    WHERE s.is_active = true
    ORDER BY s.start_date DESC
    LIMIT 1;

    IF v_stream_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        ce.id AS event_id,
        ce.title,
        ce.description,
        ce.event_date,
        ce.event_time,
        ce.event_type,
        ce.external_url,
        ce.lesson_id,
        ce.material_id,
        ce.technique_id,
        ce.cover_image,
        ce.module_id,
        sm.name AS module_name,
        sm.color AS module_color,
        true AS can_access -- Для preview все события доступны для просмотра
    FROM public.calendar_events ce
    LEFT JOIN public.stream_modules sm ON sm.id = ce.module_id
    WHERE ce.stream_id = v_stream_id
      AND ce.event_date >= DATE_TRUNC('month', p_month)::DATE
      AND ce.event_date < (DATE_TRUNC('month', p_month) + INTERVAL '1 month')::DATE
    ORDER BY ce.event_date, ce.event_time NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_preview_calendar_events(DATE) IS
'Получить события календаря для preview режима (гости). Возвращает события первого активного потока без проверки доступов.';

-- ============================================
-- 3. Функция получения информации о потоке для preview
-- ============================================
CREATE OR REPLACE FUNCTION public.get_preview_stream_info()
RETURNS TABLE (
    stream_id UUID,
    stream_name TEXT,
    start_date DATE,
    current_week INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stream_id UUID;
    v_stream_name TEXT;
    v_start_date DATE;
    v_current_week INT;
BEGIN
    -- Получаем первый активный поток
    SELECT s.id, s.name, s.start_date INTO v_stream_id, v_stream_name, v_start_date
    FROM public.streams s
    WHERE s.is_active = true
    ORDER BY s.start_date DESC
    LIMIT 1;

    IF v_stream_id IS NULL THEN
        RETURN;
    END IF;

    -- Вычисляем текущую неделю
    v_current_week := GREATEST(1, CEIL((CURRENT_DATE - v_start_date + 1)::NUMERIC / 7));

    RETURN QUERY SELECT v_stream_id, v_stream_name, v_start_date, v_current_week;
END;
$$;

COMMENT ON FUNCTION public.get_preview_stream_info() IS
'Получить информацию о потоке для preview режима (гости). Возвращает первый активный поток.';

-- ============================================
-- 4. Права на выполнение функций
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_preview_stream_modules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_preview_stream_modules() TO anon;
GRANT EXECUTE ON FUNCTION public.get_preview_calendar_events(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_preview_calendar_events(DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_preview_stream_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_preview_stream_info() TO anon;

-- ============================================
-- 5. Информация
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Preview функции для гостей успешно созданы:';
  RAISE NOTICE '- get_preview_stream_modules() - модули потока для preview';
  RAISE NOTICE '- get_preview_calendar_events(DATE) - события календаря для preview';
  RAISE NOTICE '- get_preview_stream_info() - информация о потоке для preview';
END $$;
