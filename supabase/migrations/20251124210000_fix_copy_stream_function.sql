-- ============================================
-- Исправление функции копирования потока
-- Правильная структура полей calendar_events
-- ============================================

-- Удаляем старые версии функций
DROP FUNCTION IF EXISTS copy_stream(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS copy_stream_with_config(UUID, TEXT, DATE);

-- Создаем исправленную функцию
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
  v_tariff_record RECORD;
  v_tsm_record RECORD;
  v_tmt_record RECORD;
  v_old_to_new_module_id JSONB := '{}'::JSONB;
  v_old_to_new_stream_tariff_id JSONB := '{}'::JSONB;
  v_old_to_new_tsm_id JSONB := '{}'::JSONB;
  v_new_module_id UUID;
  v_new_stream_tariff_id UUID;
  v_new_tsm_id UUID;
BEGIN
  -- Получаем дату начала исходного потока
  SELECT start_date INTO v_source_start_date
  FROM public.streams
  WHERE id = p_source_stream_id;

  IF v_source_start_date IS NULL THEN
    RAISE EXCEPTION 'Source stream not found: %', p_source_stream_id;
  END IF;

  -- Вычисляем смещение в днях
  v_date_offset := p_new_start_date - v_source_start_date;

  -- 1. Создаем новый поток
  INSERT INTO public.streams (name, course_id, start_date, is_active)
  SELECT p_new_stream_name, course_id, p_new_start_date, true
  FROM public.streams
  WHERE id = p_source_stream_id
  RETURNING id INTO v_new_stream_id;

  RAISE NOTICE 'Created new stream: %', v_new_stream_id;

  -- 2. Копируем модули потока
  FOR v_module_record IN
    SELECT * FROM public.stream_modules
    WHERE stream_id = p_source_stream_id
    ORDER BY order_num
  LOOP
    INSERT INTO public.stream_modules (stream_id, name, color, order_num)
    VALUES (v_new_stream_id, v_module_record.name, v_module_record.color, v_module_record.order_num)
    RETURNING id INTO v_new_module_id;

    -- Сохраняем маппинг старый ID -> новый ID
    v_old_to_new_module_id := v_old_to_new_module_id ||
      jsonb_build_object(v_module_record.id::TEXT, v_new_module_id::TEXT);

    RAISE NOTICE 'Copied module: % -> %', v_module_record.name, v_new_module_id;
  END LOOP;

  -- 3. Копируем события календаря (с правильной структурой полей)
  FOR v_event_record IN
    SELECT * FROM public.calendar_events
    WHERE stream_id = p_source_stream_id
  LOOP
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
    )
    VALUES (
      v_new_stream_id,
      CASE
        WHEN v_event_record.module_id IS NOT NULL
        THEN (v_old_to_new_module_id->>v_event_record.module_id::TEXT)::UUID
        ELSE NULL
      END,
      v_event_record.title,
      v_event_record.description,
      v_event_record.event_date + v_date_offset,
      v_event_record.event_time,
      v_event_record.event_type,
      v_event_record.external_url,
      v_event_record.lesson_id,
      v_event_record.material_id,
      v_event_record.technique_id,
      v_event_record.cover_image
    );
  END LOOP;

  RAISE NOTICE 'Copied calendar events';

  -- 4. Копируем связи с тарифами (stream_tariffs)
  FOR v_tariff_record IN
    SELECT * FROM public.stream_tariffs
    WHERE stream_id = p_source_stream_id
  LOOP
    INSERT INTO public.stream_tariffs (stream_id, tariff_id)
    VALUES (v_new_stream_id, v_tariff_record.tariff_id)
    RETURNING id INTO v_new_stream_tariff_id;

    -- Сохраняем маппинг
    v_old_to_new_stream_tariff_id := v_old_to_new_stream_tariff_id ||
      jsonb_build_object(v_tariff_record.id::TEXT, v_new_stream_tariff_id::TEXT);

    RAISE NOTICE 'Copied stream_tariff: %', v_new_stream_tariff_id;
  END LOOP;

  -- 5. Копируем модули тарифов (tariff_stream_modules)
  FOR v_tsm_record IN
    SELECT tsm.*
    FROM public.tariff_stream_modules tsm
    JOIN public.stream_tariffs st ON st.id = tsm.stream_tariff_id
    WHERE st.stream_id = p_source_stream_id
  LOOP
    -- Получаем новый stream_tariff_id
    v_new_stream_tariff_id := (v_old_to_new_stream_tariff_id->>v_tsm_record.stream_tariff_id::TEXT)::UUID;
    -- Получаем новый stream_module_id
    v_new_module_id := (v_old_to_new_module_id->>v_tsm_record.stream_module_id::TEXT)::UUID;

    IF v_new_stream_tariff_id IS NOT NULL AND v_new_module_id IS NOT NULL THEN
      INSERT INTO public.tariff_stream_modules (
        stream_tariff_id,
        stream_module_id,
        access_duration_days,
        order_num
      )
      VALUES (
        v_new_stream_tariff_id,
        v_new_module_id,
        v_tsm_record.access_duration_days,
        v_tsm_record.order_num
      )
      RETURNING id INTO v_new_tsm_id;

      -- Сохраняем маппинг
      v_old_to_new_tsm_id := v_old_to_new_tsm_id ||
        jsonb_build_object(v_tsm_record.id::TEXT, v_new_tsm_id::TEXT);
    END IF;
  END LOOP;

  RAISE NOTICE 'Copied tariff_stream_modules';

  -- 6. Копируем техники модулей тарифов (tariff_module_techniques)
  FOR v_tmt_record IN
    SELECT tmt.*
    FROM public.tariff_module_techniques tmt
    JOIN public.tariff_stream_modules tsm ON tsm.id = tmt.tariff_stream_module_id
    JOIN public.stream_tariffs st ON st.id = tsm.stream_tariff_id
    WHERE st.stream_id = p_source_stream_id
  LOOP
    -- Получаем новый tariff_stream_module_id
    v_new_tsm_id := (v_old_to_new_tsm_id->>v_tmt_record.tariff_stream_module_id::TEXT)::UUID;

    IF v_new_tsm_id IS NOT NULL THEN
      INSERT INTO public.tariff_module_techniques (
        tariff_stream_module_id,
        technique_id,
        unlock_offset_days,
        order_num
      )
      VALUES (
        v_new_tsm_id,
        v_tmt_record.technique_id,
        v_tmt_record.unlock_offset_days,
        v_tmt_record.order_num
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Copied tariff_module_techniques';

  -- 7. Копируем stream_module_techniques (если есть)
  INSERT INTO public.stream_module_techniques (
    stream_module_id,
    technique_id,
    unlock_date,
    order_num
  )
  SELECT
    (v_old_to_new_module_id->>smt.stream_module_id::TEXT)::UUID,
    smt.technique_id,
    CASE
      WHEN smt.unlock_date IS NOT NULL THEN smt.unlock_date + v_date_offset
      ELSE NULL
    END,
    smt.order_num
  FROM public.stream_module_techniques smt
  JOIN public.stream_modules sm ON sm.id = smt.stream_module_id
  WHERE sm.stream_id = p_source_stream_id
  AND (v_old_to_new_module_id->>smt.stream_module_id::TEXT) IS NOT NULL;

  RAISE NOTICE 'Copied stream_module_techniques';

  RAISE NOTICE 'Stream copy completed successfully: % -> %', p_source_stream_id, v_new_stream_id;

  RETURN v_new_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION copy_stream(UUID, TEXT, DATE) IS
'Полное копирование потока со всеми модулями, событиями, тарифами и техниками. Даты сдвигаются на новую дату начала.';

-- Права на выполнение
GRANT EXECUTE ON FUNCTION copy_stream(UUID, TEXT, DATE) TO authenticated;

-- Информация
DO $$
BEGIN
  RAISE NOTICE 'Функция copy_stream() успешно создана/обновлена';
  RAISE NOTICE 'Копирует: модули, события календаря, stream_tariffs, tariff_stream_modules, tariff_module_techniques, stream_module_techniques';
END $$;
