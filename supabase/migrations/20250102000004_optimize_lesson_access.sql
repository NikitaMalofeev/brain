-- Оптимизированная функция для получения уроков с информацией о доступности за один запрос
CREATE OR REPLACE FUNCTION public.get_user_accessible_lessons_optimized(p_user_id UUID, p_stage_id BIGINT)
RETURNS TABLE(
  lesson_id BIGINT,
  lesson_name TEXT,
  order_num INTEGER,
  is_accessible BOOLEAN,
  open_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  has_assignment BOOLEAN,
  cover_image_path TEXT
) AS $$
DECLARE
  user_tariff_id UUID;
  user_access_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Проверяем общий доступ пользователя
  SELECT access_till INTO user_access_expires_at FROM public.users WHERE id = p_user_id;
  IF user_access_expires_at IS NOT NULL AND user_access_expires_at < now() THEN
    -- Если доступ истек, возвращаем все уроки как недоступные
    RETURN QUERY
    SELECT 
      l.id AS lesson_id,
      l.name AS lesson_name,
      l.order_num,
      FALSE AS is_accessible,
      l.open_at,
      l.deadline_at,
      l.has_assignment,
      l.cover_image_path
    FROM public.lessons l
    WHERE l.stage_id = p_stage_id
    ORDER BY l.order_num;
    RETURN;
  END IF;

  -- 2. Получаем активный тариф пользователя
  SELECT tariff_id INTO user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, возвращаем все уроки как недоступные
  IF user_tariff_id IS NULL THEN
    RETURN QUERY
    SELECT 
      l.id AS lesson_id,
      l.name AS lesson_name,
      l.order_num,
      FALSE AS is_accessible,
      l.open_at,
      l.deadline_at,
      l.has_assignment,
      l.cover_image_path
    FROM public.lessons l
    WHERE l.stage_id = p_stage_id
    ORDER BY l.order_num;
    RETURN;
  END IF;

  -- 3. Получаем все уроки с оптимизированной проверкой доступа
  RETURN QUERY
  SELECT 
    l.id AS lesson_id,
    l.name AS lesson_name,
    l.order_num,
    CASE 
      -- Если у урока нет ограничений по тарифам - доступен
      WHEN NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access WHERE lesson_id = l.id) THEN TRUE
      -- Если есть ограничения - проверяем доступ пользователя
      ELSE EXISTS (
        SELECT 1 FROM public.tariff_lesson_access 
        WHERE lesson_id = l.id AND tariff_id = user_tariff_id
      )
    END AS is_accessible,
    l.open_at,
    l.deadline_at,
    l.has_assignment,
    l.cover_image_path
  FROM public.lessons l
  WHERE l.stage_id = p_stage_id
  ORDER BY l.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_user_accessible_lessons_optimized IS 'Оптимизированная функция для получения уроков с информацией о доступности за один запрос.';

-- Оптимизированная функция для получения этапов курса
CREATE OR REPLACE FUNCTION public.get_library_stages_optimized(p_user_id UUID, p_course_id UUID)
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
DECLARE
  user_tariff_id UUID;
  user_access_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Проверяем общий доступ пользователя
  SELECT access_till INTO user_access_expires_at FROM public.users WHERE id = p_user_id;
  IF user_access_expires_at IS NOT NULL AND user_access_expires_at < now() THEN
    -- Если доступ истек, возвращаем все этапы как заблокированные
    RETURN QUERY
    SELECT
        s.id AS stage_id,
        s.name AS stage_name,
        s.order_num AS stage_order_num,
        s.description AS stage_description,
        FALSE AS is_unlocked,
        (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id) AS total_lessons,
        (SELECT COUNT(*) FROM public.lesson_progress lp JOIN public.lessons l ON lp.lesson_id = l.id WHERE l.stage_id = s.id AND lp.user_id = p_user_id AND lp.is_completed = true) AS completed_lessons,
        s.unlock_condition_type AS unlock_condition_type_val,
        s.unlock_condition_value AS unlock_condition_value_val,
        s.cover_image_path
    FROM public.course_stages s
    WHERE s.course_id = p_course_id
    ORDER BY s.order_num;
    RETURN;
  END IF;

  -- 2. Получаем активный тариф пользователя
  SELECT tariff_id INTO user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, возвращаем все этапы как заблокированные
  IF user_tariff_id IS NULL THEN
    RETURN QUERY
    SELECT
        s.id AS stage_id,
        s.name AS stage_name,
        s.order_num AS stage_order_num,
        s.description AS stage_description,
        FALSE AS is_unlocked,
        (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id) AS total_lessons,
        (SELECT COUNT(*) FROM public.lesson_progress lp JOIN public.lessons l ON lp.lesson_id = l.id WHERE l.stage_id = s.id AND lp.user_id = p_user_id AND lp.is_completed = true) AS completed_lessons,
        s.unlock_condition_type AS unlock_condition_type_val,
        s.unlock_condition_value AS unlock_condition_value_val,
        s.cover_image_path
    FROM public.course_stages s
    WHERE s.course_id = p_course_id
    ORDER BY s.order_num;
    RETURN;
  END IF;

  -- 3. Получаем этапы с оптимизированной проверкой доступа
  RETURN QUERY
  SELECT
    s.id AS stage_id,
    s.name AS stage_name,
    s.order_num AS stage_order_num,
    s.description AS stage_description,
    CASE 
      -- Если для этапа нет правил в tariff_limits - заблокирован
      WHEN NOT EXISTS (
        SELECT 1 FROM public.tariff_limits 
        WHERE tariff_id = user_tariff_id AND stage_id = s.id
      ) THEN FALSE
      -- Если есть правила - проверяем условный доступ
      ELSE (
        SELECT 
          CASE 
            WHEN tl.requires_full_prereq THEN 
              public.check_all_previous_lessons_completed(p_user_id, s.id)
            ELSE TRUE
          END
        FROM public.tariff_limits tl
        WHERE tl.tariff_id = user_tariff_id AND tl.stage_id = s.id
      )
    END AS is_unlocked,
    (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id) AS total_lessons,
    (SELECT COUNT(*) FROM public.lesson_progress lp JOIN public.lessons l ON lp.lesson_id = l.id WHERE l.stage_id = s.id AND lp.user_id = p_user_id AND lp.is_completed = true) AS completed_lessons,
    s.unlock_condition_type AS unlock_condition_type_val,
    s.unlock_condition_value AS unlock_condition_value_val,
    s.cover_image_path
  FROM public.course_stages s
  WHERE s.course_id = p_course_id
  ORDER BY s.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_library_stages_optimized IS 'Оптимизированная функция для получения этапов курса с информацией о доступности за один запрос.'; 