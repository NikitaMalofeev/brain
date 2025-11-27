-- Migration: Test data for module "Психолог" with exactly 12 assignments
-- Date: 2025-11-27
-- Structure: 2 stages, 2 lessons each, 3 assignments per lesson = 2*2*3 = 12 assignments

DO $$
DECLARE
    v_module_id UUID := 'ea35c924-54f0-43bf-83d2-b408b49ac53c';  -- Модуль Психолог
    v_stream_id UUID := '2a0fc89c-a050-4cd8-8972-14918026fccf';  -- Тот же поток что и Исцеление
    v_course_id UUID := '1d66bf31-dc5b-4291-9581-f7f12cc373b6';  -- Тот же курс
    v_stage_id INT;
    v_lesson_id INT;
    v_stage_names TEXT[] := ARRAY['Основы психологии', 'Практическая психология'];
    v_stage_descs TEXT[] := ARRAY[
        'Изучите базовые принципы психологии и работы с эмоциями',
        'Применение психологических техник на практике'
    ];
    v_max_order_num INT;
    i INT;
    j INT;
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

    -- Создаём 2 ступени
    FOR i IN 1..2 LOOP
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
            v_max_order_num + i  -- Используем уникальный order_num
        ) RETURNING id INTO v_stage_id;

        RAISE NOTICE 'Created stage: % (id=%)', v_stage_names[i], v_stage_id;

        -- Создаём 2 урока в каждой ступени
        FOR j IN 1..2 LOOP
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
                'Урок ' || j || ': ' ||
                CASE
                    WHEN j = 1 THEN 'Теория'
                    ELSE 'Практика'
                END,
                'Описание урока ' || j || ' ступени "' || v_stage_names[i] || '"',
                (i - 1) * 2 + j,
                true,
                (i - 1) * 2 + j - 1,
                (i - 1) * 2 + j + 2
            ) RETURNING id INTO v_lesson_id;

            RAISE NOTICE '  Created lesson: Урок % (id=%)', j, v_lesson_id;

            -- Блок 1: Введение
            INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
            VALUES (
                v_lesson_id,
                'Введение',
                'text',
                '# ' || v_stage_names[i] || ' - Урок ' || j || E'\n\n' ||
                'Добро пожаловать в урок модуля **Психолог**.' || E'\n\n' ||
                '## Что вы узнаете:' || E'\n' ||
                '- Основы работы с эмоциями' || E'\n' ||
                '- Техники саморегуляции' || E'\n' ||
                '- Методы работы с убеждениями',
                1
            );

            -- Блок 2: Основной материал
            INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
            VALUES (
                v_lesson_id,
                'Основной материал',
                'text',
                '## Основной материал урока' || E'\n\n' ||
                'Психология — это наука о поведении и психических процессах.' || E'\n\n' ||
                '### Ключевые понятия:' || E'\n' ||
                '1. **Эмоции** — реакции на внешние и внутренние стимулы' || E'\n' ||
                '2. **Когниции** — мыслительные процессы' || E'\n' ||
                '3. **Поведение** — внешние проявления психики',
                2
            );

            -- Задание 1: Практика (всегда)
            INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
            VALUES (
                v_lesson_id,
                'Задание 1: Практика',
                'text',
                '## Задание 1: Практика' || E'\n\n' ||
                'Выполните упражнение по самонаблюдению.' || E'\n\n' ||
                '### Что нужно сделать:' || E'\n' ||
                '1. В течение дня отслеживайте свои эмоции' || E'\n' ||
                '2. Записывайте триггеры и реакции' || E'\n' ||
                '3. Проанализируйте паттерны',
                3
            );
            INSERT INTO assignments (lesson_id, order_num, title, description)
            VALUES (v_lesson_id, 1, 'Задание 1: Практика', 'Выполните упражнение по самонаблюдению');

            -- Задание 2: Рефлексия (всегда)
            INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
            VALUES (
                v_lesson_id,
                'Задание 2: Рефлексия',
                'text',
                '## Задание 2: Рефлексия' || E'\n\n' ||
                'Напишите о своих инсайтах.' || E'\n\n' ||
                '### Что нужно сделать:' || E'\n' ||
                '1. Опишите главный инсайт урока' || E'\n' ||
                '2. Как это связано с вашей жизнью?' || E'\n' ||
                '3. Что планируете изменить?',
                4
            );
            INSERT INTO assignments (lesson_id, order_num, title, description)
            VALUES (v_lesson_id, 2, 'Задание 2: Рефлексия', 'Напишите о своих инсайтах');

            -- Задание 3: Творческое (всегда, для достижения 12 заданий)
            INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
            VALUES (
                v_lesson_id,
                'Задание 3: Творческое',
                'text',
                '## Задание 3: Творческое' || E'\n\n' ||
                'Создайте визуализацию своих эмоций.' || E'\n\n' ||
                '### Варианты:' || E'\n' ||
                '- Нарисуйте карту эмоций' || E'\n' ||
                '- Создайте коллаж состояний' || E'\n' ||
                '- Запишите аудио-дневник',
                5
            );
            INSERT INTO assignments (lesson_id, order_num, title, description)
            VALUES (v_lesson_id, 3, 'Задание 3: Творческое', 'Создайте визуализацию своих эмоций');

            RAISE NOTICE '    Created 3 assignments for lesson %', v_lesson_id;

        END LOOP;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== Test data for Психолог created successfully! ===';
    RAISE NOTICE 'Created 2 stages with 2 lessons each (4 lessons total)';
    RAISE NOTICE 'Each lesson has 3 assignments = 12 assignments total';
END $$;
