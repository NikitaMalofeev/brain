-- Migration: Add module unlock_offset_days to get_tariff_configuration
-- Date: 2025-11-27
-- Description: Добавить unlock_offset_days для модулей в функцию get_tariff_configuration

-- Удалить старую функцию
DROP FUNCTION IF EXISTS get_tariff_configuration(uuid, uuid);

-- Создать функцию с unlock_offset_days для модулей
CREATE OR REPLACE FUNCTION get_tariff_configuration(
  p_stream_id UUID,
  p_tariff_id UUID
)
RETURNS TABLE (
  stream_tariff_id UUID,
  tariff_stream_module_id UUID,
  module_id UUID,
  module_name TEXT,
  module_order_num INT,
  access_duration_days INT,
  unlock_offset_days INT,  -- Это unlock_offset_days для МОДУЛЯ
  tariff_module_technique_id UUID,
  technique_id UUID,
  technique_title TEXT,
  technique_unlock_offset_days INT,  -- Переименовано для ясности - это для техники
  technique_order_num INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id as stream_tariff_id,
    tsm.id as tariff_stream_module_id,
    sm.id as module_id,
    sm.name as module_name,
    tsm.order_num as module_order_num,
    tsm.access_duration_days,
    COALESCE(tsm.unlock_offset_days, 0) as unlock_offset_days,  -- unlock_offset_days модуля
    tmm.id as tariff_module_technique_id,
    m.id as technique_id,
    m.name as technique_title,
    tmm.unlock_offset_days as technique_unlock_offset_days,  -- unlock_offset_days техники
    tmm.order_num as technique_order_num
  FROM stream_tariffs st
  JOIN tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id
  JOIN stream_modules sm ON sm.id = tsm.stream_module_id
  LEFT JOIN tariff_module_materials tmm ON tmm.tariff_stream_module_id = tsm.id
  LEFT JOIN materials m ON m.id = tmm.material_id
  WHERE st.stream_id = p_stream_id AND st.tariff_id = p_tariff_id
  ORDER BY tsm.order_num, tmm.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tariff_configuration IS
'Получает конфигурацию тарифа для потока с материалами модулей.
unlock_offset_days - с какого дня потока модуль доступен.
technique_unlock_offset_days - с какого дня потока материал доступен.';

DO $$
BEGIN
  RAISE NOTICE 'Функция get_tariff_configuration обновлена:';
  RAISE NOTICE '  - Добавлено unlock_offset_days для модулей';
  RAISE NOTICE '  - technique_unlock_offset_days для техник';
END $$;
