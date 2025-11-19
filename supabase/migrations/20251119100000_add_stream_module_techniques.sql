-- Migration: Add Stream Module Techniques with Unlock Dates
-- Date: 2025-11-19
-- Description: Добавление таблицы для связи техник с модулями потоков и датами открытия

-- =============================================
-- 1. СОЗДАТЬ ТАБЛИЦУ stream_module_techniques
-- =============================================
-- Эта таблица связывает технику с модулем потока и хранит дату открытия
CREATE TABLE IF NOT EXISTS public.stream_module_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_module_id UUID NOT NULL REFERENCES public.stream_modules(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  unlock_date DATE NOT NULL,
  order_num INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность: одна техника может быть только один раз в одном модуле
  UNIQUE(stream_module_id, technique_id)
);

COMMENT ON TABLE public.stream_module_techniques IS 'Связь техник с модулями потоков и даты их открытия';
COMMENT ON COLUMN public.stream_module_techniques.unlock_date IS 'Дата, когда техника становится доступной в этом модуле';

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_stream_module_techniques_module
  ON public.stream_module_techniques(stream_module_id);

CREATE INDEX IF NOT EXISTS idx_stream_module_techniques_technique
  ON public.stream_module_techniques(technique_id);

CREATE INDEX IF NOT EXISTS idx_stream_module_techniques_unlock_date
  ON public.stream_module_techniques(unlock_date);

-- =============================================
-- 2. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_stream_module_techniques_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stream_module_techniques_updated_at ON public.stream_module_techniques;

CREATE TRIGGER trigger_update_stream_module_techniques_updated_at
  BEFORE UPDATE ON public.stream_module_techniques
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_module_techniques_updated_at();

-- =============================================
-- 3. ФУНКЦИЯ: Получить ID модуля пользователя по названию модуля
-- =============================================
CREATE OR REPLACE FUNCTION get_user_stream_module_id(
  p_user_id UUID,
  p_module_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Найти модуль в потоке пользователя с таким названием
  SELECT sm.id INTO v_module_id
  FROM public.stream_modules sm
  JOIN public.user_stream_enrollments use ON use.stream_id = sm.stream_id
  WHERE use.user_id = p_user_id
    AND sm.name = p_module_name
  LIMIT 1;

  RETURN v_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_stream_module_id IS 'Получить ID модуля в потоке пользователя по названию модуля';

-- =============================================
-- 4. ФУНКЦИЯ: Установить дату открытия техники в модуле
-- =============================================
CREATE OR REPLACE FUNCTION set_technique_unlock_date_in_module(
  p_stream_module_id UUID,
  p_technique_id UUID,
  p_unlock_date DATE,
  p_order_num INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Вставить или обновить запись (UPSERT)
  INSERT INTO public.stream_module_techniques (
    stream_module_id,
    technique_id,
    unlock_date,
    order_num
  ) VALUES (
    p_stream_module_id,
    p_technique_id,
    p_unlock_date,
    p_order_num
  )
  ON CONFLICT (stream_module_id, technique_id)
  DO UPDATE SET
    unlock_date = EXCLUDED.unlock_date,
    order_num = EXCLUDED.order_num,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_technique_unlock_date_in_module IS 'Установить или обновить дату открытия техники в модуле потока';

-- =============================================
-- 5. ФУНКЦИЯ: Получить расписание техник для модуля
-- =============================================
CREATE OR REPLACE FUNCTION get_module_techniques_schedule(
  p_stream_module_id UUID
)
RETURNS TABLE (
  technique_id UUID,
  technique_title TEXT,
  unlock_date DATE,
  is_unlocked BOOLEAN,
  days_until_unlock INT,
  order_num INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as technique_id,
    t.title as technique_title,
    smt.unlock_date,
    (smt.unlock_date <= CURRENT_DATE) as is_unlocked,
    CASE
      WHEN smt.unlock_date > CURRENT_DATE THEN (smt.unlock_date - CURRENT_DATE)::INT
      ELSE 0
    END as days_until_unlock,
    smt.order_num
  FROM public.stream_module_techniques smt
  JOIN public.techniques t ON t.id = smt.technique_id
  WHERE smt.stream_module_id = p_stream_module_id
  ORDER BY smt.order_num, smt.unlock_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_module_techniques_schedule IS 'Получить расписание техник для модуля потока';

-- =============================================
-- 6. ТЕСТОВЫЕ ДАННЫЕ
-- =============================================
-- Добавим техники в модуль "Исцеление" потока "Ноябрь 2025"

-- Получаем ID модуля "Модуль Исцеление"
DO $$
DECLARE
  v_module_healing_id UUID := '40000000-0000-0000-0000-000000000001';
  v_technique_empress_id UUID := '00000000-0000-0000-0000-000000000001';
  v_technique_confidence_id UUID;
  v_technique_abundance_id UUID := '701d0dd9-76a3-4a16-ba57-62d8f1b27f9c';
BEGIN
  -- Найти ID техники "Уверенность и сила"
  SELECT id INTO v_technique_confidence_id
  FROM public.techniques
  WHERE title = 'Уверенность и сила'
  LIMIT 1;

  -- Императрица - доступна с начала модуля (1 ноября 2025)
  INSERT INTO public.stream_module_techniques (
    stream_module_id,
    technique_id,
    unlock_date,
    order_num
  ) VALUES (
    v_module_healing_id,
    v_technique_empress_id,
    '2025-11-01',
    1
  ) ON CONFLICT (stream_module_id, technique_id) DO UPDATE
    SET unlock_date = EXCLUDED.unlock_date,
        order_num = EXCLUDED.order_num;

  -- Уверенность и сила - доступна через 2 недели (15 ноября 2025)
  IF v_technique_confidence_id IS NOT NULL THEN
    INSERT INTO public.stream_module_techniques (
      stream_module_id,
      technique_id,
      unlock_date,
      order_num
    ) VALUES (
      v_module_healing_id,
      v_technique_confidence_id,
      '2025-11-15',
      2
    ) ON CONFLICT (stream_module_id, technique_id) DO UPDATE
      SET unlock_date = EXCLUDED.unlock_date,
          order_num = EXCLUDED.order_num;
  END IF;

  -- Медитация изобилия - доступна через месяц после "Уверенность и сила" (15 декабря 2025)
  INSERT INTO public.stream_module_techniques (
    stream_module_id,
    technique_id,
    unlock_date,
    order_num
  ) VALUES (
    v_module_healing_id,
    v_technique_abundance_id,
    '2025-12-15',
    3
  ) ON CONFLICT (stream_module_id, technique_id) DO UPDATE
    SET unlock_date = EXCLUDED.unlock_date,
        order_num = EXCLUDED.order_num;
END $$;

-- =============================================
-- 7. ПРОВЕРОЧНЫЕ ЗАПРОСЫ (ЗАКОММЕНТИРОВАНЫ)
-- =============================================

/*
-- Посмотреть расписание техник для модуля "Исцеление"
SELECT
  sm.name as module_name,
  t.title as technique_title,
  smt.unlock_date,
  CASE
    WHEN smt.unlock_date <= CURRENT_DATE THEN '✓ Открыта'
    ELSE format('🔒 Откроется %s', to_char(smt.unlock_date, 'DD.MM.YYYY'))
  END as status,
  smt.order_num
FROM public.stream_module_techniques smt
JOIN public.stream_modules sm ON sm.id = smt.stream_module_id
JOIN public.techniques t ON t.id = smt.technique_id
WHERE sm.name = 'Модуль Исцеление'
ORDER BY smt.order_num;

-- Посмотреть все техники во всех модулях потока "Ноябрь 2025"
SELECT
  s.name as stream_name,
  sm.name as module_name,
  t.title as technique_title,
  smt.unlock_date,
  smt.order_num
FROM public.stream_module_techniques smt
JOIN public.stream_modules sm ON sm.id = smt.stream_module_id
JOIN public.streams s ON s.id = sm.stream_id
JOIN public.techniques t ON t.id = smt.technique_id
WHERE s.name = 'Поток Ноябрь 2025'
ORDER BY sm.order_num, smt.order_num;
*/
