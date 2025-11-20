-- ============================================
-- Расширение techniques: добавление блоков контента и доступа по тарифам
-- ============================================

-- 1. Добавляем недостающие поля в techniques
ALTER TABLE public.techniques
ADD COLUMN IF NOT EXISTS material_type TEXT DEFAULT 'audio' CHECK (material_type IN ('video', 'audio')),
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ;

COMMENT ON COLUMN public.techniques.material_type IS 'Тип техники: video или audio';
COMMENT ON COLUMN public.techniques.course_id IS 'Привязка к курсу (опционально)';
COMMENT ON COLUMN public.techniques.release_date IS 'Дата открытия техники';

-- 2. Создаем таблицу блоков техник (аналог material_blocks)
CREATE TABLE IF NOT EXISTS public.technique_blocks (
    id BIGSERIAL PRIMARY KEY,
    technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL DEFAULT 1,
    title TEXT,
    block_type TEXT NOT NULL DEFAULT 'text' CHECK (block_type IN ('text', 'video', 'audio', 'image', 'pdf')),
    content_text TEXT,
    content_url TEXT,
    meta_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technique_blocks_technique_id ON public.technique_blocks(technique_id);
CREATE INDEX IF NOT EXISTS idx_technique_blocks_order ON public.technique_blocks(technique_id, order_num);

COMMENT ON TABLE public.technique_blocks IS 'Блоки контента для техник';
COMMENT ON COLUMN public.technique_blocks.block_type IS 'Тип блока: text, video, audio, image, pdf';
COMMENT ON COLUMN public.technique_blocks.meta_json IS 'Метаданные (например, audio_data для волны)';

-- 3. Создаем таблицу доступа техник по тарифам
CREATE TABLE IF NOT EXISTS public.technique_tariff_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
    tariff_id UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(technique_id, tariff_id)
);

CREATE INDEX IF NOT EXISTS idx_technique_tariff_access_technique ON public.technique_tariff_access(technique_id);
CREATE INDEX IF NOT EXISTS idx_technique_tariff_access_tariff ON public.technique_tariff_access(tariff_id);

COMMENT ON TABLE public.technique_tariff_access IS 'Доступ к техникам по тарифам';

-- 4. RLS политики для technique_blocks
ALTER TABLE public.technique_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technique_blocks_select_all" ON public.technique_blocks
    FOR SELECT USING (true);

CREATE POLICY "technique_blocks_insert_authenticated" ON public.technique_blocks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "technique_blocks_update_authenticated" ON public.technique_blocks
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "technique_blocks_delete_authenticated" ON public.technique_blocks
    FOR DELETE TO authenticated USING (true);

-- 5. RLS политики для technique_tariff_access
ALTER TABLE public.technique_tariff_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technique_tariff_access_select_all" ON public.technique_tariff_access
    FOR SELECT USING (true);

CREATE POLICY "technique_tariff_access_insert_authenticated" ON public.technique_tariff_access
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "technique_tariff_access_update_authenticated" ON public.technique_tariff_access
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "technique_tariff_access_delete_authenticated" ON public.technique_tariff_access
    FOR DELETE TO authenticated USING (true);

-- 6. Миграция данных из materials в techniques (если нужно)
-- Можно запустить отдельно вручную после проверки

-- Информация
DO $$
BEGIN
  RAISE NOTICE 'Расширение techniques завершено:';
  RAISE NOTICE '- Добавлены поля: material_type, course_id, release_date';
  RAISE NOTICE '- Создана таблица technique_blocks';
  RAISE NOTICE '- Создана таблица technique_tariff_access';
END $$;
