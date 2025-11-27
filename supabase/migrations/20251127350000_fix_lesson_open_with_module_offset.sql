-- Migration: Fix lesson open_at calculation with module offset
-- Date: 2025-11-27
-- Description: Уроки должны открываться относительно даты открытия модуля, а не потока

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS get_user_accessible_lessons_optimized(uuid, bigint);

-- Создаём обновлённую RPC функцию с датой открытия модуля
CREATE OR REPLACE FUNCTION public.get_user_accessible_lessons_optimized(p_user_id UUID, p_stage_id BIGINT)
RETURNS TABLE(
  out_lesson_id BIGINT,
  out_lesson_name TEXT,
  out_order_num INTEGER,
  out_is_accessible BOOLEAN,
  out_open_at TIMESTAMPTZ,
  out_deadline_at TIMESTAMPTZ,
  out_has_assignment BOOLEAN,
  out_cover_image_path TEXT,
  out_open_day_offset INTEGER,
  out_deadline_day_offset INTEGER,
  out_module_unlock_offset_days INTEGER,
  out_stream_start_date DATE
) AS $$
DECLARE
  v_user_tariff_id UUID;
  v_user_access_expires_at TIMESTAMPTZ;
  v_stream_start_date DATE;
  v_stream_module_id UUID;
  v_module_unlock_offset INT;
BEGIN
  -- 1. Проверяем общий доступ пользователя
  SELECT access_till INTO v_user_access_expires_at FROM public.users WHERE id = p_user_id;

  -- 2. Получаем start_date потока пользователя
  SELECT s.start_date INTO v_stream_start_date
  FROM public.user_stream_enrollments use_en
  JOIN public.streams s ON s.id = use_en.stream_id
  WHERE use_en.user_id = p_user_id
  LIMIT 1;

  -- 3. Получаем stream_module_id для этой ступени
  SELECT cs.stream_module_id INTO v_stream_module_id
  FROM public.course_stages cs
  WHERE cs.id = p_stage_id;

  -- 4. Получаем unlock_offset_days модуля для тарифа пользователя
  SELECT tsm.unlock_offset_days INTO v_module_unlock_offset
  FROM public.user_tariffs ut
  JOIN public.user_stream_enrollments use_en ON use_en.user_id = ut.user_id
  JOIN public.stream_tariffs st ON st.stream_id = use_en.stream_id AND st.tariff_id = ut.tariff_id
  JOIN public.tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id AND tsm.stream_module_id = v_stream_module_id
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;

  -- Если не нашли - используем 0
  v_module_unlock_offset := COALESCE(v_module_unlock_offset, 0);

  IF v_user_access_expires_at IS NOT NULL AND v_user_access_expires_at < now() THEN
    -- Если доступ истек, возвращаем все уроки как недоступные
    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.order_num,
      FALSE,
      l.open_at,
      l.deadline_at,
      l.has_assignment,
      l.cover_image_path,
      COALESCE(l.open_day_offset, l.order_num - 1),
      COALESCE(l.deadline_day_offset, l.order_num + 1),
      v_module_unlock_offset,
      v_stream_start_date
    FROM public.lessons l
    WHERE l.stage_id = p_stage_id
    ORDER BY l.order_num;
    RETURN;
  END IF;

  -- 5. Получаем активный тариф пользователя
  SELECT tariff_id INTO v_user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, возвращаем все уроки как недоступные
  IF v_user_tariff_id IS NULL THEN
    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.order_num,
      FALSE,
      l.open_at,
      l.deadline_at,
      l.has_assignment,
      l.cover_image_path,
      COALESCE(l.open_day_offset, l.order_num - 1),
      COALESCE(l.deadline_day_offset, l.order_num + 1),
      v_module_unlock_offset,
      v_stream_start_date
    FROM public.lessons l
    WHERE l.stage_id = p_stage_id
    ORDER BY l.order_num;
    RETURN;
  END IF;

  -- 6. Получаем все уроки с оптимизированной проверкой доступа
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.order_num,
    CASE
      -- Если у урока нет ограничений по тарифам - доступен
      WHEN NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id) THEN TRUE
      -- Если есть ограничения - проверяем доступ пользователя
      ELSE EXISTS (
        SELECT 1 FROM public.tariff_lesson_access tla
        WHERE tla.lesson_id = l.id AND tla.tariff_id = v_user_tariff_id
      )
    END,
    l.open_at,
    l.deadline_at,
    l.has_assignment,
    l.cover_image_path,
    COALESCE(l.open_day_offset, l.order_num - 1),
    COALESCE(l.deadline_day_offset, l.order_num + 1),
    v_module_unlock_offset,
    v_stream_start_date
  FROM public.lessons l
  WHERE l.stage_id = p_stage_id
  ORDER BY l.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_user_accessible_lessons_optimized IS
'Оптимизированная функция для получения уроков с информацией о доступности.
Возвращает out_module_unlock_offset_days - смещение открытия модуля от start_date потока.
out_open_day_offset урока должен применяться относительно даты открытия модуля.';
