-- Migration: Add advanced unlock conditions for material dependencies
-- Date: 2025-11-26
-- Description: Расширение системы unlock_condition для поддержки сложных зависимостей между техниками

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS can_user_purchase_technique(UUID, UUID);

-- Расширяем constraint для unlock_condition_type
ALTER TABLE materials
  DROP CONSTRAINT IF EXISTS materials_unlock_condition_type_check;

ALTER TABLE materials
  ADD CONSTRAINT materials_unlock_condition_type_check
  CHECK (unlock_condition_type IN (
    'after_material',                      -- существующий: техника после другой техники
    'after_duration',                      -- существующий: техника через N дней с регистрации
    'requires_purchase_and_material',      -- НОВЫЙ: нужна покупка + доступ к другой технике
    'requires_material_with_duration'      -- НОВЫЙ: другая техника + время ожидания
  ));

-- Обновляем функцию can_user_purchase_technique с новой логикой
CREATE OR REPLACE FUNCTION can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_technique materials%ROWTYPE;
  v_has_access BOOLEAN;
  v_unlock_date DATE;
  v_required_material_access RECORD;
  v_result JSONB;
  v_user_registration_date DATE;
  v_tariff_unlock_day INTEGER;
  v_stream_start_date DATE;
BEGIN
  -- Получаем технику
  SELECT * INTO v_technique FROM materials WHERE id = p_technique_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'technique_not_found'
    );
  END IF;

  -- Проверяем есть ли уже доступ
  SELECT EXISTS(
    SELECT 1 FROM user_material_access
    WHERE user_id = p_user_id
    AND material_id = p_technique_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'already_has_access'
    );
  END IF;

  -- ========== НОВАЯ ЛОГИКА 1: requires_purchase_and_material ==========
  -- Техника требует доступ к другой технике + дополнительную оплату
  IF v_technique.unlock_condition_type = 'requires_purchase_and_material' THEN
    DECLARE
      v_required_material_id UUID;
      v_required_material_name TEXT;
      v_purchase_price NUMERIC;
    BEGIN
      v_required_material_id := (v_technique.unlock_condition_value->>'required_material_id')::UUID;
      v_purchase_price := (v_technique.unlock_condition_value->>'purchase_price')::NUMERIC;

      -- Получаем название требуемой техники
      SELECT name INTO v_required_material_name
      FROM materials
      WHERE id = v_required_material_id;

      -- Проверяем доступ к требуемой технике
      SELECT EXISTS(
        SELECT 1 FROM user_material_access
        WHERE user_id = p_user_id
        AND material_id = v_required_material_id
        AND (expires_at IS NULL OR expires_at > NOW())
      ) INTO v_has_access;

      IF NOT v_has_access THEN
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', 'requires_material',
          'required_material_id', v_required_material_id,
          'required_material_name', v_required_material_name,
          'message', 'Для покупки этой техники необходим доступ к технике "' || v_required_material_name || '"'
        );
      END IF;

      -- Если есть доступ к требуемой технике - можно покупать
      RETURN jsonb_build_object(
        'can_purchase', true,
        'reason', 'available_for_purchase',
        'requires_payment', true,
        'price', v_purchase_price,
        'message', 'Техника доступна для покупки за ' || v_purchase_price || ' ₽'
      );
    END;
  END IF;

  -- ========== НОВАЯ ЛОГИКА 2: requires_material_with_duration ==========
  -- Техника требует доступ к другой технике + время ожидания
  IF v_technique.unlock_condition_type = 'requires_material_with_duration' THEN
    DECLARE
      v_required_material_id UUID;
      v_duration_days INTEGER;
      v_material_granted_at TIMESTAMPTZ;
      v_required_material_name TEXT;
    BEGIN
      v_required_material_id := (v_technique.unlock_condition_value->>'required_material_id')::UUID;
      v_duration_days := (v_technique.unlock_condition_value->>'duration_days')::INTEGER;

      -- Получаем название требуемой техники
      SELECT name INTO v_required_material_name
      FROM materials
      WHERE id = v_required_material_id;

      -- Получаем дату доступа к требуемой технике
      SELECT granted_at INTO v_material_granted_at
      FROM user_material_access
      WHERE user_id = p_user_id
      AND material_id = v_required_material_id
      AND (expires_at IS NULL OR expires_at > NOW());

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', 'requires_material',
          'required_material_id', v_required_material_id,
          'required_material_name', v_required_material_name,
          'message', 'Для доступа к этой технике необходим доступ к технике "' || v_required_material_name || '"'
        );
      END IF;

      -- Вычисляем дату разблокировки
      v_unlock_date := (v_material_granted_at + (v_duration_days || ' days')::INTERVAL)::DATE;

      IF CURRENT_DATE >= v_unlock_date THEN
        RETURN jsonb_build_object(
          'can_purchase', true,
          'reason', 'available_for_purchase',
          'message', 'Техника доступна для покупки'
        );
      ELSE
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', 'time_locked',
          'unlock_date', v_unlock_date,
          'days_remaining', v_unlock_date - CURRENT_DATE,
          'required_material_name', v_required_material_name,
          'message', 'Техника будет доступна через ' || (v_unlock_date - CURRENT_DATE) || ' дн. после получения "' || v_required_material_name || '"'
        );
      END IF;
    END;
  END IF;

  -- ========== СУЩЕСТВУЮЩАЯ ЛОГИКА: Проверка через tariff_module_materials ==========
  -- Проверяем, назначена ли техника пользователю через тариф
  SELECT
    tmm.unlock_offset_days
  INTO v_tariff_unlock_day
  FROM user_tariffs ut
  JOIN stream_tariffs st ON st.tariff_id = ut.tariff_id
  JOIN user_stream_enrollments use ON use.stream_id = st.stream_id AND use.user_id = ut.user_id
  JOIN tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id
  JOIN tariff_module_materials tmm ON tmm.tariff_stream_module_id = tsm.id
  WHERE ut.user_id = p_user_id
    AND ut.is_active = true
    AND tmm.material_id = p_technique_id
  ORDER BY tmm.unlock_offset_days ASC
  LIMIT 1;

  IF FOUND THEN
    -- Получаем дату начала потока
    SELECT use.enrolled_at::DATE INTO v_stream_start_date
    FROM user_stream_enrollments use
    JOIN stream_tariffs st ON st.stream_id = use.stream_id
    JOIN user_tariffs ut ON ut.tariff_id = st.tariff_id AND ut.user_id = use.user_id
    WHERE use.user_id = p_user_id
      AND ut.is_active = true
    LIMIT 1;

    -- Вычисляем дату разблокировки
    v_unlock_date := v_stream_start_date + (v_tariff_unlock_day - 1);

    IF CURRENT_DATE >= v_unlock_date THEN
      RETURN jsonb_build_object(
        'can_purchase', true,
        'reason', 'unlocked_by_tariff',
        'unlock_day', v_tariff_unlock_day,
        'stream_start_date', v_stream_start_date
      );
    ELSE
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', 'locked_by_tariff',
        'unlock_date', v_unlock_date,
        'unlock_day', v_tariff_unlock_day,
        'days_remaining', v_unlock_date - CURRENT_DATE
      );
    END IF;
  END IF;

  -- ========== СУЩЕСТВУЮЩАЯ ЛОГИКА: after_material ==========
  IF v_technique.unlock_condition_type = 'after_material' THEN
    DECLARE
      v_prev_technique_id UUID;
      v_prev_granted_at TIMESTAMPTZ;
      v_wait_days INTEGER;
    BEGIN
      v_prev_technique_id := (v_technique.unlock_condition_value->>'technique_id')::UUID;
      v_wait_days := COALESCE((v_technique.unlock_condition_value->>'duration_days')::INTEGER, 0);

      SELECT granted_at INTO v_prev_granted_at
      FROM user_material_access
      WHERE user_id = p_user_id
        AND material_id = v_prev_technique_id
        AND (expires_at IS NULL OR expires_at > NOW());

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', 'requires_previous_technique',
          'required_technique_id', v_prev_technique_id
        );
      END IF;

      v_unlock_date := (v_prev_granted_at + (v_wait_days || ' days')::INTERVAL)::DATE;

      IF CURRENT_DATE >= v_unlock_date THEN
        RETURN jsonb_build_object('can_purchase', true, 'reason', 'unlocked_after_previous');
      ELSE
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', 'time_locked_after_previous',
          'unlock_date', v_unlock_date,
          'days_remaining', v_unlock_date - CURRENT_DATE
        );
      END IF;
    END;
  END IF;

  -- ========== СУЩЕСТВУЮЩАЯ ЛОГИКА: after_duration ==========
  IF v_technique.unlock_condition_type = 'after_duration' THEN
    DECLARE
      v_wait_days INTEGER;
    BEGIN
      v_wait_days := (v_technique.unlock_condition_value->>'duration_days')::INTEGER;

      SELECT created_at::DATE INTO v_user_registration_date
      FROM users
      WHERE id = p_user_id;

      v_unlock_date := v_user_registration_date + v_wait_days;

      IF CURRENT_DATE >= v_unlock_date THEN
        RETURN jsonb_build_object('can_purchase', true, 'reason', 'unlocked_by_duration');
      ELSE
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', 'time_locked_by_duration',
          'unlock_date', v_unlock_date,
          'days_remaining', v_unlock_date - CURRENT_DATE
        );
      END IF;
    END;
  END IF;

  -- ========== DEFAULT: Техника доступна для покупки ==========
  IF v_technique.status = 'purchasable' THEN
    RETURN jsonb_build_object('can_purchase', true, 'reason', 'purchasable');
  END IF;

  -- Если есть purchase_url и статус locked (для студентов)
  IF v_technique.status = 'locked' AND v_technique.purchase_url IS NOT NULL THEN
    RETURN jsonb_build_object('can_purchase', true, 'reason', 'has_purchase_url');
  END IF;

  -- По умолчанию - нельзя купить
  RETURN jsonb_build_object(
    'can_purchase', false,
    'reason', 'not_available',
    'status', v_technique.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_purchase_technique IS 'Проверяет может ли пользователь купить/получить доступ к технике с учетом всех зависимостей';

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Система продвинутых условий разблокировки создана:';
  RAISE NOTICE '   - requires_purchase_and_material: техника + оплата';
  RAISE NOTICE '   - requires_material_with_duration: техника + время ожидания';
  RAISE NOTICE '   - can_user_purchase_technique обновлена';
END $$;
