-- Migration: Fix get_tariff_configuration to use renamed tables
-- Date: 2025-11-25
-- Description: Обновление функции для работы с уже переименованными таблицами
--              tariff_module_techniques → tariff_module_materials (было в миграции 20251125010000)
--              techniques → materials (было в миграции 20251125010000)

-- Удалить старую функцию
DROP FUNCTION IF EXISTS get_tariff_configuration(uuid, uuid);

-- Создать функцию с правильными именами таблиц
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
  tariff_module_technique_id UUID,
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
    tmm.id as tariff_module_technique_id,
    m.id as technique_id,
    m.name as technique_title,
    tmm.unlock_offset_days,
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

COMMENT ON FUNCTION get_tariff_configuration IS 'Получает конфигурацию тарифа для потока с материалами модулей';

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Функция get_tariff_configuration обновлена для использования:';
  RAISE NOTICE '   - tariff_module_materials (вместо tariff_module_techniques)';
  RAISE NOTICE '   - materials (вместо techniques)';
END $$;
