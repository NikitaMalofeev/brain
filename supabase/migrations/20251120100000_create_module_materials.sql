-- ============================================
-- Связь модулей с материалами из библиотеки
-- ============================================

-- Таблица связи модулей с материалами
CREATE TABLE IF NOT EXISTS public.module_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.stream_modules(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL DEFAULT 1,
    release_day INTEGER DEFAULT 1, -- День от начала модуля когда открывается материал
    active_days INTEGER DEFAULT NULL, -- Сколько дней материал активен (NULL = бессрочно)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(module_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_module_materials_module ON public.module_materials(module_id);
CREATE INDEX IF NOT EXISTS idx_module_materials_material ON public.module_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_module_materials_order ON public.module_materials(module_id, order_num);

COMMENT ON TABLE public.module_materials IS 'Связь модулей с материалами из библиотеки';
COMMENT ON COLUMN public.module_materials.release_day IS 'День от начала модуля когда открывается материал';

-- RLS политики
ALTER TABLE public.module_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_materials_select_all" ON public.module_materials
    FOR SELECT USING (true);

CREATE POLICY "module_materials_insert_authenticated" ON public.module_materials
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "module_materials_update_authenticated" ON public.module_materials
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "module_materials_delete_authenticated" ON public.module_materials
    FOR DELETE TO authenticated USING (true);

-- Информация
DO $$
BEGIN
  RAISE NOTICE 'Создана таблица module_materials для связи модулей с материалами';
END $$;
