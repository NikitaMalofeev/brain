-- Migration: First technique in special bundle is free by default
-- Date: 2025-12-05
-- Description: Первая техника (position = 1) в спец.пакете бесплатная автоматически

DROP FUNCTION IF EXISTS get_user_special_bundle_techniques(UUID);

CREATE OR REPLACE FUNCTION get_user_special_bundle_techniques(p_user_id UUID)
RETURNS TABLE (
  technique_id UUID,
  technique_name TEXT,
  technique_description TEXT,
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
  v_stream_id UUID;
  v_tariff_id UUID;
  v_stream_tariff_id UUID;
BEGIN
  -- Получаем stream_id и дату начала потока пользователя
  SELECT use.stream_id, s.start_date INTO v_stream_id, v_stream_start_date
  FROM user_stream_enrollments use
  JOIN streams s ON s.id = use.stream_id
  WHERE use.user_id = p_user_id
  LIMIT 1;

  IF v_stream_start_date IS NULL OR v_stream_id IS NULL THEN
    RETURN;
  END IF;

  -- Получаем tariff_id пользователя
  SELECT ut.tariff_id INTO v_tariff_id
  FROM user_tariffs ut
  WHERE ut.user_id = p_user_id
  LIMIT 1;

  IF v_tariff_id IS NULL THEN
    RETURN;
  END IF;

  -- Получаем stream_tariff_id
  SELECT st.id INTO v_stream_tariff_id
  FROM stream_tariffs st
  WHERE st.stream_id = v_stream_id AND st.tariff_id = v_tariff_id
  LIMIT 1;

  IF v_stream_tariff_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH placements_with_dates AS (
    -- Получаем все размещения специальных пакетов для тарифа пользователя
    SELECT
      sbp.special_bundle_id,
      sbp.start_unlock_offset_days,
      COALESCE(tsm.unlock_offset_days, 0) as module_unlock_offset,
      sb.name as bundle_name
    FROM special_bundle_placements sbp
    JOIN tariff_stream_modules tsm ON tsm.id = sbp.tariff_stream_module_id
    JOIN special_bundles sb ON sb.id = sbp.special_bundle_id
    WHERE tsm.stream_tariff_id = v_stream_tariff_id
  ),
  techniques_with_unlock AS (
    -- Рассчитываем даты разблокировки для каждой техники
    SELECT
      sbt.technique_id,
      m.name as tech_name,
      m.description as tech_description,
      m.cover_image_path as tech_cover,
      sbt.special_bundle_id,
      pwd.bundle_name as sb_name,
      sbt.technique_position as tech_position,
      sbt.delay_days as tech_delay_days,
      -- Дата разблокировки = дата начала потока + offset модуля + offset размещения + сумма delay предыдущих техник
      (v_stream_start_date + pwd.module_unlock_offset + pwd.start_unlock_offset_days +
        COALESCE((
          SELECT SUM(sbt2.delay_days)::INTEGER
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
    twu.tech_description,
    twu.tech_cover,
    twu.special_bundle_id,
    twu.sb_name,
    twu.tech_position,
    twu.tech_delay_days,
    twu.calculated_unlock_date as unlock_date,
    (CURRENT_DATE >= twu.calculated_unlock_date) as is_time_unlocked,
    -- ИСПРАВЛЕНО: Первая техника (position = 1) всегда считается оплаченной
    CASE
      WHEN twu.tech_position = 1 THEN true
      ELSE EXISTS (
        SELECT 1 FROM user_special_bundle_payments usbp
        WHERE usbp.user_id = p_user_id
          AND usbp.special_bundle_id = twu.special_bundle_id
          AND usbp.technique_position = twu.tech_position
      )
    END as is_paid,
    -- ИСПРАВЛЕНО: Доступна если время прошло И (оплачена ИЛИ это первая техника)
    CASE
      WHEN twu.tech_position = 1 THEN (CURRENT_DATE >= twu.calculated_unlock_date)
      ELSE (CURRENT_DATE >= twu.calculated_unlock_date) AND EXISTS (
        SELECT 1 FROM user_special_bundle_payments usbp
        WHERE usbp.user_id = p_user_id
          AND usbp.special_bundle_id = twu.special_bundle_id
          AND usbp.technique_position = twu.tech_position
      )
    END as is_available,
    twu.prev_technique_name as previous_technique_name
  FROM techniques_with_unlock twu
  ORDER BY twu.special_bundle_id, twu.tech_position;
END;
$$;

COMMENT ON FUNCTION get_user_special_bundle_techniques(UUID) IS
'Возвращает техники из специальных пакетов для пользователя.
ИСПРАВЛЕНО: Первая техника (position = 1) бесплатная по умолчанию - is_paid и is_available = true без записи в user_special_bundle_payments.';
