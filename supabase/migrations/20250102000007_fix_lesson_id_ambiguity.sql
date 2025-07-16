-- Исправляем конфликт имен столбцов в функции get_user_accessible_lessons_optimized
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
      WHEN NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id) THEN TRUE
      -- Если есть ограничения - проверяем доступ пользователя
      ELSE EXISTS (
        SELECT 1 FROM public.tariff_lesson_access tla
        WHERE tla.lesson_id = l.id AND tla.tariff_id = user_tariff_id
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

COMMENT ON FUNCTION public.get_user_accessible_lessons_optimized IS 'Оптимизированная функция для получения уроков с информацией о доступности за один запрос. Исправлен конфликт имен столбцов.'; 