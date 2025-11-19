-- Migration: Update purchase logic for students
-- Date: 2025-11-18
-- Description: Разрешить ученикам покупать locked техники, если есть purchase_url

DROP FUNCTION IF EXISTS can_user_purchase_technique(UUID, UUID);

CREATE OR REPLACE FUNCTION can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_technique RECORD;
  v_user_role TEXT;
  v_prerequisite_technique_id UUID;
  v_duration_days INT;
  v_prerequisite_granted_at TIMESTAMPTZ;
  v_unlock_date TIMESTAMPTZ;
BEGIN
  -- Получить роль пользователя
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  -- Получить данные техники
  SELECT *
  INTO v_technique
  FROM public.techniques
  WHERE id = p_technique_id;

  -- Если техника не найдена
  IF v_technique.id IS NULL THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'Техника не найдена',
      'unlock_date', null
    );
  END IF;

  -- Если техника бесплатная - покупать не нужно
  IF v_technique.status = 'free' THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'Техника бесплатная',
      'unlock_date', null
    );
  END IF;

  -- Если пользователь уже имеет доступ
  IF can_user_access_technique(p_user_id, p_technique_id) THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'У вас уже есть доступ к этой технике',
      'unlock_date', null
    );
  END IF;

  -- Если техника purchasable без условий - можно покупать
  IF v_technique.status = 'purchasable' AND v_technique.unlock_condition_type IS NULL THEN
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке',
      'unlock_date', null
    );
  END IF;

  -- НОВАЯ ЛОГИКА: Если пользователь - ученик (не гость) и у техники есть purchase_url,
  -- разрешаем покупку даже если статус 'locked'
  IF v_user_role = 'user' AND v_technique.status = 'locked' AND v_technique.purchase_url IS NOT NULL THEN
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке (вне вашего тарифа)',
      'unlock_date', null
    );
  END IF;

  -- Если техника locked и есть условие after_technique
  IF v_technique.status = 'locked' AND v_technique.unlock_condition_type = 'after_technique' THEN
    -- Извлечь ID предварительной техники и количество дней
    v_prerequisite_technique_id := (v_technique.unlock_condition_value->>'technique_id')::UUID;
    v_duration_days := (v_technique.unlock_condition_value->>'duration_days')::INT;

    -- Проверить есть ли доступ к предварительной технике
    SELECT granted_at INTO v_prerequisite_granted_at
    FROM public.user_technique_access
    WHERE user_id = p_user_id
      AND technique_id = v_prerequisite_technique_id
      AND (expires_at IS NULL OR expires_at > NOW());

    -- Если нет доступа к предварительной технике
    IF v_prerequisite_granted_at IS NULL THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', 'Сначала получите доступ к предыдущей технике',
        'unlock_date', null
      );
    END IF;

    -- Рассчитать дату разблокировки
    v_unlock_date := v_prerequisite_granted_at + (v_duration_days || ' days')::INTERVAL;

    -- Проверить прошло ли нужное количество дней
    IF NOW() < v_unlock_date THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Будет доступна через %s дней', CEIL(EXTRACT(EPOCH FROM (v_unlock_date - NOW())) / 86400)),
        'unlock_date', v_unlock_date
      );
    END IF;

    -- Условие выполнено - можно покупать
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке',
      'unlock_date', v_unlock_date
    );
  END IF;

  -- Если техника locked и есть условие after_duration
  IF v_technique.status = 'locked' AND v_technique.unlock_condition_type = 'after_duration' THEN
    v_duration_days := (v_technique.unlock_condition_value->>'duration_days')::INT;

    -- Получить дату регистрации пользователя
    SELECT created_at INTO v_prerequisite_granted_at
    FROM public.users
    WHERE id = p_user_id;

    -- Рассчитать дату разблокировки
    v_unlock_date := v_prerequisite_granted_at + (v_duration_days || ' days')::INTERVAL;

    -- Проверить прошло ли нужное количество дней
    IF NOW() < v_unlock_date THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Будет доступна через %s дней', CEIL(EXTRACT(EPOCH FROM (v_unlock_date - NOW())) / 86400)),
        'unlock_date', v_unlock_date
      );
    END IF;

    -- Условие выполнено - можно покупать
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке',
      'unlock_date', v_unlock_date
    );
  END IF;

  -- По умолчанию - нельзя покупать
  RETURN jsonb_build_object(
    'can_purchase', false,
    'reason', 'Техника недоступна',
    'unlock_date', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_purchase_technique IS 'Проверяет выполнены ли условия для покупки техники. Ученики могут покупать locked техники с purchase_url.';
