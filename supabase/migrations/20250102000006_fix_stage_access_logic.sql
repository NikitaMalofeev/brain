-- Исправляем логику доступа к этапам - делаем её более мягкой
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

  -- 3. Получаем этапы с правильной логикой доступа
  RETURN QUERY
  SELECT
    s.id AS stage_id,
    s.name AS stage_name,
    s.order_num AS stage_order_num,
    s.description AS stage_description,
    CASE 
      -- ПЕРВЫЙ ПРИОРИТЕТ: Проверяем галку is_unlocked в course_stages
      WHEN NOT s.is_unlocked THEN FALSE
      -- ВТОРОЙ ПРИОРИТЕТ: Если этап разблокирован, проверяем настройки тарифа
      ELSE (
        SELECT 
          CASE 
            -- Если для тарифа есть настройка requires_full_prereq = true
            WHEN tl.requires_full_prereq THEN 
              public.check_all_previous_lessons_completed(p_user_id, s.id)
            -- Если requires_full_prereq = false - этап доступен
            ELSE TRUE
          END
        FROM public.tariff_limits tl
        WHERE tl.tariff_id = user_tariff_id AND tl.stage_id = s.id
        -- Если настройки для тарифа нет - этап доступен
        LIMIT 1
      ) IS NOT DISTINCT FROM TRUE
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

COMMENT ON FUNCTION public.get_library_stages_optimized IS 'Оптимизированная функция для получения этапов курса с информацией о доступности за один запрос. Логика: 1) галка is_unlocked в course_stages, 2) настройка requires_full_prereq в tariff_limits.'; 