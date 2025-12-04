-- Migration: Fix get_students_list to correctly calculate completed_lessons_percent
-- Date: 2025-12-04
-- Description: Исправляем функцию для правильного подсчета процента пройденных уроков

DROP FUNCTION IF EXISTS get_students_list(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION get_students_list(
    sort_by TEXT DEFAULT 'created_at',
    sort_order TEXT DEFAULT 'DESC',
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    telegram_id TEXT,
    role TEXT,
    web_login TEXT,
    course_title TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    web_last_login TIMESTAMPTZ,
    total_points BIGINT,
    completed_lessons_percent NUMERIC,
    curator_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_course AS (
        -- Получаем активный курс пользователя через тариф
        SELECT
            u.id AS uid,
            course_ref.course_id
        FROM public.users u
        LEFT JOIN public.user_tariffs ut ON u.id = ut.user_id AND ut.is_active = true
        LEFT JOIN public.tariffs t ON ut.tariff_id = t.id
        LEFT JOIN LATERAL (
            SELECT DISTINCT cs.course_id
            FROM public.course_stages cs
            INNER JOIN public.tariff_limits tl ON tl.stage_id = cs.id
            WHERE tl.tariff_id = t.id
            LIMIT 1
        ) AS course_ref ON true
    ),
    course_lessons AS (
        -- Считаем общее количество уроков в курсе для каждого пользователя
        SELECT
            uc.uid,
            COUNT(l.id) AS total_lessons
        FROM user_course uc
        LEFT JOIN public.course_stages cs ON cs.course_id = uc.course_id
        LEFT JOIN public.lessons l ON l.stage_id = cs.id
        GROUP BY uc.uid
    ),
    completed_lessons AS (
        -- Считаем завершённые уроки для каждого пользователя
        SELECT
            lp.user_id,
            COUNT(lp.lesson_id) AS completed_count
        FROM public.lesson_progress lp
        WHERE lp.is_completed = true
        GROUP BY lp.user_id
    )
    SELECT
        u.id AS user_id,
        COALESCE(u.first_name || ' ' || COALESCE(u.last_name, ''), '') AS full_name,
        u.telegram_id::TEXT,
        u.role::TEXT,
        u.web_login::TEXT,
        c.title::TEXT AS course_title,
        u.created_at,
        u.last_login,
        u.web_last_login,
        COALESCE(u.total_points, 0)::BIGINT AS total_points,
        CASE
            WHEN COALESCE(cl.total_lessons, 0) > 0
            THEN ROUND((COALESCE(cpl.completed_count, 0)::NUMERIC / cl.total_lessons::NUMERIC) * 100, 0)
            ELSE 0::NUMERIC
        END AS completed_lessons_percent,
        COALESCE(curator.first_name || ' ' || COALESCE(curator.last_name, ''), '') AS curator_name
    FROM public.users u
    LEFT JOIN user_course uc ON u.id = uc.uid
    LEFT JOIN public.courses c ON c.id = uc.course_id
    LEFT JOIN course_lessons cl ON u.id = cl.uid
    LEFT JOIN completed_lessons cpl ON u.id = cpl.user_id
    LEFT JOIN public.user_curator ucur ON u.id = ucur.student_id
    LEFT JOIN public.users curator ON ucur.curator_id = curator.id
    WHERE 1=1
    ORDER BY
        CASE
            WHEN sort_by = 'points' AND sort_order = 'DESC' THEN COALESCE(u.total_points, 0)
        END DESC,
        CASE
            WHEN sort_by = 'points' AND sort_order = 'ASC' THEN COALESCE(u.total_points, 0)
        END ASC,
        CASE
            WHEN sort_by = 'last_login' AND sort_order = 'DESC' THEN COALESCE(u.last_login, u.created_at)
        END DESC,
        CASE
            WHEN sort_by = 'last_login' AND sort_order = 'ASC' THEN COALESCE(u.last_login, u.created_at)
        END ASC,
        CASE
            WHEN sort_by = 'created_at' AND sort_order = 'DESC' THEN u.created_at
        END DESC,
        CASE
            WHEN sort_by = 'created_at' AND sort_order = 'ASC' THEN u.created_at
        END ASC,
        u.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

COMMENT ON FUNCTION get_students_list(TEXT, TEXT, INT, INT) IS 'Возвращает список студентов с информацией о роли, курсе, кураторе и правильным процентом пройденных уроков для админ-панели';

GRANT EXECUTE ON FUNCTION get_students_list(TEXT, TEXT, INT, INT) TO authenticated;
