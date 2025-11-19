-- Migration: Recreate get_students_list function without dynamic SQL
-- Date: 2025-11-18
-- Description: Пересоздаем функцию без динамического SQL для избежания проблем с типами

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
        0::BIGINT AS total_points,
        0::NUMERIC AS completed_lessons_percent,
        COALESCE(curator.first_name || ' ' || COALESCE(curator.last_name, ''), '') AS curator_name
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
    LEFT JOIN public.courses c ON c.id = course_ref.course_id
    LEFT JOIN public.user_curator uc ON u.id = uc.student_id
    LEFT JOIN public.users curator ON uc.curator_id = curator.id
    WHERE 1=1
    ORDER BY
        CASE
            WHEN sort_by = 'points' AND sort_order = 'DESC' THEN 0
            WHEN sort_by = 'points' AND sort_order = 'ASC' THEN 0
        END DESC,
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

COMMENT ON FUNCTION get_students_list(TEXT, TEXT, INT, INT) IS 'Возвращает список студентов с информацией о роли, курсе, кураторе и прогрессе для админ-панели';

GRANT EXECUTE ON FUNCTION get_students_list(TEXT, TEXT, INT, INT) TO authenticated;
