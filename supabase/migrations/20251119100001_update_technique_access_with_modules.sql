-- Migration: Update Technique Access Functions with Module Support
-- Date: 2025-11-19
-- Description: Обновление функций проверки доступа к техникам с учётом расписания в модулях потоков

-- =============================================
-- 1. ОБНОВИТЬ ФУНКЦИЮ can_user_purchase_technique
-- =============================================
CREATE OR REPLACE FUNCTION can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_technique RECORD;
  v_user_stream_id UUID;
  v_module_unlock_date DATE;
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

  -- ============================================================
  -- НОВАЯ ЛОГИКА: ПРОВЕРКА РАСПИСАНИЯ В МОДУЛЯХ ПОТОКА
  -- ============================================================

  -- Получить поток пользователя
  SELECT stream_id INTO v_user_stream_id
  FROM public.user_stream_enrollments
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Если у пользователя есть поток, проверяем расписание в модулях
  IF v_user_stream_id IS NOT NULL THEN
    -- Найти дату открытия техники в любом модуле потока пользователя
    SELECT smt.unlock_date INTO v_module_unlock_date
    FROM public.stream_module_techniques smt
    JOIN public.stream_modules sm ON sm.id = smt.stream_module_id
    WHERE sm.stream_id = v_user_stream_id
      AND smt.technique_id = p_technique_id
    ORDER BY smt.unlock_date ASC
    LIMIT 1;

    -- Если для этой техники есть расписание в модулях потока
    IF v_module_unlock_date IS NOT NULL THEN
      -- Проверить наступила ли дата открытия
      IF CURRENT_DATE < v_module_unlock_date THEN
        RETURN jsonb_build_object(
          'can_purchase', false,
          'reason', format('Будет доступна %s', to_char(v_module_unlock_date, 'DD.MM.YYYY')),
          'unlock_date', v_module_unlock_date::timestamptz
        );
      END IF;

      -- Дата наступила - можно покупать (если техника purchasable)
      IF v_technique.status = 'purchasable' THEN
        RETURN jsonb_build_object(
          'can_purchase', true,
          'reason', 'Доступна к покупке',
          'unlock_date', v_module_unlock_date::timestamptz
        );
      END IF;
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

COMMENT ON FUNCTION can_user_purchase_technique IS 'Проверяет выполнены ли условия для покупки техники (с учётом расписания в модулях потока)';


-- =============================================
-- 2. ФУНКЦИЯ: Получить все техники пользователя с учётом модулей
-- =============================================
CREATE OR REPLACE FUNCTION get_user_techniques_with_schedule(
  p_user_id UUID
)
RETURNS TABLE (
  technique_id UUID,
  technique_title TEXT,
  technique_description TEXT,
  audio_url TEXT,
  cover_image TEXT,
  duration_seconds INT,
  status TEXT,
  available_from_module TEXT,
  unlock_date DATE,
  is_unlocked BOOLEAN,
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  purchase_info JSONB
) AS $$
DECLARE
  v_user_stream_id UUID;
BEGIN
  -- Получить поток пользователя
  SELECT stream_id INTO v_user_stream_id
  FROM public.user_stream_enrollments
  WHERE user_id = p_user_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    t.id as technique_id,
    t.title as technique_title,
    t.description as technique_description,
    t.audio_url,
    t.cover_image,
    t.duration_seconds,
    t.status,
    t.available_from_module,
    smt.unlock_date,
    (smt.unlock_date IS NULL OR smt.unlock_date <= CURRENT_DATE) as is_unlocked,
    can_user_access_technique(p_user_id, t.id) as has_access,
    (can_user_purchase_technique(p_user_id, t.id)->>'can_purchase')::BOOLEAN as can_purchase,
    can_user_purchase_technique(p_user_id, t.id) as purchase_info
  FROM public.techniques t
  LEFT JOIN public.stream_module_techniques smt
    ON smt.technique_id = t.id
    AND smt.stream_module_id IN (
      SELECT sm.id
      FROM public.stream_modules sm
      WHERE sm.stream_id = v_user_stream_id
    )
  ORDER BY smt.unlock_date NULLS LAST, t.order_num, t.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_techniques_with_schedule IS 'Получить все техники с учётом расписания в модулях потока пользователя';


-- =============================================
-- 3. ТЕСТОВЫЕ ЗАПРОСЫ (ЗАКОММЕНТИРОВАНЫ)
-- =============================================

/*
-- Создать тестового пользователя и записать его в поток
DO $$
DECLARE
  v_test_user_id UUID := '99999999-9999-9999-9999-999999999999';
  v_stream_id UUID := '30000000-0000-0000-0000-000000000001';
BEGIN
  -- Создать пользователя если не существует
  INSERT INTO public.users (id, telegram_id, first_name, role)
  VALUES (v_test_user_id, 'test123', 'Тестовый пользователь', 'student')
  ON CONFLICT (telegram_id) DO NOTHING;

  -- Записать в поток
  INSERT INTO public.user_stream_enrollments (user_id, stream_id)
  VALUES (v_test_user_id, v_stream_id)
  ON CONFLICT (user_id, stream_id) DO NOTHING;
END $$;

-- Проверить доступность техник для тестового пользователя
SELECT * FROM get_user_techniques_with_schedule('99999999-9999-9999-9999-999999999999');

-- Проверить конкретную технику "Медитация изобилия"
SELECT
  can_user_purchase_technique(
    '99999999-9999-9999-9999-999999999999',
    '701d0dd9-76a3-4a16-ba57-62d8f1b27f9c'
  ) as purchase_info;
*/
