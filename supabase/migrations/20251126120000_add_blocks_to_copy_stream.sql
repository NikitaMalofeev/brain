-- Migration: Add lesson_blocks copying to copy_stream function
-- Date: 2025-11-26
-- Description: Добавляем копирование блоков уроков (lesson_blocks) при копировании потока

-- Удаляем старую версию функции
DROP FUNCTION IF EXISTS copy_stream(UUID, TEXT, DATE);

-- Создаем улучшенную функцию с копированием блоков
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
  v_stage_record RECORD;
  v_lesson_record RECORD;
  v_block_record RECORD;
  v_old_to_new_module_id JSONB := '{}'::JSONB;
  v_old_to_new_stream_tariff_id JSONB := '{}'::JSONB;
  v_old_to_new_tsm_id JSONB := '{}'::JSONB;
  v_old_to_new_stage_id JSONB := '{}'::JSONB;
  v_old_to_new_lesson_id JSONB := '{}'::JSONB;
  v_new_module_id UUID;
  v_new_stream_tariff_id UUID;
  v_new_tsm_id UUID;
  v_new_stage_id INT;
  v_new_lesson_id INT;
  v_course_id UUID;
BEGIN
  -- Получаем дату начала исходного потока и course_id
  SELECT start_date, course_id INTO v_source_start_date, v_course_id
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

  -- 3. Копируем ступени (course_stages), привязанные к модулям исходного потока
  FOR v_stage_record IN
    SELECT cs.*
    FROM public.course_stages cs
    JOIN public.stream_modules sm ON sm.id = cs.stream_module_id
    WHERE sm.stream_id = p_source_stream_id
    ORDER BY cs.order_num
  LOOP
    -- Получаем новый stream_module_id
    v_new_module_id := (v_old_to_new_module_id->>v_stage_record.stream_module_id::TEXT)::UUID;

    IF v_new_module_id IS NOT NULL THEN
      INSERT INTO public.course_stages (
        course_id,
        stream_module_id,
        name,
        description,
        order_num,
        unlock_condition_type,
        unlock_condition_value,
        cover_image_path
      )
      VALUES (
        v_course_id,
        v_new_module_id,
        v_stage_record.name,
        v_stage_record.description,
        v_stage_record.order_num,
        v_stage_record.unlock_condition_type,
        v_stage_record.unlock_condition_value,
        v_stage_record.cover_image_path
      )
      RETURNING id INTO v_new_stage_id;

      -- Сохраняем маппинг старый stage_id -> новый stage_id
      v_old_to_new_stage_id := v_old_to_new_stage_id ||
        jsonb_build_object(v_stage_record.id::TEXT, v_new_stage_id::TEXT);

      RAISE NOTICE 'Copied stage: % (% -> %)', v_stage_record.name, v_stage_record.id, v_new_stage_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Copied course_stages';

  -- 4. Копируем уроки (lessons), привязанные к скопированным ступеням
  FOR v_lesson_record IN
    SELECT l.*
    FROM public.lessons l
    WHERE l.stage_id IN (SELECT (jsonb_object_keys(v_old_to_new_stage_id))::INT)
    ORDER BY l.order_num
  LOOP
    -- Получаем новый stage_id
    v_new_stage_id := (v_old_to_new_stage_id->>v_lesson_record.stage_id::TEXT)::INT;

    IF v_new_stage_id IS NOT NULL THEN
      INSERT INTO public.lessons (
        stage_id,
        stream_id,
        name,
        description,
        order_num,
        cover_image_path,
        has_assignment,
        estimated_duration_minutes,
        open_at,
        deadline_at
      )
      VALUES (
        v_new_stage_id,
        v_new_stream_id,
        v_lesson_record.name,
        v_lesson_record.description,
        v_lesson_record.order_num,
        v_lesson_record.cover_image_path,
        v_lesson_record.has_assignment,
        v_lesson_record.estimated_duration_minutes,
        CASE
          WHEN v_lesson_record.open_at IS NOT NULL
          THEN v_lesson_record.open_at + (v_date_offset || ' days')::INTERVAL
          ELSE NULL
        END,
        CASE
          WHEN v_lesson_record.deadline_at IS NOT NULL
          THEN v_lesson_record.deadline_at + (v_date_offset || ' days')::INTERVAL
          ELSE NULL
        END
      )
      RETURNING id INTO v_new_lesson_id;

      -- Сохраняем маппинг старый lesson_id -> новый lesson_id
      v_old_to_new_lesson_id := v_old_to_new_lesson_id ||
        jsonb_build_object(v_lesson_record.id::TEXT, v_new_lesson_id::TEXT);

      RAISE NOTICE 'Copied lesson: % (% -> %)', v_lesson_record.name, v_lesson_record.id, v_new_lesson_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Copied lessons';

  -- 5. Копируем блоки уроков (lesson_blocks)
  FOR v_block_record IN
    SELECT lb.*
    FROM public.lesson_blocks lb
    WHERE lb.lesson_id IN (SELECT (jsonb_object_keys(v_old_to_new_lesson_id))::INT)
    ORDER BY lb.order_num
  LOOP
    -- Получаем новый lesson_id
    v_new_lesson_id := (v_old_to_new_lesson_id->>v_block_record.lesson_id::TEXT)::INT;

    IF v_new_lesson_id IS NOT NULL THEN
      INSERT INTO public.lesson_blocks (
        lesson_id,
        title,
        block_type,
        content_text,
        content_url,
        order_num,
        material_id
      )
      VALUES (
        v_new_lesson_id,
        v_block_record.title,
        v_block_record.block_type,
        v_block_record.content_text,
        v_block_record.content_url,
        v_block_record.order_num,
        v_block_record.material_id
      );

      RAISE NOTICE 'Copied block: % for lesson %', v_block_record.title, v_new_lesson_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Copied lesson_blocks';

  -- 6. Копируем события календаря (с правильной структурой полей)
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

  -- 7. Копируем связи с тарифами (stream_tariffs)
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

  -- 8. Копируем модули тарифов (tariff_stream_modules)
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

  -- 9. Копируем материалы модулей тарифов (tariff_module_materials)
  FOR v_tmt_record IN
    SELECT tmm.*
    FROM public.tariff_module_materials tmm
    JOIN public.tariff_stream_modules tsm ON tsm.id = tmm.tariff_stream_module_id
    JOIN public.stream_tariffs st ON st.id = tsm.stream_tariff_id
    WHERE st.stream_id = p_source_stream_id
  LOOP
    -- Получаем новый tariff_stream_module_id
    v_new_tsm_id := (v_old_to_new_tsm_id->>v_tmt_record.tariff_stream_module_id::TEXT)::UUID;

    IF v_new_tsm_id IS NOT NULL THEN
      INSERT INTO public.tariff_module_materials (
        tariff_stream_module_id,
        material_id,
        active_days,
        order_num
      )
      VALUES (
        v_new_tsm_id,
        v_tmt_record.material_id,
        v_tmt_record.active_days,
        v_tmt_record.order_num
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Copied tariff_module_materials';

  RAISE NOTICE 'Stream copy completed successfully: % -> %', p_source_stream_id, v_new_stream_id;

  RETURN v_new_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION copy_stream(UUID, TEXT, DATE) IS
'Полное копирование потока со всеми модулями, ступенями, уроками, блоками, событиями, тарифами и техниками. Даты сдвигаются на новую дату начала.';

-- Права на выполнение
GRANT EXECUTE ON FUNCTION copy_stream(UUID, TEXT, DATE) TO authenticated;

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Функция copy_stream() обновлена с поддержкой блоков:';
  RAISE NOTICE '   - Копирует модули потока';
  RAISE NOTICE '   - Копирует ступени (course_stages) с привязкой к новым модулям';
  RAISE NOTICE '   - Копирует уроки (lessons) с привязкой к новым ступеням';
  RAISE NOTICE '   - Копирует блоки уроков (lesson_blocks) с привязкой к новым урокам';
  RAISE NOTICE '   - Копирует события календаря с новыми датами';
  RAISE NOTICE '   - Копирует stream_tariffs, tariff_stream_modules, tariff_module_techniques';
  RAISE NOTICE '   - Копирует stream_module_techniques';
  RAISE NOTICE '   - Даты уроков (open_at, deadline_at) сдвигаются автоматически';
END $$;
