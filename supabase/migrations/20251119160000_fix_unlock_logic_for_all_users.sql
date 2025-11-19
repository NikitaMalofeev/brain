-- Migration: Fix unlock logic to check dates for ALL users (not just enrolled in streams)
-- Date: 2025-11-19
-- Description: Обновление функции can_user_purchase_technique для проверки unlock_date независимо от записи в поток

-- =============================================
-- ОБНОВИТЬ ФУНКЦИЮ can_user_purchase_technique
-- =============================================
CREATE OR REPLACE FUNCTION can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_technique RECORD;
  v_earliest_unlock_date DATE;
  v_module_name TEXT;
  v_stream_name TEXT;
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
      'unlock_date', null,
      'module_name', null
    );
  END IF;

  -- Если техника бесплатная - покупать не нужно
  IF v_technique.status = 'free' THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'Техника бесплатная',
      'unlock_date', null,
      'module_name', null
    );
  END IF;

  -- Если пользователь уже имеет доступ
  IF can_user_access_technique(p_user_id, p_technique_id) THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'У вас уже есть доступ к этой технике',
      'unlock_date', null,
      'module_name', null
    );
  END IF;

  -- ============================================================
  -- НОВАЯ ЛОГИКА: ПРОВЕРКА РАСПИСАНИЯ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
  -- ============================================================

  -- Найти самую раннюю дату открытия техники в ЛЮБОМ модуле ЛЮБОГО потока
  SELECT
    smt.unlock_date,
    sm.name as module_name,
    s.name as stream_name
  INTO v_earliest_unlock_date, v_module_name, v_stream_name
  FROM public.stream_module_techniques smt
  JOIN public.stream_modules sm ON sm.id = smt.stream_module_id
  JOIN public.streams s ON s.id = sm.stream_id
  WHERE smt.technique_id = p_technique_id
    AND smt.unlock_date IS NOT NULL
  ORDER BY smt.unlock_date ASC
  LIMIT 1;

  -- Если для этой техники есть расписание в модулях
  IF v_earliest_unlock_date IS NOT NULL THEN
    -- Проверить наступила ли дата открытия
    IF CURRENT_DATE < v_earliest_unlock_date THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Техника из модуля "%s" будет доступна %s', v_module_name, to_char(v_earliest_unlock_date, 'DD.MM.YYYY')),
        'unlock_date', v_earliest_unlock_date::timestamptz,
        'module_name', v_module_name,
        'stream_name', v_stream_name
      );
    END IF;

    -- Дата наступила - можно покупать (если техника purchasable)
    IF v_technique.status = 'purchasable' THEN
      RETURN jsonb_build_object(
        'can_purchase', true,
        'reason', 'Доступна к покупке',
        'unlock_date', v_earliest_unlock_date::timestamptz,
        'module_name', v_module_name,
        'stream_name', v_stream_name
      );
    END IF;
  END IF;

  -- ============================================================
  -- СТАРАЯ ЛОГИКА: ПРОВЕРКА УСЛОВИЙ РАЗБЛОКИРОВКИ
  -- (для обратной совместимости и техник без расписания в модулях)
  -- ============================================================

  -- Если техника purchasable без условий - можно покупать
  IF v_technique.status = 'purchasable' AND v_technique.unlock_condition_type IS NULL THEN
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке',
      'unlock_date', null,
      'module_name', null
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
        'unlock_date', null,
        'module_name', null
      );
    END IF;

    -- Рассчитать дату разблокировки
    v_unlock_date := v_prerequisite_granted_at + (v_duration_days || ' days')::INTERVAL;

    -- Проверить прошло ли нужное количество дней
    IF NOW() < v_unlock_date THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Будет доступна через %s дней', CEIL(EXTRACT(EPOCH FROM (v_unlock_date - NOW())) / 86400)),
        'unlock_date', v_unlock_date,
        'module_name', null
      );
    END IF;

    -- Условие выполнено - можно покупать
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке',
      'unlock_date', v_unlock_date,
      'module_name', null
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
        'unlock_date', v_unlock_date,
        'module_name', null
      );
    END IF;

    -- Условие выполнено - можно покупать
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна к покупке',
      'unlock_date', v_unlock_date,
      'module_name', null
    );
  END IF;

  -- По умолчанию - нельзя покупать
  RETURN jsonb_build_object(
    'can_purchase', false,
    'reason', 'Техника недоступна',
    'unlock_date', null,
    'module_name', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_purchase_technique IS 'Проверяет выполнены ли условия для покупки техники (с учётом расписания модулей для ВСЕХ пользователей)';
