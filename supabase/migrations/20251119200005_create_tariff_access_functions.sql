  -- Migration: Create SQL functions for tariff-based access
  -- Date: 2025-11-19
  -- Description: Функции для получения техник пользователя по тарифу

  -- =============================================
  -- 1. ФУНКЦИЯ: Получить техники пользователя по тарифу
  -- =============================================
  CREATE OR REPLACE FUNCTION get_user_techniques_by_tariff(p_user_id UUID)
  RETURNS TABLE (
    technique_id UUID,
    technique_title TEXT,
    technique_description TEXT,
    audio_url TEXT,
    cover_image TEXT,
    duration_seconds INT,
    status TEXT,
    module_id UUID,
    module_name TEXT,
    module_access_expires_at TIMESTAMPTZ,
    is_module_expired BOOLEAN,
    is_module_accessible BOOLEAN,
    technique_unlock_date TIMESTAMPTZ,
    is_technique_unlocked BOOLEAN,
    has_technique_access BOOLEAN
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      t.id as technique_id,
      t.title as technique_title,
      t.description as technique_description,
      t.audio_url,
      t.cover_image,
      t.duration_seconds,
      t.status,
      sm.id as module_id,
      sm.name as module_name,
      uma.expires_at as module_access_expires_at,
      -- Модуль истёк если expires_at не NULL и меньше текущего времени
      (uma.expires_at IS NOT NULL AND uma.expires_at < NOW()) as is_module_expired,
      -- Модуль доступен если expires_at IS NULL или больше текущего времени
      (uma.expires_at IS NULL OR uma.expires_at > NOW()) as is_module_accessible,
      -- Дата открытия техники = granted_at + unlock_offset_days
      uma.granted_at + (tmt.unlock_offset_days || ' days')::INTERVAL as technique_unlock_date,
      -- Техника разблокирована если модуль доступен И прошло unlock_offset_days
      (uma.expires_at IS NULL OR uma.expires_at > NOW())
        AND (uma.granted_at + (tmt.unlock_offset_days || ' days')::INTERVAL <= NOW()) as is_technique_unlocked,
      -- Есть ли прямой доступ к технике (через user_technique_access)
      can_user_access_technique(p_user_id, t.id) as has_technique_access
    FROM users u
    -- Получить активный тариф пользователя
    JOIN user_tariffs ut ON ut.user_id = u.id AND ut.is_active = true
    -- Получить поток пользователя
    JOIN user_stream_enrollments use ON use.user_id = u.id
    -- Связь тарифа с потоком
    JOIN stream_tariffs st ON st.stream_id = use.stream_id AND st.tariff_id = ut.tariff_id
    -- Модули в тарифе
    JOIN tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id
    JOIN stream_modules sm ON sm.id = tsm.stream_module_id
    -- Техники в модуле
    JOIN tariff_module_techniques tmt ON tmt.tariff_stream_module_id = tsm.id
    JOIN techniques t ON t.id = tmt.technique_id
    -- Доступ пользователя к модулю
    LEFT JOIN user_module_access uma ON uma.user_id = u.id AND uma.stream_module_id = sm.id
    WHERE u.id = p_user_id
    ORDER BY tsm.order_num, tmt.order_num;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  COMMENT ON FUNCTION get_user_techniques_by_tariff IS 'Возвращает все техники доступные пользователю по его тарифу с информацией о доступе';

  -- =============================================
  -- 2. ФУНКЦИЯ: Получить standalone техники
  -- =============================================
  CREATE OR REPLACE FUNCTION get_standalone_techniques()
  RETURNS TABLE (
    technique_id UUID,
    technique_title TEXT,
    technique_description TEXT,
    audio_url TEXT,
    cover_image TEXT,
    duration_seconds INT,
    status TEXT,
    purchase_url TEXT,
    order_num INT
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      t.id as technique_id,
      t.title as technique_title,
      t.description as technique_description,
      t.audio_url,
      t.cover_image,
      t.duration_seconds,
      t.status,
      t.purchase_url,
      t.order_num
    FROM techniques t
    WHERE t.is_standalone = true
    ORDER BY t.order_num ASC, t.created_at ASC;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  COMMENT ON FUNCTION get_standalone_techniques IS 'Возвращает все standalone техники (доступные к покупке отдельно)';

  -- =============================================
  -- 3. ФУНКЦИЯ: Получить конфигурацию тарифа для потока
  -- =============================================
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

  COMMENT ON FUNCTION get_tariff_configuration IS 'Возвращает полную конфигурацию тарифа для потока (модули и техники)';
