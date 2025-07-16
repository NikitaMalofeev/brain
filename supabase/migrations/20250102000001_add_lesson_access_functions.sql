-- Функция для проверки доступа пользователя к конкретному уроку
CREATE OR REPLACE FUNCTION public.can_user_access_lesson(p_user_id UUID, p_lesson_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tariff_id UUID;
  lesson_has_tariff_restrictions BOOLEAN;
  user_has_access BOOLEAN;
BEGIN
  -- 1. Проверяем, не истек ли общий доступ пользователя
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_user_id 
    AND access_till IS NOT NULL 
    AND access_till < now()
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. Получаем активный тариф пользователя
  SELECT tariff_id INTO user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, доступа нет
  IF user_tariff_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Проверяем, есть ли ограничения по тарифам для этого урока
  SELECT EXISTS (
    SELECT 1 FROM public.tariff_lesson_access 
    WHERE lesson_id = p_lesson_id
  ) INTO lesson_has_tariff_restrictions;

  -- 4. Если ограничений нет - урок доступен всем тарифам
  IF NOT lesson_has_tariff_restrictions THEN
    RETURN TRUE;
  END IF;

  -- 5. Если есть ограничения - проверяем доступ пользователя
  SELECT EXISTS (
    SELECT 1 FROM public.tariff_lesson_access 
    WHERE lesson_id = p_lesson_id AND tariff_id = user_tariff_id
  ) INTO user_has_access;

  RETURN user_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_access_lesson IS 'Проверяет, имеет ли пользователь доступ к конкретному уроку с учетом его тарифа.';

-- Функция для получения доступных тарифов для урока
CREATE OR REPLACE FUNCTION public.get_lesson_accessible_tariffs(p_lesson_id BIGINT)
RETURNS TABLE(tariff_id UUID, tariff_name TEXT, tariff_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tariff_id,
    t.name AS tariff_name,
    t.code AS tariff_code
  FROM public.tariffs t
  INNER JOIN public.tariff_lesson_access tla ON t.id = tla.tariff_id
  WHERE tla.lesson_id = p_lesson_id
  ORDER BY t.code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_lesson_accessible_tariffs IS 'Возвращает список тарифов, имеющих доступ к конкретному уроку.';

-- Функция для получения уроков, доступных пользователю
CREATE OR REPLACE FUNCTION public.get_user_accessible_lessons(p_user_id UUID, p_stage_id BIGINT)
RETURNS TABLE(
  lesson_id BIGINT,
  lesson_name TEXT,
  order_num INTEGER,
  is_accessible BOOLEAN,
  open_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS lesson_id,
    l.name AS lesson_name,
    l.order_num,
    public.can_user_access_lesson(p_user_id, l.id) AS is_accessible,
    l.open_at,
    l.deadline_at
  FROM public.lessons l
  WHERE l.stage_id = p_stage_id
  ORDER BY l.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_user_accessible_lessons IS 'Возвращает уроки этапа с информацией о доступности для пользователя.'; 