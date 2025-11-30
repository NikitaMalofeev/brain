-- Добавляем поле technique_id в lesson_blocks для привязки техники к блоку
-- Техника будет показываться в блоке урока если дни совпадают (open_day_offset урока = release_day техники)

ALTER TABLE lesson_blocks
ADD COLUMN IF NOT EXISTS technique_id UUID REFERENCES materials(id) ON DELETE SET NULL;

-- Индекс для быстрого поиска блоков с техниками
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_technique_id ON lesson_blocks(technique_id) WHERE technique_id IS NOT NULL;

COMMENT ON COLUMN lesson_blocks.technique_id IS 'ID техники (материала) привязанной к этому блоку. Показывается пользователю при просмотре урока.';
