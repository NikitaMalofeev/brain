-- Миграция: Добавление подсчета неоткрытых уроков в функцию get_library_stages
-- Дата: 2025-01-11
-- Описание: Добавляет поле unlocked_lessons для подсчета количества неоткрытых уроков в каждой ступени

DROP FUNCTION IF EXISTS public.get_library_stages(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_library_stages(p_user_id UUID, p_course_id UUID)
RETURNS TABLE(
    stage_id BIGINT,
    stage_name TEXT,
    stage_order_num INT,
    stage_description TEXT,
    is_unlocked BOOLEAN,
    total_lessons BIGINT,
    completed_lessons BIGINT,
    unlocked_lessons BIGINT,  -- НОВОЕ ПОЛЕ: количество неоткрытых уроков
    unlock_condition_type_val TEXT,
    unlock_condition_value_val TEXT,
    cover_image_path TEXT,
    lessons_available_by_tariff INT
)
AS $$
BEGIN
    RETURN QUERY
    WITH UserTariff AS (
        -- Получаем активный тариф пользователя
        SELECT ut.tariff_id
        FROM public.user_tariffs ut
        WHERE ut.user_id = p_user_id AND ut.is_active = true
        LIMIT 1
    ),
    StageLimits AS (
        -- Получаем лимиты по дням для каждого этапа в зависимости от тарифа
        SELECT
            tl.stage_id,
            tl.max_days_access
        FROM public.tariff_limits tl
        JOIN UserTariff ut ON tl.tariff_id = ut.tariff_id
    )
    SELECT
        s.id AS stage_id,
        s.name AS stage_name,
        s.order_num AS stage_order_num,
        s.description AS stage_description,
        -- Используем новую функцию для определения доступа к этапу
        public.can_user_access_stage(p_user_id, s.id) AS is_unlocked,
        (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id) AS total_lessons,
        (SELECT COUNT(*) FROM public.lesson_progress lp JOIN public.lessons l ON lp.lesson_id = l.id WHERE l.stage_id = s.id AND lp.user_id = p_user_id AND lp.is_completed = true) AS completed_lessons,
        -- НОВОЕ ПОЛЕ: Подсчет неоткрытых уроков (где open_at > NOW() или open_at IS NULL)
        (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id AND (l.open_at IS NULL OR l.open_at > NOW())) AS unlocked_lessons,
        s.unlock_condition_type AS unlock_condition_type_val,
        s.unlock_condition_value AS unlock_condition_value_val,
        s.cover_image_path,
        sl.max_days_access AS lessons_available_by_tariff
    FROM
        public.course_stages s
    LEFT JOIN StageLimits sl ON s.id = sl.stage_id
    WHERE
        s.course_id = p_course_id
    ORDER BY
        s.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_library_stages IS 'Возвращает этапы курса для пользователя с учетом его тарифа, прогресса и лимитов на доступные уроки. Включает подсчет неоткрытых уроков.'; 