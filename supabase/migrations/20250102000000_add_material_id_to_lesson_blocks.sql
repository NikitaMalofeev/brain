-- Добавляем поле material_id в таблицу lesson_blocks для поддержки блоков типа 'material'
ALTER TABLE lesson_blocks 
ADD COLUMN material_id UUID REFERENCES materials(id) ON DELETE CASCADE;

-- Добавляем комментарий к полю
COMMENT ON COLUMN lesson_blocks.material_id IS 'Ссылка на материал из библиотеки для блоков типа material';

-- Обновляем CHECK constraint для поддержки нового типа блока
ALTER TABLE lesson_blocks 
DROP CONSTRAINT IF EXISTS lesson_blocks_block_type_check;

ALTER TABLE lesson_blocks 
ADD CONSTRAINT lesson_blocks_block_type_check 
CHECK (block_type = ANY (ARRAY['text'::text, 'video'::text, 'audio'::text, 'image'::text, 'pdf'::text, 'material'::text]));

-- Добавляем индекс для быстрого поиска по material_id
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_material_id ON lesson_blocks(material_id); 