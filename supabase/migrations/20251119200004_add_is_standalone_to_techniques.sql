-- Migration: Add is_standalone flag to techniques
-- Date: 2025-11-19
-- Description: Добавление флага is_standalone для техник. Standalone техники доступны к покупке отдельно (не привязаны к модулям).

-- =============================================
-- 1. ДОБАВИТЬ КОЛОНКУ is_standalone
-- =============================================
ALTER TABLE public.techniques
ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.techniques.is_standalone IS 'Техника доступна к покупке отдельно (не привязана к модулям тарифов)';

-- =============================================
-- 2. СОЗДАТЬ ИНДЕКС ДЛЯ БЫСТРОГО ПОИСКА
-- =============================================
CREATE INDEX IF NOT EXISTS idx_techniques_standalone
  ON public.techniques(is_standalone)
  WHERE is_standalone = true;
