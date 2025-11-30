-- ============================================================================
-- Миграция: Добавить stream_module_id в lessons для прямой связи с модулями
-- Цель: Убрать промежуточный уровень course_stages
-- ============================================================================

-- Шаг 1: Добавляем колонку stream_module_id в таблицу lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS stream_module_id UUID REFERENCES stream_modules(id) ON DELETE SET NULL;

-- Шаг 2: Заполняем stream_module_id из course_stages
-- Каждый урок получает stream_module_id от своей ступени
UPDATE lessons l
SET stream_module_id = cs.stream_module_id
FROM course_stages cs
WHERE l.stage_id = cs.id
  AND cs.stream_module_id IS NOT NULL
  AND l.stream_module_id IS NULL;

-- Шаг 3: Создаём индекс для быстрых запросов по модулю
CREATE INDEX IF NOT EXISTS idx_lessons_stream_module_id ON lessons(stream_module_id);

-- Шаг 4: Делаем stage_id nullable для постепенного перехода
-- (позволяет создавать уроки напрямую в модуле без ступени)
ALTER TABLE lessons ALTER COLUMN stage_id DROP NOT NULL;

-- Шаг 5: Добавляем комментарии для документации
COMMENT ON COLUMN lessons.stream_module_id IS 'Прямая связь с модулем потока (новая архитектура без course_stages)';
COMMENT ON COLUMN lessons.stage_id IS 'DEPRECATED: Связь со ступенью, будет удалена после полного перехода';

-- ============================================================================
-- Проверка результатов миграции
-- ============================================================================
DO $$
DECLARE
    total_lessons INTEGER;
    lessons_with_module INTEGER;
    lessons_without_module INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_lessons FROM lessons;
    SELECT COUNT(*) INTO lessons_with_module FROM lessons WHERE stream_module_id IS NOT NULL;
    SELECT COUNT(*) INTO lessons_without_module FROM lessons WHERE stream_module_id IS NULL;

    RAISE NOTICE 'Миграция завершена:';
    RAISE NOTICE '  - Всего уроков: %', total_lessons;
    RAISE NOTICE '  - Уроков с stream_module_id: %', lessons_with_module;
    RAISE NOTICE '  - Уроков без stream_module_id: %', lessons_without_module;
END $$;
