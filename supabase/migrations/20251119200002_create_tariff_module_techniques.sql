-- Migration: Create tariff_module_techniques table
-- Date: 2025-11-19
-- Description: Техники доступные в модуле для конкретного тарифа с задержкой открытия

-- =============================================
-- 1. СОЗДАТЬ ТАБЛИЦУ tariff_module_techniques
-- =============================================
CREATE TABLE IF NOT EXISTS public.tariff_module_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_stream_module_id UUID NOT NULL REFERENCES public.tariff_stream_modules(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  unlock_offset_days INTEGER DEFAULT 0, -- Через сколько дней от начала доступа к модулю открывается техника
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность: одна техника может быть только один раз в модуле тарифа
  UNIQUE(tariff_stream_module_id, technique_id)
);

COMMENT ON TABLE public.tariff_module_techniques IS 'Техники доступные в модуле для конкретного тарифа. Определяет какие техники доступны и через сколько дней после начала модуля.';
COMMENT ON COLUMN public.tariff_module_techniques.unlock_offset_days IS 'Количество дней от начала доступа к модулю до открытия техники (0 = доступна сразу)';

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tariff_module_techniques_module
  ON public.tariff_module_techniques(tariff_stream_module_id);

CREATE INDEX IF NOT EXISTS idx_tariff_module_techniques_technique
  ON public.tariff_module_techniques(technique_id);

-- =============================================
-- 2. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_tariff_module_techniques_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tariff_module_techniques_updated_at ON public.tariff_module_techniques;

CREATE TRIGGER trigger_update_tariff_module_techniques_updated_at
  BEFORE UPDATE ON public.tariff_module_techniques
  FOR EACH ROW
  EXECUTE FUNCTION update_tariff_module_techniques_updated_at();
