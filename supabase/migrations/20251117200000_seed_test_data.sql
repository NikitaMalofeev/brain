-- ================================================
-- SEED-ДАННЫЕ ДЛЯ ТЕСТИРОВАНИЯ РЕЛИЗА 2.0
-- ================================================
--
-- ПРИМЕЧАНИЕ: Тестовые техники теперь создаются в миграции 20251119220000_seed_test_tariff_data.sql
-- Эта миграция создает только потоки, календарь и домашние задания для совместимости со старой системой
--
-- ================================================

-- =====================
-- 1. ПОТОКИ И КАЛЕНДАРЬ
-- =====================

-- Получаем ID первого курса (предполагаем что курс уже создан)
DO $$
DECLARE
  v_course_id UUID;
  v_stream_id UUID;
  v_module1_id UUID;
  v_module2_id UUID;
  v_module3_id UUID;
  v_lesson1_id INT;
BEGIN
  -- Получаем первый курс
  SELECT id INTO v_course_id FROM courses LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Нет курсов в базе. Создайте хотя бы один курс перед применением seed-данных.';
  END IF;

  -- Получаем первый урок
  SELECT id INTO v_lesson1_id FROM lessons LIMIT 1;

  -- 2.1 Создаем тестовый поток
  INSERT INTO streams (id, name, course_id, start_date, is_active)
  VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'Поток Ноябрь 2025',
    v_course_id,
    '2025-11-01',
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    start_date = EXCLUDED.start_date
  RETURNING id INTO v_stream_id;

  -- 2.2 Создаем модули потока
  INSERT INTO stream_modules (id, stream_id, name, order_num, color)
  VALUES
    (
      'c1111111-1111-1111-1111-111111111111',
      v_stream_id,
      'Исцеление',
      1,
      '#FF5733'
    ),
    (
      'c2222222-2222-2222-2222-222222222222',
      v_stream_id,
      'Психолог',
      2,
      '#33FF57'
    ),
    (
      'c3333333-3333-3333-3333-333333333333',
      v_stream_id,
      'Доктор наук',
      3,
      '#3357FF'
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    order_num = EXCLUDED.order_num,
    color = EXCLUDED.color;

  -- Получаем ID модулей
  SELECT id INTO v_module1_id FROM stream_modules WHERE stream_id = v_stream_id AND order_num = 1;
  SELECT id INTO v_module2_id FROM stream_modules WHERE stream_id = v_stream_id AND order_num = 2;
  SELECT id INTO v_module3_id FROM stream_modules WHERE stream_id = v_stream_id AND order_num = 3;

  -- 2.3 Создаем события календаря

  -- Событие 1: Zoom-встреча
  INSERT INTO calendar_events (
    stream_id,
    module_id,
    title,
    description,
    event_date,
    event_time,
    event_type,
    external_url,
    cover_image
  ) VALUES (
    v_stream_id,
    v_module1_id,
    'Вводный вебинар: Знакомство с программой',
    'Первое занятие потока. Знакомимся, обсуждаем цели и задачи.',
    CURRENT_DATE + INTERVAL '1 day', -- Завтра
    '19:00:00',
    'zoom',
    'https://zoom.us/j/123456789',
    NULL
  );

  -- Событие 2: Оффлайн встреча
  INSERT INTO calendar_events (
    stream_id,
    module_id,
    title,
    description,
    event_date,
    event_time,
    event_type,
    external_url,
    cover_image
  ) VALUES (
    v_stream_id,
    v_module1_id,
    'Оффлайн встреча в Москве',
    'Групповая практика в студии. Адрес: ул. Тверская, д. 1',
    CURRENT_DATE + INTERVAL '3 days',
    '18:00:00',
    'offline',
    'https://yandex.ru/maps/...',
    NULL
  );

  -- Событие 3: Открытие урока
  IF v_lesson1_id IS NOT NULL THEN
    INSERT INTO calendar_events (
      stream_id,
      module_id,
      title,
      description,
      event_date,
      event_time,
      event_type,
      lesson_id,
      cover_image
    ) VALUES (
      v_stream_id,
      v_module2_id,
      'Открытие нового урока',
      'Сегодня откроется доступ к новому уроку модуля Психолог',
      CURRENT_DATE + INTERVAL '5 days',
      '10:00:00',
      'lesson_unlock',
      v_lesson1_id,
      NULL
    );
  END IF;

  -- Событие 4: Общее событие (техники теперь управляются через новую систему тарифов)
  INSERT INTO calendar_events (
    stream_id,
    module_id,
    title,
    description,
    event_date,
    event_time,
    event_type,
    external_url,
    cover_image
  ) VALUES (
    v_stream_id,
    v_module3_id,
    'Групповая медитация',
    'Совместная практика с группой. Подключайтесь к Zoom.',
    CURRENT_DATE + INTERVAL '7 days',
    '12:00:00',
    'zoom',
    'https://zoom.us/j/987654321',
    NULL
  );

END $$;

-- =====================
-- 3. ДОМАШНИЕ ЗАДАНИЯ (Assignments)
-- =====================

-- Создаем задания для первых 3 уроков
DO $$
DECLARE
  v_lesson_id INT;
  lesson_record RECORD;
BEGIN
  -- Для каждого из первых 3 уроков создаем по 3 задания
  FOR lesson_record IN (SELECT id FROM lessons ORDER BY id LIMIT 3) LOOP
    v_lesson_id := lesson_record.id;

    -- Задание 1
    INSERT INTO assignments (lesson_id, order_num, title, description)
    VALUES (
      v_lesson_id,
      1,
      'Практическое задание',
      'Опишите свои ощущения после практики. Что изменилось? Какие инсайты получили?'
    )
    ON CONFLICT (lesson_id, order_num) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description;

    -- Задание 2
    INSERT INTO assignments (lesson_id, order_num, title, description)
    VALUES (
      v_lesson_id,
      2,
      'Рефлексия',
      'Напишите о том, как вы применили полученные знания в жизни. Приведите примеры.'
    )
    ON CONFLICT (lesson_id, order_num) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description;

    -- Задание 3
    INSERT INTO assignments (lesson_id, order_num, title, description)
    VALUES (
      v_lesson_id,
      3,
      'Творческое задание',
      'Создайте коллаж/рисунок/текст, отражающий вашу трансформацию. Прикрепите файл или ссылку.'
    )
    ON CONFLICT (lesson_id, order_num) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description;
  END LOOP;

  RAISE NOTICE 'Создано по 3 задания для первых 3 уроков';
END $$;

-- =====================
-- 4. ИТОГОВОЕ СООБЩЕНИЕ
-- =====================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SEED-ДАННЫЕ (СТАРАЯ СИСТЕМА) УСТАНОВЛЕНЫ';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Созданы:';
  RAISE NOTICE '✅ 1 поток с 3 модулями (для совместимости)';
  RAISE NOTICE '✅ 4 события календаря';
  RAISE NOTICE '✅ Задания для первых 3 уроков (по 3 задания на урок)';
  RAISE NOTICE '';
  RAISE NOTICE 'ВАЖНО: Тестовые техники и тарифы создаются в миграции';
  RAISE NOTICE '       20251119220000_seed_test_tariff_data.sql';
  RAISE NOTICE '';
END $$;
