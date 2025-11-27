-- Migration: Create assignments for all lessons in module "Модуль Исцеление"
-- Date: 2025-11-27
-- Description: Создаём assignments для всех блоков с "Задание" в названии
-- для потока "Поток Ноябрь 2025 тест (копия) (копия)"

-- Вставляем assignments для всех блоков с "Задание" в названии
-- для уроков в модуле "Модуль Исцеление" потока 19be002d-41f7-4875-a8af-f3c9af6eb8ed
INSERT INTO assignments (lesson_id, title, description, order_num)
SELECT
    lb.lesson_id,
    lb.title,
    'Задание из блока урока',
    lb.order_num
FROM lesson_blocks lb
JOIN lessons l ON l.id = lb.lesson_id
JOIN course_stages cs ON cs.id = l.stage_id
JOIN stream_modules sm ON sm.id = cs.stream_module_id
WHERE sm.stream_id = '19be002d-41f7-4875-a8af-f3c9af6eb8ed'
  AND sm.name = 'Модуль Исцеление'
  AND lb.title ILIKE '%задание%'
  AND NOT EXISTS (
    -- Проверяем что такой assignment ещё не существует
    SELECT 1 FROM assignments a
    WHERE a.lesson_id = lb.lesson_id
    AND a.title = lb.title
  )
ORDER BY lb.lesson_id, lb.order_num;

-- Выводим результат
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM assignments a
    JOIN lessons l ON l.id = a.lesson_id
    JOIN course_stages cs ON cs.id = l.stage_id
    JOIN stream_modules sm ON sm.id = cs.stream_module_id
    WHERE sm.stream_id = '19be002d-41f7-4875-a8af-f3c9af6eb8ed'
      AND sm.name = 'Модуль Исцеление';

    RAISE NOTICE 'Создано assignments для модуля Исцеление: %', v_count;
END $$;
