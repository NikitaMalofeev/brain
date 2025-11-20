-- Добавляем поле active_days в module_materials
ALTER TABLE public.module_materials
ADD COLUMN IF NOT EXISTS active_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.module_materials.active_days IS 'Сколько дней материал активен (NULL = бессрочно)';
