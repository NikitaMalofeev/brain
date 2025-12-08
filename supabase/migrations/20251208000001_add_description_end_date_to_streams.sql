-- Migration: Add description and end_date columns to streams table
-- Date: 2025-12-08
-- Description: Добавление колонок description и end_date в таблицу streams

-- Добавляем колонку description
ALTER TABLE public.streams
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.streams.description IS 'Описание потока';

-- Добавляем колонку end_date
ALTER TABLE public.streams
ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN public.streams.end_date IS 'Дата окончания потока (опционально)';

-- Вывод информации
DO $$
BEGIN
  RAISE NOTICE 'Колонки description и end_date успешно добавлены в таблицу streams';
END $$;
