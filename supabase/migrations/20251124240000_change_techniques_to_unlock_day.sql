-- ============================================
-- Изменение unlock_date на unlock_day
-- Теперь указываем день модуля вместо абсолютной даты
-- ============================================

-- 1. Добавляем новую колонку unlock_day
ALTER TABLE public.stream_module_techniques
ADD COLUMN IF NOT EXISTS unlock_day INT DEFAULT 1;

COMMENT ON COLUMN public.stream_module_techniques.unlock_day IS 'День модуля, когда техника становится доступной (1 = первый день)';

-- 2. Мигрируем данные из unlock_date в unlock_day
-- Рассчитываем день относительно начала потока
UPDATE public.stream_module_techniques smt
SET unlock_day = GREATEST(1, (smt.unlock_date - s.start_date)::INT + 1)
FROM public.stream_modules sm
JOIN public.streams s ON s.id = sm.stream_id
WHERE smt.stream_module_id = sm.id
  AND smt.unlock_day IS NULL;

-- 3. Удаляем старую колонку unlock_date
ALTER TABLE public.stream_module_techniques
DROP COLUMN IF EXISTS unlock_date;

-- 4. Обновляем функцию для получения расписания техник
DROP FUNCTION IF EXISTS get_module_techniques_schedule(UUID);

CREATE OR REPLACE FUNCTION get_module_techniques_schedule(
  p_stream_module_id UUID
)
RETURNS TABLE (
  id UUID,
  technique_id UUID,
  technique_title TEXT,
  unlock_day INT,
  is_unlocked BOOLEAN,
  days_until_unlock INT,
  order_num INT
) AS $$
DECLARE
  v_stream_start_date DATE;
  v_current_day INT;
BEGIN
  -- Получаем дату начала потока
  SELECT s.start_date INTO v_stream_start_date
  FROM public.stream_modules sm
  JOIN public.streams s ON s.id = sm.stream_id
  WHERE sm.id = p_stream_module_id;

  -- Вычисляем текущий день
  v_current_day := GREATEST(1, (CURRENT_DATE - v_stream_start_date)::INT + 1);

  RETURN QUERY
  SELECT
    smt.id,
    t.id as technique_id,
    t.title as technique_title,
    smt.unlock_day,
    (smt.unlock_day <= v_current_day) as is_unlocked,
    CASE
      WHEN smt.unlock_day > v_current_day THEN smt.unlock_day - v_current_day
      ELSE 0
    END as days_until_unlock,
    smt.order_num
  FROM public.stream_module_techniques smt
  JOIN public.techniques t ON t.id = smt.technique_id
  WHERE smt.stream_module_id = p_stream_module_id
  ORDER BY smt.order_num, smt.unlock_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Обновляем функцию добавления техники в модуль
CREATE OR REPLACE FUNCTION set_technique_unlock_day_in_module(
  p_stream_module_id UUID,
  p_technique_id UUID,
  p_unlock_day INT,
  p_order_num INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.stream_module_techniques (
    stream_module_id,
    technique_id,
    unlock_day,
    order_num
  ) VALUES (
    p_stream_module_id,
    p_technique_id,
    p_unlock_day,
    p_order_num
  )
  ON CONFLICT (stream_module_id, technique_id)
  DO UPDATE SET
    unlock_day = EXCLUDED.unlock_day,
    order_num = EXCLUDED.order_num,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_technique_unlock_day_in_module IS 'Установить день открытия техники в модуле потока';

-- 6. Информация
DO $$
BEGIN
  RAISE NOTICE 'Техники теперь используют unlock_day вместо unlock_date';
  RAISE NOTICE 'unlock_day = номер дня модуля (1 = первый день)';
END $$;
