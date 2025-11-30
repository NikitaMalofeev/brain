-- ============================================================================
-- Миграция: Обновить RPC функции для работы с stream_module_id напрямую
-- ============================================================================

-- ============================================================================
-- 1. Новая версия get_user_accessible_lessons_optimized
--    Принимает p_stream_module_id вместо p_stage_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_module_lessons(
    p_user_id UUID,
    p_stream_module_id UUID
)
RETURNS TABLE (
    out_lesson_id BIGINT,
    out_lesson_name TEXT,
    out_order_num INTEGER,
    out_is_accessible BOOLEAN,
    out_open_at TIMESTAMPTZ,
    out_deadline_at TIMESTAMPTZ,
    out_has_assignment BOOLEAN,
    out_cover_image_path TEXT,
    out_open_day_offset INTEGER,
    out_deadline_day_offset INTEGER,
    out_module_unlock_offset_days INTEGER,
    out_stream_start_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_tariff_id UUID;
    v_user_access_expires_at TIMESTAMPTZ;
    v_stream_start_date DATE;
    v_module_unlock_offset INT;
BEGIN
    -- 1. Проверяем общий доступ пользователя
    SELECT access_till INTO v_user_access_expires_at FROM public.users WHERE id = p_user_id;

    -- 2. Получаем start_date потока пользователя
    SELECT s.start_date INTO v_stream_start_date
    FROM public.user_stream_enrollments use_en
    JOIN public.streams s ON s.id = use_en.stream_id
    WHERE use_en.user_id = p_user_id
    LIMIT 1;

    -- 3. Получаем unlock_offset_days модуля для тарифа пользователя
    SELECT tsm.unlock_offset_days INTO v_module_unlock_offset
    FROM public.user_tariffs ut
    JOIN public.user_stream_enrollments use_en ON use_en.user_id = ut.user_id
    JOIN public.stream_tariffs st ON st.stream_id = use_en.stream_id AND st.tariff_id = ut.tariff_id
    JOIN public.tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id AND tsm.stream_module_id = p_stream_module_id
    WHERE ut.user_id = p_user_id AND ut.is_active = true
    LIMIT 1;

    -- Если не нашли - используем 0
    v_module_unlock_offset := COALESCE(v_module_unlock_offset, 0);

    -- Если доступ истёк - возвращаем все уроки как недоступные
    IF v_user_access_expires_at IS NOT NULL AND v_user_access_expires_at < now() THEN
        RETURN QUERY
        SELECT
            l.id,
            l.name,
            l.order_num,
            FALSE,
            l.open_at,
            l.deadline_at,
            l.has_assignment,
            l.cover_image_path,
            COALESCE(l.open_day_offset, l.order_num - 1),
            COALESCE(l.deadline_day_offset, l.order_num + 1),
            v_module_unlock_offset,
            v_stream_start_date
        FROM public.lessons l
        WHERE l.stream_module_id = p_stream_module_id
        ORDER BY l.order_num;
        RETURN;
    END IF;

    -- 4. Получаем активный тариф пользователя
    SELECT tariff_id INTO v_user_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true;

    -- Если нет тарифа - возвращаем уроки как недоступные
    IF v_user_tariff_id IS NULL THEN
        RETURN QUERY
        SELECT
            l.id,
            l.name,
            l.order_num,
            FALSE,
            l.open_at,
            l.deadline_at,
            l.has_assignment,
            l.cover_image_path,
            COALESCE(l.open_day_offset, l.order_num - 1),
            COALESCE(l.deadline_day_offset, l.order_num + 1),
            v_module_unlock_offset,
            v_stream_start_date
        FROM public.lessons l
        WHERE l.stream_module_id = p_stream_module_id
        ORDER BY l.order_num;
        RETURN;
    END IF;

    -- 5. Получаем все уроки модуля с проверкой доступа по тарифу
    RETURN QUERY
    SELECT
        l.id,
        l.name,
        l.order_num,
        CASE
            -- Если нет записей в tariff_lesson_access - урок доступен всем
            WHEN NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id) THEN TRUE
            -- Иначе проверяем доступ по тарифу
            ELSE EXISTS (
                SELECT 1 FROM public.tariff_lesson_access tla
                WHERE tla.lesson_id = l.id AND tla.tariff_id = v_user_tariff_id
            )
        END,
        l.open_at,
        l.deadline_at,
        l.has_assignment,
        l.cover_image_path,
        COALESCE(l.open_day_offset, l.order_num - 1),
        COALESCE(l.deadline_day_offset, l.order_num + 1),
        v_module_unlock_offset,
        v_stream_start_date
    FROM public.lessons l
    WHERE l.stream_module_id = p_stream_module_id
    ORDER BY l.order_num;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.get_module_lessons(UUID, UUID) IS
'Получить уроки модуля для пользователя. Заменяет get_user_accessible_lessons_optimized, работает напрямую с stream_module_id без course_stages.';


-- ============================================================================
-- 2. Обновляем get_user_stream_modules - убираем зависимость от course_stages
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_stream_modules(p_user_id UUID)
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
    -- Первый урок каждого модуля (для навигации) - ТЕПЕРЬ НАПРЯМУЮ ИЗ LESSONS
    first_lessons AS (
        SELECT DISTINCT ON (l.stream_module_id)
            l.stream_module_id,
            l.id AS first_lesson_id
        FROM public.lessons l
        WHERE l.stream_module_id IN (SELECT stream_module_id FROM tariff_modules)
        ORDER BY l.stream_module_id, l.order_num
    ),
    -- Уроки модулей с offset'ами - ТЕПЕРЬ НАПРЯМУЮ ИЗ LESSONS
    module_lessons AS (
        SELECT
            l.stream_module_id AS module_id,
            l.id AS lesson_id,
            l.order_num,
            COALESCE(l.open_day_offset, l.order_num - 1) AS lesson_open_offset,
            COALESCE(l.deadline_day_offset, l.order_num + 1) AS lesson_deadline_offset,
            COALESCE(tm.unlock_offset_days, 0) AS module_unlock_offset
        FROM public.lessons l
        JOIN tariff_modules tm ON tm.stream_module_id = l.stream_module_id
        WHERE l.stream_module_id IN (SELECT stream_module_id FROM tariff_modules)
    ),
    -- Статистика по урокам
    module_stats AS (
        SELECT
            ml.module_id,
            COUNT(DISTINCT ml.lesson_id) AS total_lessons,
            COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN ml.lesson_id END) AS completed_lessons,
            COUNT(DISTINCT CASE
                WHEN v_current_day >= (ml.module_unlock_offset + ml.lesson_open_offset)
                THEN ml.lesson_id
            END) AS unlocked_lessons,
            COUNT(DISTINCT CASE
                WHEN v_current_day >= (ml.module_unlock_offset + ml.lesson_open_offset)
                AND v_current_day > (ml.module_unlock_offset + ml.lesson_open_offset + 2)
                AND (lp.is_completed IS NULL OR lp.is_completed = false)
                THEN ml.lesson_id
            END) AS overdue_lessons
        FROM module_lessons ml
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = ml.lesson_id AND lp.user_id = p_user_id
        GROUP BY ml.module_id
    ),
    -- Статистика по заданиям модуля - ТЕПЕРЬ НАПРЯМУЮ ИЗ LESSONS
    module_assignments AS (
        SELECT
            l.stream_module_id AS module_id,
            COUNT(DISTINCT a.id) AS total_assignments,
            COUNT(DISTINCT CASE WHEN sub.status = 'approved' THEN a.id END) AS completed_assignments,
            COUNT(DISTINCT CASE
                WHEN v_current_day > (COALESCE(tm.unlock_offset_days, 0) + COALESCE(l.deadline_day_offset, l.order_num + 1))
                AND (sub.status IS NULL OR sub.status != 'approved')
                THEN a.id
            END) AS overdue_assignments
        FROM public.lessons l
        JOIN public.assignments a ON a.lesson_id = l.id
        JOIN tariff_modules tm ON tm.stream_module_id = l.stream_module_id
        LEFT JOIN public.submissions sub ON sub.assignment_id = a.id AND sub.user_id = p_user_id
        WHERE l.stream_module_id IN (SELECT stream_module_id FROM tariff_modules)
        GROUP BY l.stream_module_id
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
        fl.first_lesson_id AS first_stage_id, -- Возвращаем ID первого урока (для обратной совместимости назван first_stage_id)
        COALESCE(ma.total_assignments, 0) AS total_assignments,
        COALESCE(ma.completed_assignments, 0) AS completed_assignments,
        COALESCE(ma.overdue_assignments, 0) AS overdue_assignments
    FROM public.stream_modules sm
    JOIN public.streams s ON s.id = sm.stream_id
    JOIN tariff_modules tm ON tm.stream_module_id = sm.id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    LEFT JOIN first_lessons fl ON fl.stream_module_id = sm.id
    LEFT JOIN module_assignments ma ON ma.module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$;

COMMENT ON FUNCTION public.get_user_stream_modules(UUID) IS
'Получить модули потока для пользователя. Обновлено: работает напрямую с lessons.stream_module_id без course_stages.';


-- ============================================================================
-- 3. Обновляем get_library_stages_optimized для работы с модулями
--    (Создаём новую функцию get_module_lessons_stats)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_module_lessons_stats(
    p_user_id UUID,
    p_stream_module_id UUID
)
RETURNS TABLE (
    lesson_id BIGINT,
    lesson_name TEXT,
    lesson_order_num INTEGER,
    lesson_description TEXT,
    is_unlocked BOOLEAN,
    is_completed BOOLEAN,
    has_assignment BOOLEAN,
    cover_image_path TEXT,
    open_day_offset INTEGER,
    deadline_day_offset INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_tariff_id UUID;
    user_access_expires_at TIMESTAMPTZ;
    v_stream_start_date DATE;
    v_module_unlock_offset INT;
    v_current_day INT;
BEGIN
    -- Проверяем общий доступ пользователя
    SELECT access_till INTO user_access_expires_at FROM public.users WHERE id = p_user_id;

    -- Получаем start_date потока
    SELECT s.start_date INTO v_stream_start_date
    FROM public.user_stream_enrollments use_en
    JOIN public.streams s ON s.id = use_en.stream_id
    WHERE use_en.user_id = p_user_id
    LIMIT 1;

    v_current_day := GREATEST(0, (CURRENT_DATE - COALESCE(v_stream_start_date, CURRENT_DATE)));

    -- Получаем unlock_offset модуля
    SELECT tsm.unlock_offset_days INTO v_module_unlock_offset
    FROM public.user_tariffs ut
    JOIN public.user_stream_enrollments use_en ON use_en.user_id = ut.user_id
    JOIN public.stream_tariffs st ON st.stream_id = use_en.stream_id AND st.tariff_id = ut.tariff_id
    JOIN public.tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id AND tsm.stream_module_id = p_stream_module_id
    WHERE ut.user_id = p_user_id AND ut.is_active = true
    LIMIT 1;

    v_module_unlock_offset := COALESCE(v_module_unlock_offset, 0);

    IF user_access_expires_at IS NOT NULL AND user_access_expires_at < now() THEN
        -- Доступ истек - все уроки заблокированы
        RETURN QUERY
        SELECT
            l.id AS lesson_id,
            l.name AS lesson_name,
            l.order_num AS lesson_order_num,
            l.description AS lesson_description,
            FALSE AS is_unlocked,
            FALSE AS is_completed,
            COALESCE(l.has_assignment, FALSE) AS has_assignment,
            l.cover_image_path,
            COALESCE(l.open_day_offset, l.order_num - 1) AS open_day_offset,
            l.deadline_day_offset
        FROM public.lessons l
        WHERE l.stream_module_id = p_stream_module_id
        ORDER BY l.order_num;
        RETURN;
    END IF;

    -- Получаем активный тариф
    SELECT tariff_id INTO user_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true;

    RETURN QUERY
    SELECT
        l.id AS lesson_id,
        l.name AS lesson_name,
        l.order_num AS lesson_order_num,
        l.description AS lesson_description,
        -- Урок разблокирован если прошло достаточно дней
        v_current_day >= (v_module_unlock_offset + COALESCE(l.open_day_offset, l.order_num - 1)) AS is_unlocked,
        COALESCE(lp.is_completed, FALSE) AS is_completed,
        COALESCE(l.has_assignment, FALSE) AS has_assignment,
        l.cover_image_path,
        COALESCE(l.open_day_offset, l.order_num - 1) AS open_day_offset,
        l.deadline_day_offset
    FROM public.lessons l
    LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = p_user_id
    WHERE l.stream_module_id = p_stream_module_id
    ORDER BY l.order_num;
END;
$$;

COMMENT ON FUNCTION public.get_module_lessons_stats(UUID, UUID) IS
'Получить статистику уроков модуля для пользователя. Работает напрямую с lessons.stream_module_id.';
