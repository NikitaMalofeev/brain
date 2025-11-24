-- Миграция: Функция для получения модулей потока пользователя
-- Используется на главной странице вместо course_stages

-- Функция для получения модулей потока пользователя с прогрессом
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
    stream_id UUID,
    stream_name TEXT
) AS $$
DECLARE
    v_stream_id UUID;
    v_tariff_id UUID;
BEGIN
    -- Получаем поток пользователя
    SELECT use.stream_id INTO v_stream_id
    FROM public.user_stream_enrollments use
    WHERE use.user_id = p_user_id
    LIMIT 1;

    IF v_stream_id IS NULL THEN
        RETURN; -- Нет потока - нет модулей
    END IF;

    -- Получаем тариф пользователя
    SELECT tariff_id INTO v_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true;

    RETURN QUERY
    WITH module_lessons AS (
        -- Получаем уроки для каждого модуля через calendar_events
        SELECT
            ce.module_id,
            ce.lesson_id,
            l.open_at,
            CASE
                WHEN ce.lesson_id IS NOT NULL THEN TRUE
                ELSE FALSE
            END AS has_lesson
        FROM public.calendar_events ce
        LEFT JOIN public.lessons l ON l.id = ce.lesson_id
        WHERE ce.stream_id = v_stream_id
        AND ce.event_type = 'lesson_unlock'
        AND ce.module_id IS NOT NULL
    ),
    module_stats AS (
        SELECT
            ml.module_id,
            COUNT(DISTINCT ml.lesson_id) AS total_lessons,
            COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN ml.lesson_id END) AS completed_lessons,
            COUNT(DISTINCT CASE WHEN ml.open_at IS NULL OR ml.open_at <= now() THEN ml.lesson_id END) AS unlocked_lessons
        FROM module_lessons ml
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = ml.lesson_id AND lp.user_id = p_user_id
        GROUP BY ml.module_id
    ),
    user_access AS (
        -- Проверяем доступ пользователя к модулям
        SELECT uma.stream_module_id
        FROM public.user_module_access uma
        WHERE uma.user_id = p_user_id
        AND (uma.expires_at IS NULL OR uma.expires_at > now())
    )
    SELECT
        sm.id AS module_id,
        sm.name AS module_name,
        sm.order_num AS module_order_num,
        sm.color AS module_color,
        -- Модуль разблокирован если есть запись в user_module_access или это модуль без ограничений
        CASE
            WHEN EXISTS (SELECT 1 FROM user_access ua WHERE ua.stream_module_id = sm.id) THEN TRUE
            -- Если нет системы доступа к модулям - все разблокированы
            WHEN NOT EXISTS (SELECT 1 FROM public.user_module_access WHERE stream_module_id = sm.id) THEN TRUE
            ELSE FALSE
        END AS is_unlocked,
        COALESCE(ms.total_lessons, 0) AS total_lessons,
        COALESCE(ms.completed_lessons, 0) AS completed_lessons,
        COALESCE(ms.unlocked_lessons, 0) AS unlocked_lessons,
        v_stream_id AS stream_id,
        s.name AS stream_name
    FROM public.stream_modules sm
    JOIN public.streams s ON s.id = sm.stream_id
    LEFT JOIN module_stats ms ON ms.module_id = sm.id
    WHERE sm.stream_id = v_stream_id
    ORDER BY sm.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_user_stream_modules IS 'Возвращает модули потока пользователя с прогрессом по урокам';
