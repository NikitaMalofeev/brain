-- Быстрое создание тестового курса
-- Выполните этот скрипт ПЕРЕД миграциями seed data, если у вас нет курсов в БД

-- 1. Проверяем есть ли уже курсы
DO $$
DECLARE
  v_courses_count INT;
BEGIN
  SELECT COUNT(*) INTO v_courses_count FROM public.courses;

  IF v_courses_count > 0 THEN
    RAISE NOTICE 'Found % existing courses. Skipping course creation.', v_courses_count;
  ELSE
    RAISE NOTICE 'No courses found. Creating test course...';

    -- 2. Создаем тестовый курс (минимальный набор колонок)
    INSERT INTO public.courses (id, title, description, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Brain Programming Базовый',
      'Базовый курс для начинающих',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Test course created with ID: 00000000-0000-0000-0000-000000000001';
  END IF;
END $$;

-- 3. Показать все курсы
SELECT id, title, created_at FROM public.courses;
