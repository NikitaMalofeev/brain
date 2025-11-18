-- Migration: Seed test data for courses, lessons, materials, and techniques
-- Date: 2025-11-14
-- Description: Заполнение тестовыми данными для курсов, уроков, материалов и техник

-- ============================================
-- 1. Проверяем наличие курса или создаем его (если таблица courses существует)
-- ============================================
-- Примечание: Если у вас уже есть курс в БД, эта секция не нужна
-- Закомментировано, так как структура таблицы courses может отличаться

-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
--     INSERT INTO public.courses (id, title, description, created_at)
--     VALUES ('00000000-0000-0000-0000-000000000001', 'Brain Programming Базовый', 'Базовый курс для начинающих', NOW())
--     ON CONFLICT (id) DO NOTHING;
--   END IF;
-- END $$;

-- ============================================
-- 2. Добавляем ступени курса
-- ============================================
-- ПРИМЕЧАНИЕ: Замените '00000000-0000-0000-0000-000000000001' на ID вашего реального курса
-- Или создайте курс в Supabase Studio и используйте его ID

-- Пример: найдите ID вашего курса
-- SELECT id, title FROM public.courses LIMIT 5;

DO $$
DECLARE
  v_course_id UUID;
  v_stages_count INT;
BEGIN
  -- Пытаемся найти любой существующий курс
  SELECT id INTO v_course_id FROM public.courses LIMIT 1;

  IF v_course_id IS NOT NULL THEN
    -- Проверяем есть ли уже ступени для этого курса
    SELECT COUNT(*) INTO v_stages_count
    FROM public.course_stages
    WHERE course_id = v_course_id;

    IF v_stages_count > 0 THEN
      RAISE NOTICE 'Course % already has % stages. Skipping stage creation.', v_course_id, v_stages_count;
    ELSE
      -- Если курс найден и ступеней нет, создаем ступени
      INSERT INTO public.course_stages (id, course_id, name, order_num, cover_image_path, created_at)
      VALUES
        (1001, v_course_id, 'Модуль 1: Основы', 1, NULL, NOW()),
        (1002, v_course_id, 'Модуль 2: Практика', 2, NULL, NOW()),
        (1003, v_course_id, 'Модуль 3: Углубление', 3, NULL, NOW())
      ON CONFLICT (id) DO NOTHING;

      RAISE NOTICE 'Course stages created for course_id: %', v_course_id;
    END IF;
  ELSE
    RAISE NOTICE 'No courses found. Please create a course first or update this migration with a valid course_id.';
  END IF;
END $$;

-- ============================================
-- 3. Материалы, уроки и блоки уроков
-- ============================================
-- ПРИМЕЧАНИЕ: Эта секция закомментирована, так как структура таблиц materials, lessons
-- и lesson_blocks может отличаться в вашей БД.
-- Раскомментируйте и адаптируйте под вашу структуру при необходимости.

/*
-- Если вы хотите добавить тестовые материалы, уроки и блоки:
-- 1. Проверьте структуру таблицы materials:
--    SELECT column_name FROM information_schema.columns WHERE table_name = 'materials';
-- 2. Обновите INSERT запросы с правильными колонками
-- 3. Раскомментируйте код ниже

INSERT INTO public.materials (id, ...) VALUES (...);
INSERT INTO public.lessons (id, stage_id, title, ...) VALUES (...);
INSERT INTO public.lesson_blocks (id, lesson_id, ...) VALUES (...);
*/

-- Для целей демонстрации календаря, материалы и уроки не обязательны

-- ============================================
-- 6. Добавляем тестовые техники (аудиопрактики)
-- ============================================
INSERT INTO public.techniques (
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
  order_num,
  created_at
)
VALUES
  -- Бесплатная техника
  (
    '20000000-0000-0000-0000-000000000001',
    'Борьба со страхом',
    'Преодоление небытия и страха',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    NULL,
    900,
    'free',
    NULL,
    NULL,
    'Модуль 1',
    1,
    NOW()
  ),

  -- Техники для покупки
  (
    '20000000-0000-0000-0000-000000000002',
    'Эмоциональное состояние',
    'Управление эмоциями и настроением',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    NULL,
    1200,
    'purchasable',
    'https://example.com/buy/technique-2',
    'https://t.me/brain_support',
    'Модуль 2',
    2,
    NOW()
  ),

  (
    '20000000-0000-0000-0000-000000000003',
    'Глубокая медитация',
    'Техника глубокого погружения в медитативное состояние',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    NULL,
    1800,
    'purchasable',
    'https://example.com/buy/technique-3',
    'https://t.me/brain_support',
    'Модуль 3',
    3,
    NOW()
  ),

  -- Заблокированная техника
  (
    '20000000-0000-0000-0000-000000000004',
    'Продвинутая концентрация',
    'Техника для опытных практиков',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    NULL,
    2400,
    'locked',
    NULL,
    'https://t.me/brain_support',
    'Модуль 4',
    4,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. Вывод информации
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Тестовые данные успешно добавлены ===';
  RAISE NOTICE 'Техники: 4 шт (1 бесплатная, 2 для покупки, 1 заблокированная)';
  RAISE NOTICE 'Примечание: Материалы и уроки не созданы (различная структура таблиц)';
  RAISE NOTICE 'Для календаря это не критично - используйте существующие уроки/материалы';
END $$;
