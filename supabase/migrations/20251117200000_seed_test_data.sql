-- ================================================
-- SEED-ДАННЫЕ ДЛЯ ТЕСТИРОВАНИЯ РЕЛИЗА 2.0
-- ================================================

-- =====================
-- 1. ТЕХНИКИ (Techniques)
-- =====================

-- Удаляем старые тестовые данные если есть
DELETE FROM user_technique_access WHERE technique_id IN (
  SELECT id FROM techniques WHERE title IN ('Императрица', 'Верховная жрица', 'Богиня', 'Базовая медитация')
);
DELETE FROM techniques WHERE title IN ('Императрица', 'Верховная жрица', 'Богиня', 'Базовая медитация');

-- 1.1 Императрица (доступна для покупки сразу)
INSERT INTO techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  created_at
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'Императрица',
  'Первая практика из серии женских архетипов. Помогает раскрыть внутреннюю силу и уверенность.',
  'https://example.com/empress.mp3',
  'https://example.com/empress.jpg',
  1200, -- 20 минут
  'purchasable',
  'https://brainprogramming.ru/buy/empress',
  'https://t.me/brainprogramming_sales',
  'Исцеление',
  NULL,
  NULL,
  NOW()
);

-- 1.2 Верховная жрица (через 30 дней после Императрицы)
INSERT INTO techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  created_at
) VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'Верховная жрица',
  'Вторая практика. Развивает интуицию и связь с внутренней мудростью. Доступна через 30 дней после получения Императрицы.',
  'https://example.com/priestess.mp3',
  'https://example.com/priestess.jpg',
  1500, -- 25 минут
  'locked',
  'https://brainprogramming.ru/buy/priestess',
  'https://t.me/brainprogramming_sales',
  'Психолог',
  'after_technique',
  '{"technique_id": "a1111111-1111-1111-1111-111111111111", "duration_days": 30}'::jsonb,
  NOW()
);

-- 1.3 Богиня (через 30 дней после Верховной жрицы)
INSERT INTO techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  created_at
) VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'Богиня',
  'Третья, финальная практика. Полная интеграция женских архетипов. Доступна через 30 дней после получения Верховной жрицы.',
  'https://example.com/goddess.mp3',
  'https://example.com/goddess.jpg',
  1800, -- 30 минут
  'locked',
  'https://brainprogramming.ru/buy/goddess',
  'https://t.me/brainprogramming_sales',
  'Доктор наук',
  'after_technique',
  '{"technique_id": "a2222222-2222-2222-2222-222222222222", "duration_days": 30}'::jsonb,
  NOW()
);

-- 1.4 Бесплатная техника для тестирования гостей
INSERT INTO techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000000',
  'Базовая медитация',
  'Бесплатная практика для всех пользователей. Подходит для начинающих.',
  'https://example.com/basic.mp3',
  'https://example.com/basic.jpg',
  600, -- 10 минут
  'free',
  NULL,
  NULL,
  'Базовый модуль',
  NOW()
);

-- =====================
-- 2. ПОТОКИ И КАЛЕНДАРЬ
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

  -- Событие 4: Открытие техники
  INSERT INTO calendar_events (
    stream_id,
    module_id,
    title,
    description,
    event_date,
    event_time,
    event_type,
    technique_id,
    cover_image
  ) VALUES (
    v_stream_id,
    v_module3_id,
    'Открытие техники "Императрица"',
    'Сегодня для вас откроется доступ к практике Императрица',
    CURRENT_DATE + INTERVAL '7 days',
    '12:00:00',
    'technique_unlock',
    'a1111111-1111-1111-1111-111111111111',
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
-- 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- =====================

-- Функция для быстрой выдачи техники пользователю (для тестирования)
CREATE OR REPLACE FUNCTION grant_technique_to_user(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_technique_access (user_id, technique_id, access_source)
  VALUES (p_user_id, p_technique_id, 'gift')
  ON CONFLICT (user_id, technique_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION grant_technique_to_user IS 'Выдает доступ к технике пользователю (для тестирования)';

-- =====================
-- 5. ИТОГОВОЕ СООБЩЕНИЕ
-- =====================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SEED-ДАННЫЕ УСПЕШНО УСТАНОВЛЕНЫ';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Созданы:';
  RAISE NOTICE '✅ 4 техники (3 платные + 1 бесплатная)';
  RAISE NOTICE '✅ 1 поток с 3 модулями';
  RAISE NOTICE '✅ 4 события календаря';
  RAISE NOTICE '✅ Задания для первых 3 уроков (по 3 задания на урок)';
  RAISE NOTICE '';
  RAISE NOTICE 'Следующие шаги:';
  RAISE NOTICE '1. Создайте тестовых пользователей (гость, ученик, куратор)';
  RAISE NOTICE '2. Назначьте ученика на поток (user_stream_enrollments)';
  RAISE NOTICE '3. Начните тестирование по инструкции в TESTING_GUIDE.md';
  RAISE NOTICE '';
END $$;
