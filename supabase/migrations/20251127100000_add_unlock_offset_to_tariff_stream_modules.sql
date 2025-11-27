-- Migration: Add unlock_offset_days to tariff_stream_modules
-- Date: 2025-11-27
-- Description: Добавляем поле unlock_offset_days для модулей тарифа - с какого дня от начала потока модуль доступен

-- Добавляем колонку
ALTER TABLE public.tariff_stream_modules
ADD COLUMN IF NOT EXISTS unlock_offset_days INTEGER DEFAULT 0;

COMMENT ON COLUMN public.tariff_stream_modules.unlock_offset_days IS 'С какого дня от начала потока модуль становится доступен (0 = сразу)';

-- Обновляем функцию get_tariff_configuration чтобы возвращала unlock_offset_days для модулей
DROP FUNCTION IF EXISTS public.get_tariff_configuration(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_tariff_configuration(
  p_stream_id UUID,
  p_tariff_id UUID
)
RETURNS TABLE(
  stream_module_id UUID,
  module_name TEXT,
  module_color TEXT,
  module_order INT,
  access_duration_days INT,
  unlock_offset_days INT,
  tariff_stream_module_id UUID,
  material_id UUID,
  technique_name TEXT,
  technique_order INT,
  technique_unlock_offset_days INT,
  technique_active_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id as stream_module_id,
    sm.name::TEXT as module_name,
    sm.color::TEXT as module_color,
    sm.order_num as module_order,
    tsm.access_duration_days,
    tsm.unlock_offset_days,
    tsm.id as tariff_stream_module_id,
    tmm.material_id,
    m.name::TEXT as technique_name,
    tmm.order_num as technique_order,
    tmm.unlock_offset_days as technique_unlock_offset_days,
    tmm.active_days as technique_active_days
  FROM stream_tariffs st
  JOIN tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id
  JOIN stream_modules sm ON sm.id = tsm.stream_module_id
  LEFT JOIN tariff_module_materials tmm ON tmm.tariff_stream_module_id = tsm.id
  LEFT JOIN materials m ON m.id = tmm.material_id
  WHERE st.stream_id = p_stream_id AND st.tariff_id = p_tariff_id
  ORDER BY tsm.order_num, tmm.order_num;
END;
$$;

COMMENT ON FUNCTION public.get_tariff_configuration(uuid, uuid) IS 'Возвращает конфигурацию тарифа для потока с модулями и материалами. Включает unlock_offset_days для модулей.';

GRANT EXECUTE ON FUNCTION public.get_tariff_configuration(uuid, uuid) TO authenticated;

-- Информация
DO $$
BEGIN
  RAISE NOTICE 'Добавлено поле unlock_offset_days в tariff_stream_modules';
  RAISE NOTICE 'Обновлена функция get_tariff_configuration';
END $$;
