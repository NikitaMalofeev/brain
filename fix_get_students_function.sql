-- Удаляем старую версию функции
DROP FUNCTION IF EXISTS get_students_list(TEXT, TEXT, INT, INT);

-- Создаем новую версию
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
DECLARE
    sql_query TEXT;
BEGIN
    sql_query := '
        SELECT
            u.id AS user_id,
            (u.first_name || '' '' || COALESCE(u.last_name, '''')) AS full_name,
            u.telegram_id,
            u.role::TEXT,
            u.web_login,
            c.title AS course_title,
            u.created_at,
            u.last_login,
            u.web_last_login,
            0::BIGINT AS total_points,
            0::NUMERIC AS completed_lessons_percent,
            (curator.first_name || '' '' || COALESCE(curator.last_name, '''')) AS curator_name
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
    ';

    CASE sort_by
        WHEN 'points' THEN
            sql_query := sql_query || ' ORDER BY total_points ' || sort_order;
        WHEN 'last_login' THEN
            sql_query := sql_query || ' ORDER BY COALESCE(u.last_login, u.created_at) ' || sort_order;
        WHEN 'created_at' THEN
            sql_query := sql_query || ' ORDER BY u.created_at ' || sort_order;
        ELSE
            sql_query := sql_query || ' ORDER BY u.created_at DESC';
    END CASE;

    sql_query := sql_query || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;

    RETURN QUERY EXECUTE sql_query;
END;
$$;

COMMENT ON FUNCTION get_students_list(TEXT, TEXT, INT, INT) IS 'Возвращает список студентов с информацией о роли, курсе, кураторе и прогрессе для админ-панели';

GRANT EXECUTE ON FUNCTION get_students_list(TEXT, TEXT, INT, INT) TO authenticated;
