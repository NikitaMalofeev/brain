-- Migration: Create calendar SQL functions
-- Date: 2025-11-14
-- Description: SQL функции для получения событий календаря и копирования потоков

-- ============================================
-- 1. Функция получения событий календаря для пользователя
-- ============================================
CREATE OR REPLACE FUNCTION get_user_calendar_events(
  p_user_id UUID,
  p_month DATE
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  description TEXT,
  event_date DATE,
  event_time TIME,
  event_type TEXT,
  external_url TEXT,
  lesson_id INT,
  material_id UUID,
  technique_id UUID,
  cover_image TEXT,
  module_id UUID,
  module_name TEXT,
  module_color TEXT,
  can_access BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id AS event_id,
    ce.title,
    ce.description,
    ce.event_date,
    ce.event_time,
    ce.event_type,
    ce.external_url,
    ce.lesson_id,
    ce.material_id,
    ce.technique_id,
    ce.cover_image,
    ce.module_id,
    sm.name AS module_name,
    sm.color AS module_color,
    -- Проверка доступа к событию
    CASE
      -- Админы и кураторы имеют доступ ко всем событиям
      WHEN u.role IN ('admin', 'curator') THEN true
      -- Если событие без ограничений по тарифам - доступно всем
      WHEN NOT EXISTS (
        SELECT 1 FROM public.event_tariff_access eta
        WHERE eta.event_id = ce.id
      ) THEN true
      -- Проверяем наличие подходящего тарифа у пользователя
      WHEN EXISTS (
        SELECT 1
        FROM public.user_tariffs ut
        INNER JOIN public.event_tariff_access eta ON eta.tariff_id = ut.tariff_id
        WHERE ut.user_id = p_user_id
        AND ut.is_active = true
        AND eta.event_id = ce.id
      ) THEN true
      ELSE false
    END AS can_access

  FROM public.calendar_events ce
  INNER JOIN public.streams s ON s.id = ce.stream_id
  LEFT JOIN public.stream_modules sm ON sm.id = ce.module_id
  LEFT JOIN public.users u ON u.id = p_user_id

  -- Фильтруем по месяцу и потоку пользователя
  WHERE ce.event_date >= DATE_TRUNC('month', p_month)::DATE
    AND ce.event_date < (DATE_TRUNC('month', p_month) + INTERVAL '1 month')::DATE
    AND (
      -- Показываем события из потока пользователя
      EXISTS (
        SELECT 1 FROM public.user_stream_enrollments use
        WHERE use.user_id = p_user_id AND use.stream_id = s.id
      )
      -- Или если пользователь - админ/куратор (видят все потоки)
      OR u.role IN ('admin', 'curator')
    )

  ORDER BY ce.event_date, ce.event_time NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_calendar_events(UUID, DATE) IS
'Возвращает события календаря для пользователя на указанный месяц с проверкой доступа по тарифам';

-- ============================================
-- 2. Функция копирования потока с новыми датами
-- ============================================
CREATE OR REPLACE FUNCTION copy_stream(
  p_source_stream_id UUID,
  p_new_stream_name TEXT,
  p_new_start_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_new_stream_id UUID;
  v_source_start_date DATE;
  v_date_offset INT;
  v_module_record RECORD;
  v_event_record RECORD;
  v_old_to_new_module_id JSONB := '{}'::JSONB;
BEGIN
  -- Получаем дату начала исходного потока
  SELECT start_date INTO v_source_start_date
  FROM public.streams
  WHERE id = p_source_stream_id;

  IF v_source_start_date IS NULL THEN
    RAISE EXCEPTION 'Source stream not found';
  END IF;

  -- Вычисляем смещение в днях
  v_date_offset := p_new_start_date - v_source_start_date;

  -- Создаем новый поток
  INSERT INTO public.streams (name, course_id, start_date, is_active)
  SELECT p_new_stream_name, course_id, p_new_start_date, true
  FROM public.streams
  WHERE id = p_source_stream_id
  RETURNING id INTO v_new_stream_id;

  -- Копируем модули потока
  FOR v_module_record IN
    SELECT * FROM public.stream_modules
    WHERE stream_id = p_source_stream_id
  LOOP
    DECLARE
      v_new_module_id UUID;
    BEGIN
      INSERT INTO public.stream_modules (stream_id, name, color, order_num)
      VALUES (v_new_stream_id, v_module_record.name, v_module_record.color, v_module_record.order_num)
      RETURNING id INTO v_new_module_id;

      -- Сохраняем маппинг старый ID -> новый ID
      v_old_to_new_module_id := v_old_to_new_module_id ||
        jsonb_build_object(v_module_record.id::TEXT, v_new_module_id::TEXT);
    END;
  END LOOP;

  -- Копируем события календаря со смещением дат
  FOR v_event_record IN
    SELECT * FROM public.calendar_events
    WHERE stream_id = p_source_stream_id
  LOOP
    DECLARE
      v_new_module_id UUID;
    BEGIN
      -- Получаем новый module_id из маппинга
      IF v_event_record.module_id IS NOT NULL THEN
        v_new_module_id := (v_old_to_new_module_id->>(v_event_record.module_id::TEXT))::UUID;
      END IF;

      INSERT INTO public.calendar_events (
        stream_id,
        module_id,
        title,
        description,
        event_date,
        event_time,
        event_type,
        external_url,
        lesson_id,
        material_id,
        technique_id,
        cover_image
      ) VALUES (
        v_new_stream_id,
        v_new_module_id,
        v_event_record.title,
        v_event_record.description,
        v_event_record.event_date + v_date_offset, -- Смещаем дату
        v_event_record.event_time,
        v_event_record.event_type,
        v_event_record.external_url,
        v_event_record.lesson_id,
        v_event_record.material_id,
        v_event_record.technique_id,
        v_event_record.cover_image
      );
    END;
  END LOOP;

  -- Копируем настройки доступа по тарифам
  INSERT INTO public.event_tariff_access (event_id, tariff_id)
  SELECT
    new_events.id AS event_id,
    eta.tariff_id
  FROM public.calendar_events old_events
  INNER JOIN public.event_tariff_access eta ON eta.event_id = old_events.id
  INNER JOIN public.calendar_events new_events ON
    new_events.stream_id = v_new_stream_id
    AND new_events.title = old_events.title
    AND new_events.event_type = old_events.event_type
  WHERE old_events.stream_id = p_source_stream_id;

  RETURN v_new_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION copy_stream(UUID, TEXT, DATE) IS
'Копирует поток со всеми модулями и событиями, сдвигая даты относительно новой даты начала';

-- ============================================
-- 3. Права на выполнение функций
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_calendar_events(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION copy_stream(UUID, TEXT, DATE) TO authenticated;

-- ============================================
-- 4. Вывод информации
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'SQL функции календаря успешно созданы:';
  RAISE NOTICE '- get_user_calendar_events() - получение событий для пользователя';
  RAISE NOTICE '- copy_stream() - копирование потока с новыми датами';
END $$;
