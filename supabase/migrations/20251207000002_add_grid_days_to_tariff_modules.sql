-- Добавляем поле grid_days для количества дней в сетке расписания
-- Это поле используется ТОЛЬКО для отображения сетки в админке
-- Логика доступа к модулю по-прежнему использует access_duration_days

ALTER TABLE tariff_stream_modules
ADD COLUMN IF NOT EXISTS grid_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN tariff_stream_modules.grid_days IS 'Количество дней для отображения в сетке расписания. Если NULL - используется access_duration_days. Не влияет на логику доступа.';

-- Удаляем старую функцию и создаём новую с grid_days
DROP FUNCTION IF EXISTS get_tariff_configuration(UUID, UUID);

-- Создать функцию с grid_days для модулей
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
  grid_days INT,  -- Новое поле для сетки расписания
  unlock_offset_days INT,
  tariff_module_technique_id UUID,
  technique_id UUID,
  technique_title TEXT,
  technique_unlock_offset_days INT,
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
    tsm.grid_days,  -- Добавляем grid_days
    COALESCE(tsm.unlock_offset_days, 0) as unlock_offset_days,
    tmm.id as tariff_module_technique_id,
    m.id as technique_id,
    m.name as technique_title,
    tmm.unlock_offset_days as technique_unlock_offset_days,
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
