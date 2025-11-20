-- Migration: Create tariff_stream_modules table
-- Date: 2025-11-19
-- Description: Модули доступные в тарифе потока с ограничением по времени

-- =============================================
-- 1. СОЗДАТЬ ТАБЛИЦУ tariff_stream_modules
-- =============================================
CREATE TABLE IF NOT EXISTS public.tariff_stream_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_tariff_id UUID NOT NULL REFERENCES public.stream_tariffs(id) ON DELETE CASCADE,
  stream_module_id UUID NOT NULL REFERENCES public.stream_modules(id) ON DELETE CASCADE,
  access_duration_days INTEGER, -- NULL = бессрочный доступ, INTEGER = количество дней
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность: один модуль может быть только один раз в тарифе потока
  UNIQUE(stream_tariff_id, stream_module_id)
);

COMMENT ON TABLE public.tariff_stream_modules IS 'Модули доступные в тарифе потока. Определяет какие модули доступны и на сколько дней.';
COMMENT ON COLUMN public.tariff_stream_modules.access_duration_days IS 'Количество дней доступа к модулю (NULL = бессрочно)';

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tariff_stream_modules_tariff
  ON public.tariff_stream_modules(stream_tariff_id);

CREATE INDEX IF NOT EXISTS idx_tariff_stream_modules_module
  ON public.tariff_stream_modules(stream_module_id);

-- =============================================
-- 2. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_tariff_stream_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tariff_stream_modules_updated_at ON public.tariff_stream_modules;

CREATE TRIGGER trigger_update_tariff_stream_modules_updated_at
  BEFORE UPDATE ON public.tariff_stream_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_tariff_stream_modules_updated_at();
