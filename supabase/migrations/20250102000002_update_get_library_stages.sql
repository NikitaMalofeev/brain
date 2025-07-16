-- Обновляем функцию get_library_stages, убирая логику с max_days_access
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
    unlock_condition_type_val TEXT,
    unlock_condition_value_val TEXT,
    cover_image_path TEXT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS stage_id,
        s.name AS stage_name,
        s.order_num AS stage_order_num,
        s.description AS stage_description,
        -- Используем функцию для определения доступа к этапу
        public.can_user_access_stage(p_user_id, s.id) AS is_unlocked,
        (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id) AS total_lessons,
        (SELECT COUNT(*) FROM public.lesson_progress lp JOIN public.lessons l ON lp.lesson_id = l.id WHERE l.stage_id = s.id AND lp.user_id = p_user_id AND lp.is_completed = true) AS completed_lessons,
        s.unlock_condition_type AS unlock_condition_type_val,
        s.unlock_condition_value AS unlock_condition_value_val,
        s.cover_image_path
    FROM
        public.course_stages s
    WHERE
        s.course_id = p_course_id
    ORDER BY
        s.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_library_stages IS 'Возвращает этапы курса для пользователя с учетом его тарифа и прогресса. Логика доступа к урокам теперь управляется на уровне отдельных уроков.'; 