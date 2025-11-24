-- Миграция: Добавление относительных дат для уроков
-- Даты уроков теперь рассчитываются относительно start_date потока

-- Добавляем поля для относительных дат (смещение в днях от start_date потока)
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS open_day_offset INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deadline_day_offset INTEGER DEFAULT 0;

-- Комментарии к полям
COMMENT ON COLUMN lessons.open_day_offset IS 'Смещение в днях от start_date потока для открытия урока';
COMMENT ON COLUMN lessons.deadline_day_offset IS 'Смещение в днях от start_date потока для дедлайна';

-- Автоматически устанавливаем смещения на основе order_num
-- День 1 (order_num=1) → открывается в день 0 (день старта), дедлайн день 2
-- День 2 (order_num=2) → открывается в день 1, дедлайн день 3
-- День N → открывается в день N-1, дедлайн день N+1

UPDATE lessons
SET
    open_day_offset = order_num - 1,
    deadline_day_offset = order_num + 1
WHERE order_num IS NOT NULL;

-- Индекс для быстрого поиска по смещениям
CREATE INDEX IF NOT EXISTS idx_lessons_day_offsets ON lessons (open_day_offset, deadline_day_offset);

-- Удаляем старую функцию чтобы изменить возвращаемый тип
DROP FUNCTION IF EXISTS get_user_accessible_lessons_optimized(uuid, bigint);

-- Создаём обновлённую RPC функцию с новыми полями смещений
CREATE OR REPLACE FUNCTION public.get_user_accessible_lessons_optimized(p_user_id UUID, p_stage_id BIGINT)
RETURNS TABLE(
  lesson_id BIGINT,
  lesson_name TEXT,
  order_num INTEGER,
  is_accessible BOOLEAN,
  open_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  has_assignment BOOLEAN,
  cover_image_path TEXT,
  open_day_offset INTEGER,
  deadline_day_offset INTEGER
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
      l.cover_image_path,
      COALESCE(l.open_day_offset, l.order_num - 1) AS open_day_offset,
      COALESCE(l.deadline_day_offset, l.order_num + 1) AS deadline_day_offset
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
      l.cover_image_path,
      COALESCE(l.open_day_offset, l.order_num - 1) AS open_day_offset,
      COALESCE(l.deadline_day_offset, l.order_num + 1) AS deadline_day_offset
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
    l.cover_image_path,
    COALESCE(l.open_day_offset, l.order_num - 1) AS open_day_offset,
    COALESCE(l.deadline_day_offset, l.order_num + 1) AS deadline_day_offset
  FROM public.lessons l
  WHERE l.stage_id = p_stage_id
  ORDER BY l.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_user_accessible_lessons_optimized IS 'Оптимизированная функция для получения уроков с информацией о доступности и смещениями дат.';
