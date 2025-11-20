-- Migration: Create stream_tariffs table
-- Date: 2025-11-19
-- Description: Связь тарифов с потоками. Один тариф может быть настроен для разных потоков.

-- =============================================
-- 1. СОЗДАТЬ ТАБЛИЦУ stream_tariffs
-- =============================================
CREATE TABLE IF NOT EXISTS public.stream_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  tariff_id UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность: один тариф может быть только один раз в потоке
  UNIQUE(stream_id, tariff_id)
);

COMMENT ON TABLE public.stream_tariffs IS 'Связь тарифов с потоками. Определяет какие тарифы доступны в каком потоке.';

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_stream_tariffs_stream
  ON public.stream_tariffs(stream_id);

CREATE INDEX IF NOT EXISTS idx_stream_tariffs_tariff
  ON public.stream_tariffs(tariff_id);

-- =============================================
-- 2. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_stream_tariffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stream_tariffs_updated_at ON public.stream_tariffs;

CREATE TRIGGER trigger_update_stream_tariffs_updated_at
  BEFORE UPDATE ON public.stream_tariffs
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_tariffs_updated_at();

-- =============================================
-- 3. SEED DATA: Связать существующие тарифы с потоками
-- =============================================
-- Связываем все тарифы со всеми потоками по умолчанию
INSERT INTO public.stream_tariffs (stream_id, tariff_id)
SELECT s.id, t.id
FROM public.streams s
CROSS JOIN public.tariffs t
ON CONFLICT (stream_id, tariff_id) DO NOTHING;

COMMENT ON TABLE public.stream_tariffs IS 'Связь тарифов с потоками (многие ко многим)';
