-- Migration: Test data for module "Исцеление" with 5 stages, 2-3 assignments each
-- Date: 2025-11-27
-- Structure: Модуль → Ступени (course_stages) → Задания (assignments через lessons)
-- Каждая ступень = 1 lesson с 2-3 заданиями

DO $$
DECLARE
    v_module_id UUID := 'ab852c4e-a852-4943-8a82-9ca5aba865fa';
    v_stream_id UUID := '2a0fc89c-a050-4cd8-8972-14918026fccf';
    v_course_id UUID := '1d66bf31-dc5b-4291-9581-f7f12cc373b6';
    v_stage_id INT;
    v_lesson_id INT;
    v_assignments_count INT;
    v_stage_names TEXT[] := ARRAY['Основы исцеления', 'Работа с энергией', 'Медитативные практики', 'Глубинная трансформация', 'Мастерство исцеления'];
    v_stage_descs TEXT[] := ARRAY[
        'Изучите фундаментальные принципы исцеления и работы с телом',
        'Научитесь чувствовать и направлять энергетические потоки',
        'Освойте техники медитации для глубокого расслабления',
        'Работа с подсознанием и глубинными блоками',
        'Интеграция всех знаний и выход на новый уровень'
    ];
    i INT;
BEGIN
    -- Удаляем старые тестовые данные
    DELETE FROM submissions WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id));
    DELETE FROM assignment_drafts WHERE assignment_id IN (SELECT id FROM assignments WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id)));
    DELETE FROM assignments WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id));
    DELETE FROM lesson_blocks WHERE lesson_id IN (SELECT id FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id));
    DELETE FROM lessons WHERE stage_id IN (SELECT id FROM course_stages WHERE stream_module_id = v_module_id);
    DELETE FROM course_stages WHERE stream_module_id = v_module_id;

    RAISE NOTICE 'Old test data deleted';

    -- Создаём 5 ступеней, каждая ступень = 1 lesson с заданиями
    FOR i IN 1..5 LOOP
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
            i
        ) RETURNING id INTO v_stage_id;

        RAISE NOTICE 'Created stage: % (id=%)', v_stage_names[i], v_stage_id;

        -- Создаём 1 lesson для этой ступени (lesson = контейнер для заданий)
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
            v_stage_names[i],  -- Имя урока = имя ступени
            v_stage_descs[i],
            i,
            true,
            i - 1,
            i + 1
        ) RETURNING id INTO v_lesson_id;

        RAISE NOTICE '  Created lesson for stage (id=%)', v_lesson_id;

        -- Рандомно 2 или 3 задания в ступени
        v_assignments_count := 2 + (random() > 0.5)::int;

        -- Блок: Введение
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Введение',
            'text',
            '# ' || v_stage_names[i] || E'\n\n' ||
            'Добро пожаловать в ступень **"' || v_stage_names[i] || '"**.' || E'\n\n' ||
            '## Что вы узнаете:' || E'\n' ||
            '- Основные принципы и концепции' || E'\n' ||
            '- Практические техники применения' || E'\n' ||
            '- Способы интеграции в повседневную жизнь' || E'\n\n' ||
            '> **Важно:** Уделите особое внимание практическим упражнениям.',
            1
        );

        -- Блок: Основной материал
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Основной материал',
            'text',
            '## Основной материал' || E'\n\n' ||
            'В этом разделе мы рассмотрим ключевые аспекты темы.' || E'\n\n' ||
            '### Ключевые понятия:' || E'\n\n' ||
            '1. **Осознанность** - способность находиться в настоящем моменте' || E'\n' ||
            '2. **Намерение** - чёткое понимание цели практики' || E'\n' ||
            '3. **Регулярность** - постоянство в выполнении упражнений',
            2
        );

        -- Задание 1 (всегда)
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Задание 1: Практика',
            'text',
            '## Задание 1: Практика' || E'\n\n' ||
            'Выполните базовую практику.' || E'\n\n' ||
            '### Что нужно сделать:' || E'\n' ||
            '1. Выполните упражнение из основного материала' || E'\n' ||
            '2. Запишите свои ощущения' || E'\n' ||
            '3. Отметьте, что было сложно',
            3
        );
        INSERT INTO assignments (lesson_id, order_num, title, description)
        VALUES (v_lesson_id, 1, 'Задание 1: Практика', 'Выполните базовую практику');

        -- Задание 2 (всегда)
        INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
        VALUES (
            v_lesson_id,
            'Задание 2: Рефлексия',
            'text',
            '## Задание 2: Рефлексия' || E'\n\n' ||
            'Напишите о вашем опыте.' || E'\n\n' ||
            '### Что нужно сделать:' || E'\n' ||
            '1. Опишите ваши инсайты' || E'\n' ||
            '2. Как это применимо в жизни?' || E'\n' ||
            '3. Какие вопросы возникли?',
            4
        );
        INSERT INTO assignments (lesson_id, order_num, title, description)
        VALUES (v_lesson_id, 2, 'Задание 2: Рефлексия', 'Напишите о вашем опыте');

        -- Задание 3 (только если v_assignments_count = 3)
        IF v_assignments_count = 3 THEN
            INSERT INTO lesson_blocks (lesson_id, title, block_type, content_text, order_num)
            VALUES (
                v_lesson_id,
                'Задание 3: Творческое',
                'text',
                '## Задание 3: Творческое' || E'\n\n' ||
                'Создайте что-то своё на основе материала.' || E'\n\n' ||
                '### Варианты:' || E'\n' ||
                '- Нарисуйте свои ощущения' || E'\n' ||
                '- Запишите аудио-дневник' || E'\n' ||
                '- Создайте коллаж',
                5
            );
            INSERT INTO assignments (lesson_id, order_num, title, description)
            VALUES (v_lesson_id, 3, 'Задание 3: Творческое', 'Создайте что-то своё');
        END IF;

        RAISE NOTICE '    Created % assignments for stage %', v_assignments_count, v_stage_names[i];

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== Test data created successfully! ===';
    RAISE NOTICE 'Created 5 stages with 2-3 assignments each (10-15 assignments total)';
END $$;
