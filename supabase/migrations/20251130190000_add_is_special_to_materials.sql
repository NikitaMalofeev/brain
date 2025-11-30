-- Добавляем поле is_special для техник которые могут быть в специальных пакетах
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_special BOOLEAN DEFAULT FALSE;

-- Индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_materials_is_special ON materials(is_special) WHERE is_special = TRUE;
