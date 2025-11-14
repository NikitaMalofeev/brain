-- Migration: Add Technique Access Functions
-- Date: 2025-11-14
-- Description: Функции для проверки доступа к техникам и условий разблокировки

-- 1. Функция: проверить может ли пользователь слушать технику
-- Возвращает true если:
-- - техника бесплатная (status = 'free')
-- - у пользователя есть запись в user_technique_access
-- - пользователь не гость (для бесплатных техник гости тоже могут)
CREATE OR REPLACE FUNCTION can_user_access_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_technique_status TEXT;
  v_has_access BOOLEAN;
  v_access_expires_at TIMESTAMPTZ;
BEGIN
  -- Получить статус техники
  SELECT status INTO v_technique_status
  FROM public.techniques
  WHERE id = p_technique_id;

  -- Если техника не найдена
  IF v_technique_status IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Если техника бесплатная - доступ есть у всех (включая гостей)
  IF v_technique_status = 'free' THEN
    RETURN TRUE;
  END IF;

  -- Если пользователь не указан - нет доступа
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Проверить есть ли запись о доступе
  SELECT EXISTS (
    SELECT 1
    FROM public.user_technique_access
    WHERE user_id = p_user_id
      AND technique_id = p_technique_id
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_access_technique IS 'Проверяет может ли пользователь прослушать технику';


-- 2. Функция: проверить выполнены ли условия для покупки техники
-- Возвращает JSON с информацией о возможности покупки:
-- { "can_purchase": true/false, "reason": "текст причины", "unlock_date": "дата разблокировки" }
CREATE OR REPLACE FUNCTION can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_technique RECORD;
  v_prerequisite_technique_id UUID;
  v_duration_days INT;
  v_prerequisite_granted_at TIMESTAMPTZ;
  v_unlock_date TIMESTAMPTZ;
BEGIN
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

COMMENT ON FUNCTION can_user_purchase_technique IS 'Проверяет выполнены ли условия для покупки техники';


-- 3. Функция: получить список всех техник с информацией о доступе для пользователя
-- Возвращает таблицу с полной информацией о технике + статус доступа
CREATE OR REPLACE FUNCTION get_techniques_with_access(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  audio_url TEXT,
  cover_image TEXT,
  duration_seconds INT,
  status TEXT,
  purchase_url TEXT,
  upgrade_tariff_chat_url TEXT,
  available_from_module TEXT,
  unlock_condition_type TEXT,
  unlock_condition_value JSONB,
  order_num INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Дополнительные поля о доступе
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  purchase_info JSONB,
  access_granted_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  access_source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.audio_url,
    t.cover_image,
    t.duration_seconds,
    t.status,
    t.purchase_url,
    t.upgrade_tariff_chat_url,
    t.available_from_module,
    t.unlock_condition_type,
    t.unlock_condition_value,
    t.order_num,
    t.created_at,
    t.updated_at,
    -- Проверить есть ли доступ
    can_user_access_technique(p_user_id, t.id) as has_access,
    -- Проверить можно ли купить
    (can_user_purchase_technique(p_user_id, t.id)->>'can_purchase')::BOOLEAN as can_purchase,
    -- Полная информация о покупке
    can_user_purchase_technique(p_user_id, t.id) as purchase_info,
    -- Информация о доступе из user_technique_access
    uta.granted_at as access_granted_at,
    uta.expires_at as access_expires_at,
    uta.access_source as access_source
  FROM public.techniques t
  LEFT JOIN public.user_technique_access uta
    ON uta.technique_id = t.id
    AND uta.user_id = p_user_id
    AND (uta.expires_at IS NULL OR uta.expires_at > NOW())
  ORDER BY t.order_num ASC, t.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_techniques_with_access IS 'Возвращает список всех техник с информацией о доступе пользователя';


-- 4. Функция: предоставить доступ к технике пользователю
-- Используется после покупки или при выдаче подарка/тарифного доступа
CREATE OR REPLACE FUNCTION grant_technique_access(
  p_user_id UUID,
  p_technique_id UUID,
  p_access_source TEXT DEFAULT 'purchase',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_access_id UUID;
BEGIN
  -- Проверить что access_source валидный
  IF p_access_source NOT IN ('purchase', 'tariff', 'gift', 'free') THEN
    RAISE EXCEPTION 'Invalid access_source: %', p_access_source;
  END IF;

  -- Вставить или обновить запись о доступе (UPSERT)
  INSERT INTO public.user_technique_access (
    user_id,
    technique_id,
    granted_at,
    expires_at,
    access_source
  ) VALUES (
    p_user_id,
    p_technique_id,
    NOW(),
    p_expires_at,
    p_access_source
  )
  ON CONFLICT (user_id, technique_id)
  DO UPDATE SET
    granted_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    access_source = EXCLUDED.access_source
  RETURNING id INTO v_access_id;

  RETURN v_access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION grant_technique_access IS 'Предоставляет пользователю доступ к технике';


-- 5. Функция: отозвать доступ к технике
CREATE OR REPLACE FUNCTION revoke_technique_access(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM public.user_technique_access
  WHERE user_id = p_user_id
    AND technique_id = p_technique_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_technique_access IS 'Отзывает доступ пользователя к технике';
