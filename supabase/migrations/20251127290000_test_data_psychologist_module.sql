-- Migration: Test data for module "Психолог" with exactly 12 assignments
-- Date: 2025-11-27
-- Structure: Модуль → Ступени (course_stages) → Задания (assignments через lessons)
-- 4 ступени × 3 задания = 12 заданий

DO $$
DECLARE
    v_module_id UUID := 'ea35c924-54f0-43bf-83d2-b408b49ac53c';  -- Модуль Психолог
    v_stream_id UUID := '2a0fc89c-a050-4cd8-8972-14918026fccf';
    v_course_id UUID := '1d66bf31-dc5b-4291-9581-f7f12cc373b6';
    v_stage_id INT;
    v_lesson_id INT;
    v_max_order_num INT;
    v_stage_names TEXT[] := ARRAY['Основы психологии', 'Работа с эмоциями', 'Когнитивные техники', 'Практическая интеграция'];
    v_stage_descs TEXT[] := ARRAY[
        'Изучите базовые принципы психологии',
        'Научитесь распознавать и управлять эмоциями',
        'Освойте техники работы с мышлением',
        'Применение всех знаний на практике'
    ];
    i INT;
BEGIN
    RAISE NOTICE 'Creating test data for module "Психолог": id=%', v_module_id;

    -- Удаляем старые тестовые данные для этого модуля
    DELETE FROM submissions WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id));
    DELETE FROM assignment_drafts WHERE assignment_id IN (SELECT id FROM assignments WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id)));
    DELETE FROM assignments WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id));
    DELETE FROM lesson_blocks WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id));
    DELETE FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id);
    DELETE FROM course_stages WHERE stream_module_id = v_module_id;

    RAISE NOTICE 'Old test data deleted for module Психолог';

    -- Получаем максимальный order_num для ступеней этого курса
    SELECT COALESCE(MAX(order_num), 0) INTO v_max_order_num
    FROM public.course_stages
    WHERE course_id = v_course_id;

    RAISE NOTICE 'Max order_num for course stages: %', v_max_order_num;

    -- Создаём 4 ступени, каждая с 3 заданиями = 12 заданий
    FOR i IN 1..4 LOOP
        -- Создаём ступень (course_stage)
        INSERT INTO course_stages (
            course_id,
            stream_module_id,
            name,
            description,
            order_num
        ) VALUES (
            v_course_id,
            v_module_id,
            v_stage_names[i],
            v_stage_descs[i],
            v_max_order_num + i  -- Уникальный order_num
        ) RETURNING id INTO v_stage_id;

        RAISE NOTICE 'Created stage: % (id=%)', v_stage_names[i], v_stage_id;

        -- Создаём 1 lesson для этой ступени
        INSERT INTO lessons (
            stage_id,
            stream_id,
            name,
            description,
            order_num,
            has_assignment,
            open_day_offset,
            deadline_day_offset
        ) VALUES (
            v_stage_id,
            v_stream_id,
            v_stage_names[i],
            v_stage_descs[i],
            v_max_order_num + i,
            true,
            (v_max_order_num + i) - 1,
            (v_max_order_num + i) + 2
        ) RETURNING id INTO v_lesson_id;

        RAISE NOTICE '  Created lesson for stage (id=%)', v_lesson_id;

        -- Блок: Введение
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Введение',
            'text',
            '# ' || v_stage_names[i] || E'\n\n' ||
            'Добро пожаловать в ступень **"' || v_stage_names[i] || '"** модуля Психолог.' || E'\n\n' ||
            '## Что вы узнаете:' || E'\n' ||
            '- Основы работы с психикой' || E'\n' ||
            '- Техники саморегуляции' || E'\n' ||
            '- Методы самопознания',
            1
        );

        -- Блок: Основной материал
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Основной материал',
            'text',
            '## Основной материал' || E'\n\n' ||
            'Психология — наука о поведении и психических процессах.' || E'\n\n' ||
            '### Ключевые понятия:' || E'\n' ||
            '1. **Эмоции** — реакции на стимулы' || E'\n' ||
            '2. **Когниции** — мыслительные процессы' || E'\n' ||
            '3. **Поведение** — внешние проявления',
            2
        );

        -- Задание 1: Практика
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Задание 1: Практика',
            'text',
            '## Задание 1: Практика' || E'\n\n' ||
            'Выполните упражнение по самонаблюдению.' || E'\n\n' ||
            '### Что нужно сделать:' || E'\n' ||
            '1. Отслеживайте свои эмоции в течение дня' || E'\n' ||
            '2. Записывайте триггеры' || E'\n' ||
            '3. Анализируйте паттерны',
            3
        );
        INSERT INTO assignments (lesson_id, order_num, title, description)
        VALUES (v_lesson_id, 1, 'Задание 1: Практика', 'Выполните упражнение по самонаблюдению');

        -- Задание 2: Рефлексия
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Задание 2: Рефлексия',
            'text',
            '## Задание 2: Рефлексия' || E'\n\n' ||
            'Напишите о своих инсайтах.' || E'\n\n' ||
            '### Что нужно сделать:' || E'\n' ||
            '1. Опишите главный инсайт' || E'\n' ||
            '2. Как это связано с жизнью?' || E'\n' ||
            '3. Что планируете изменить?',
            4
        );
        INSERT INTO assignments (lesson_id, order_num, title, description)
        VALUES (v_lesson_id, 2, 'Задание 2: Рефлексия', 'Напишите о своих инсайтах');

        -- Задание 3: Творческое
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Задание 3: Творческое',
            'text',
            '## Задание 3: Творческое' || E'\n\n' ||
            'Создайте визуализацию.' || E'\n\n' ||
            '### Варианты:' || E'\n' ||
            '- Нарисуйте карту эмоций' || E'\n' ||
            '- Создайте коллаж состояний' || E'\n' ||
            '- Запишите аудио-дневник',
            5
        );
        INSERT INTO assignments (lesson_id, order_num, title, description)
        VALUES (v_lesson_id, 3, 'Задание 3: Творческое', 'Создайте визуализацию');

        RAISE NOTICE '    Created 3 assignments for stage %', v_stage_names[i];

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== Test data for Психолог created successfully! ===';
    RAISE NOTICE 'Created 4 stages with 3 assignments each = 12 assignments total';
END $$;
