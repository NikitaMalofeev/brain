-- Migration: Fix get_tariff_configuration to return tariff_stream_module_id
-- Date: 2025-11-19
-- Description: Добавление tariff_stream_module_id в возвращаемые данные функции

-- Удалить старую функцию
DROP FUNCTION IF EXISTS get_tariff_configuration(uuid, uuid);

-- Создать функцию с правильной структурой
CREATE FUNCTION get_tariff_configuration(
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
  technique_id UUID,
  technique_title TEXT,
  unlock_offset_days INT,
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
    t.id as technique_id,
    t.title as technique_title,
    tmt.unlock_offset_days,
    tmt.order_num as technique_order_num
  FROM stream_tariffs st
  JOIN tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id
  JOIN stream_modules sm ON sm.id = tsm.stream_module_id
  LEFT JOIN tariff_module_techniques tmt ON tmt.tariff_stream_module_id = tsm.id
  LEFT JOIN techniques t ON t.id = tmt.technique_id
  WHERE st.stream_id = p_stream_id AND st.tariff_id = p_tariff_id
  ORDER BY tsm.order_num, tmt.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
