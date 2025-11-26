-- Migration: Link course_stages to stream_modules
-- Date: 2025-11-26
-- Description: Добавляем связь между ступенями (stages) и модулями потоков для интеграции уроков в модули

-- Добавляем stream_module_id в course_stages
ALTER TABLE course_stages
  ADD COLUMN IF NOT EXISTS stream_module_id UUID REFERENCES stream_modules(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_course_stages_stream_module_id
  ON course_stages(stream_module_id);

-- Комментарий
COMMENT ON COLUMN course_stages.stream_module_id IS 'Привязка ступени к модулю потока (новая архитектура: Курс → Поток → Тариф → Модуль → Ступени с уроками)';

-- Добавляем stream_id в lessons для привязки к потоку (для копирования)
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES streams(id) ON DELETE CASCADE;

-- Создаем индекс
CREATE INDEX IF NOT EXISTS idx_lessons_stream_id
  ON lessons(stream_id);

-- Комментарий
COMMENT ON COLUMN lessons.stream_id IS 'Привязка урока к потоку для корректного копирования при дублировании потока';

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Связь ступеней с модулями создана:';
  RAISE NOTICE '   - course_stages.stream_module_id добавлен';
  RAISE NOTICE '   - lessons.stream_id добавлен для копирования';
  RAISE NOTICE '   - Теперь: Курс → Поток → Тариф → Модуль → Ступени → Уроки';
END $$;
