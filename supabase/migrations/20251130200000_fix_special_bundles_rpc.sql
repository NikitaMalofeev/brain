-- Исправление RPC функции: cover_image -> cover_image_path

CREATE OR REPLACE FUNCTION get_user_special_bundle_techniques(p_user_id UUID)
RETURNS TABLE (
  technique_id UUID,
  technique_name TEXT,
  technique_cover TEXT,
  special_bundle_id UUID,
  special_bundle_name TEXT,
  technique_position INTEGER,
  delay_days INTEGER,
  unlock_date DATE,
  is_time_unlocked BOOLEAN,
  is_paid BOOLEAN,
  is_available BOOLEAN,
  previous_technique_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stream_start_date DATE;
BEGIN
  -- Получаем дату начала потока пользователя
  SELECT s.start_date INTO v_stream_start_date
  FROM user_stream_enrollments use
  JOIN streams s ON s.id = use.stream_id
  WHERE use.user_id = p_user_id
  LIMIT 1;

  IF v_stream_start_date IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_tariff AS (
    -- Получаем тариф пользователя
    SELECT ut.tariff_id
    FROM user_tariffs ut
    WHERE ut.user_id = p_user_id
    LIMIT 1
  ),
  placements_with_dates AS (
    -- Получаем все размещения специальных пакетов для тарифа пользователя
    SELECT
      sbp.special_bundle_id,
      sbp.start_unlock_offset_days,
      tsm.unlock_offset_days as module_unlock_offset,
      sb.name as bundle_name
    FROM special_bundle_placements sbp
    JOIN tariff_stream_modules tsm ON tsm.id = sbp.tariff_stream_module_id
    JOIN special_bundles sb ON sb.id = sbp.special_bundle_id
    WHERE tsm.tariff_id = (SELECT tariff_id FROM user_tariff)
  ),
  techniques_with_unlock AS (
    -- Рассчитываем даты разблокировки для каждой техники
    SELECT
      sbt.technique_id,
      m.name as tech_name,
      m.cover_image_path as tech_cover,
      sbt.special_bundle_id,
      pwd.bundle_name as sb_name,
      sbt.technique_position as tech_position,
      sbt.delay_days as tech_delay_days,
      -- Дата разблокировки = дата начала потока + offset модуля + offset размещения + сумма delay предыдущих техник
      (v_stream_start_date + pwd.module_unlock_offset + pwd.start_unlock_offset_days +
        COALESCE((
          SELECT SUM(sbt2.delay_days)
          FROM special_bundle_techniques sbt2
          WHERE sbt2.special_bundle_id = sbt.special_bundle_id
            AND sbt2.technique_position < sbt.technique_position
        ), 0)
      )::DATE as calculated_unlock_date,
      -- Название предыдущей техники
      (
        SELECT m2.name
        FROM special_bundle_techniques sbt2
        JOIN materials m2 ON m2.id = sbt2.technique_id
        WHERE sbt2.special_bundle_id = sbt.special_bundle_id
          AND sbt2.technique_position = sbt.technique_position - 1
      ) as prev_technique_name
    FROM special_bundle_techniques sbt
    JOIN materials m ON m.id = sbt.technique_id
    JOIN placements_with_dates pwd ON pwd.special_bundle_id = sbt.special_bundle_id
  )
  SELECT
    twu.technique_id,
    twu.tech_name,
    twu.tech_cover,
    twu.special_bundle_id,
    twu.sb_name,
    twu.tech_position,
    twu.tech_delay_days,
    twu.calculated_unlock_date as unlock_date,
    (CURRENT_DATE >= twu.calculated_unlock_date) as is_time_unlocked,
    EXISTS (
      SELECT 1 FROM user_special_bundle_payments usbp
      WHERE usbp.user_id = p_user_id
        AND usbp.special_bundle_id = twu.special_bundle_id
        AND usbp.technique_position = twu.tech_position
    ) as is_paid,
    -- Доступна если время прошло И оплачена
    (CURRENT_DATE >= twu.calculated_unlock_date) AND EXISTS (
      SELECT 1 FROM user_special_bundle_payments usbp
      WHERE usbp.user_id = p_user_id
        AND usbp.special_bundle_id = twu.special_bundle_id
        AND usbp.technique_position = twu.tech_position
    ) as is_available,
    twu.prev_technique_name as previous_technique_name
  FROM techniques_with_unlock twu
  ORDER BY twu.special_bundle_id, twu.tech_position;
END;
$$;
