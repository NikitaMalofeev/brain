-- Migration: Add access_duration_days to get_user_stream_modules
-- Date: 2025-12-08
-- Description: Добавляем access_duration_days в RPC функцию для правильного отображения периодов модулей в календаре

DROP FUNCTION IF EXISTS get_user_stream_modules(UUID);

CREATE OR REPLACE FUNCTION get_user_stream_modules(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_name TEXT,
  module_order_num INT,
  module_color TEXT,
  module_cover_image TEXT,
  is_unlocked BOOLEAN,
  total_lessons INT,
  completed_lessons INT,
  unlocked_lessons INT,
  overdue_lessons INT,
  stream_id UUID,
  stream_name TEXT,
  unlock_day INT,
  first_stage_id BIGINT,  -- Исправлен тип: BIGINT вместо INT
  total_assignments INT,
  completed_assignments INT,
  overdue_assignments INT,
  access_duration_days INT  -- НОВОЕ ПОЛЕ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stream_id UUID;
  v_tariff_id UUID;
  v_stream_start_date DATE;
  v_stream_tariff_id UUID;
BEGIN
  -- Получаем stream_id пользователя
  SELECT use.stream_id INTO v_stream_id
  FROM user_stream_enrollments use
  WHERE use.user_id = p_user_id
  LIMIT 1;

  IF v_stream_id IS NULL THEN
    RETURN;
  END IF;

  -- Получаем tariff_id пользователя
  SELECT ut.tariff_id INTO v_tariff_id
  FROM user_tariffs ut
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;

  IF v_tariff_id IS NULL THEN
    RETURN;
  END IF;

  -- Получаем дату начала потока
  SELECT s.start_date INTO v_stream_start_date
  FROM streams s
  WHERE s.id = v_stream_id;

  -- Получаем stream_tariff_id
  SELECT st.id INTO v_stream_tariff_id
  FROM stream_tariffs st
  WHERE st.stream_id = v_stream_id AND st.tariff_id = v_tariff_id
  LIMIT 1;

  IF v_stream_tariff_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH module_data AS (
    SELECT
      sm.id as mod_id,
      sm.name as mod_name,
      sm.order_num as mod_order,
      sm.color as mod_color,
      sm.cover_image as mod_cover_image,
      COALESCE(tsm.unlock_offset_days, 0) as unlock_offset,
      tsm.access_duration_days as duration_days,  -- НОВОЕ: длительность доступа
      (SELECT cs.id FROM course_stages cs WHERE cs.stream_module_id = sm.id ORDER BY cs.order_num LIMIT 1) as first_stage,
      (CURRENT_DATE >= v_stream_start_date + COALESCE(tsm.unlock_offset_days, 0)) as mod_unlocked
    FROM stream_modules sm
    JOIN tariff_stream_modules tsm ON tsm.stream_module_id = sm.id
    WHERE sm.stream_id = v_stream_id
      AND tsm.stream_tariff_id = v_stream_tariff_id
  ),
  lesson_stats AS (
    SELECT
      l.stream_module_id,
      COUNT(*)::INT as total_count,
      COUNT(DISTINCT CASE
        WHEN EXISTS (
          SELECT 1 FROM submissions s
          WHERE s.lesson_id = l.id
            AND s.user_id = p_user_id
            AND s.status != 'rejected'
        ) THEN l.id
      END)::INT as completed_count,
      COUNT(CASE
        WHEN (v_stream_start_date + COALESCE(l.open_day_offset, 0)) <= CURRENT_DATE THEN 1
      END)::INT as unlocked_count,
      COUNT(CASE
        WHEN l.has_assignment = true
          AND l.deadline_day_offset IS NOT NULL
          AND (v_stream_start_date + l.deadline_day_offset) < CURRENT_DATE
          AND (v_stream_start_date + COALESCE(l.open_day_offset, 0)) <= CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.lesson_id = l.id
              AND s.user_id = p_user_id
              AND s.status != 'rejected'
          )
        THEN 1
      END)::INT as overdue_count
    FROM lessons l
    WHERE l.stream_module_id IS NOT NULL
    GROUP BY l.stream_module_id
  ),
  assignment_stats AS (
    SELECT
      l.stream_module_id,
      -- Считаем общее количество assignments (не уроков с заданиями!)
      COUNT(a.id)::INT as total_assignments_count,
      -- Считаем выполненные assignments (есть submission с статусом != rejected)
      COUNT(DISTINCT CASE
        WHEN EXISTS (
          SELECT 1 FROM submissions s
          WHERE s.assignment_id = a.id
            AND s.user_id = p_user_id
            AND s.status != 'rejected'
        )
        THEN a.id
      END)::INT as completed_assignments_count,
      -- Считаем просроченные assignments
      COUNT(DISTINCT CASE
        WHEN l.deadline_day_offset IS NOT NULL
          AND (v_stream_start_date + l.deadline_day_offset) < CURRENT_DATE
          AND (v_stream_start_date + COALESCE(l.open_day_offset, 0)) <= CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.assignment_id = a.id
              AND s.user_id = p_user_id
              AND s.status != 'rejected'
          )
        THEN a.id
      END)::INT as overdue_assignments_count
    FROM lessons l
    JOIN assignments a ON a.lesson_id = l.id
    WHERE l.stream_module_id IS NOT NULL
    GROUP BY l.stream_module_id
  )
  SELECT
    md.mod_id,
    md.mod_name,
    md.mod_order,
    md.mod_color,
    md.mod_cover_image,
    md.mod_unlocked,
    COALESCE(ls.total_count, 0),
    COALESCE(ls.completed_count, 0),
    COALESCE(ls.unlocked_count, 0),
    COALESCE(ls.overdue_count, 0),
    v_stream_id,
    (SELECT s.name FROM streams s WHERE s.id = v_stream_id),
    md.unlock_offset + 1,
    md.first_stage,
    COALESCE(ast.total_assignments_count, 0),
    COALESCE(ast.completed_assignments_count, 0),
    COALESCE(ast.overdue_assignments_count, 0),
    md.duration_days  -- НОВОЕ: возвращаем длительность
  FROM module_data md
  LEFT JOIN lesson_stats ls ON ls.stream_module_id = md.mod_id
  LEFT JOIN assignment_stats ast ON ast.stream_module_id = md.mod_id
  ORDER BY md.mod_order;
END;
$$;

COMMENT ON FUNCTION get_user_stream_modules(UUID) IS
'Возвращает модули потока пользователя с учётом его тарифа, обложками модулей и длительностью доступа.';
