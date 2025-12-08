-- Migration: Simplify material statuses to free/paid/locked
-- Date: 2025-12-08
-- Description: Упрощаем статусы материалов до 3: free, paid, locked
--   - purchasable → paid
--   - default → locked
--   - Удаляем устаревшие статусы из CHECK constraint

-- =============================================
-- 1. ОБНОВИТЬ СУЩЕСТВУЮЩИЕ ДАННЫЕ
-- =============================================

-- Конвертируем purchasable → paid
UPDATE public.materials
SET status = 'paid'
WHERE status = 'purchasable';

-- Конвертируем default → locked (если есть)
UPDATE public.materials
SET status = 'locked'
WHERE status = 'default';

-- =============================================
-- 2. ОБНОВИТЬ CHECK CONSTRAINT
-- =============================================

-- Удаляем старый constraint
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_status_check;
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS techniques_status_check;

-- Создаём новый constraint только с 3 статусами
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check
  CHECK (status IS NULL OR status IN ('free', 'paid', 'locked'));

-- =============================================
-- 3. ОБНОВИТЬ DEFAULT VALUE
-- =============================================

-- Меняем default с 'purchasable' на 'paid'
ALTER TABLE public.materials ALTER COLUMN status SET DEFAULT 'paid';

-- =============================================
-- 4. ОБНОВИТЬ RPC ФУНКЦИЮ get_user_techniques_with_schedule
-- =============================================

DROP FUNCTION IF EXISTS public.get_user_techniques_with_schedule(uuid);

CREATE OR REPLACE FUNCTION public.get_user_techniques_with_schedule(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  cover_image text,
  audio_url text,
  animation_url text,
  duration_seconds integer,
  material_type text,
  status text,
  purchase_url text,
  upgrade_tariff_chat_url text,
  unlock_condition_type text,
  unlock_condition_value jsonb,
  order_num integer,
  has_access boolean,
  can_purchase boolean,
  is_unlocked boolean,
  module_id uuid,
  module_name text,
  unlock_day integer,
  active_days integer,
  user_access_source text,
  user_access_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY

  WITH
  -- Активные тарифы пользователя
  user_active_tariffs AS (
    SELECT tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true
  ),

  -- 1. Прямой доступ через user_material_access
  direct_access AS (
    SELECT
      uma.material_id,
      uma.access_source as src,
      uma.expires_at,
      uma.granted_at
    FROM public.user_material_access uma
    WHERE uma.user_id = p_user_id
      AND (uma.expires_at IS NULL OR uma.expires_at > NOW())
  ),

  -- 2. Доступ через пакеты (bundles)
  bundle_access AS (
    SELECT DISTINCT
      bt.technique_id as material_id,
      'bundle'::text as src,
      NULL::timestamptz as expires_at,
      ub.assigned_at as granted_at
    FROM public.user_bundles ub
    JOIN public.bundle_techniques bt ON bt.bundle_id = ub.bundle_id
    WHERE ub.user_id = p_user_id
  ),

  -- 3. Доступ через модули тарифа (с фильтром по активному тарифу)
  module_access AS (
    SELECT
      tmm.material_id,
      'module'::text as src,
      CASE
        WHEN tmm.active_days IS NOT NULL
        THEN uma.granted_at + (COALESCE(tmm.unlock_offset_days, 0) || ' days')::interval + (tmm.active_days || ' days')::interval
        ELSE NULL
      END as expires_at,
      uma.granted_at + (COALESCE(tmm.unlock_offset_days, 0) || ' days')::interval as unlocks_at,
      uma.granted_at,
      sm.id as mod_id,
      sm.name as mod_name,
      tmm.unlock_offset_days as unlock_offs,
      tmm.active_days as act_days,
      tmm.order_num as tmm_order_num
    FROM public.user_module_access uma
    JOIN public.stream_modules sm ON sm.id = uma.stream_module_id
    JOIN public.tariff_stream_modules tsm ON tsm.stream_module_id = sm.id
    JOIN public.stream_tariffs st ON st.id = tsm.stream_tariff_id
    JOIN public.tariff_module_materials tmm ON tmm.tariff_stream_module_id = tsm.id
    WHERE uma.user_id = p_user_id
      AND (uma.expires_at IS NULL OR uma.expires_at > NOW())
      AND st.tariff_id IN (SELECT tariff_id FROM user_active_tariffs)
  ),

  -- Объединяем все источники доступа
  all_access AS (
    SELECT material_id, src, expires_at, granted_at,
           NULL::uuid as mod_id, NULL::text as mod_name,
           NULL::int as unlock_offs, NULL::int as act_days,
           NULL::int as tmm_order_num, granted_at as unlocks_at
    FROM direct_access

    UNION ALL

    SELECT material_id, src, expires_at, granted_at,
           NULL::uuid, NULL::text, NULL::int, NULL::int, NULL::int, granted_at
    FROM bundle_access

    UNION ALL

    SELECT material_id, src, expires_at, granted_at,
           mod_id, mod_name, unlock_offs, act_days, tmm_order_num, unlocks_at
    FROM module_access
  ),

  -- Группируем доступы
  user_access AS (
    SELECT
      aa.material_id,
      -- Сравниваем только даты (без времени) для корректной разблокировки в день X
      bool_or(DATE(aa.unlocks_at) <= CURRENT_DATE) as has_acc,
      bool_or(DATE(aa.unlocks_at) > CURRENT_DATE) as has_future_acc,
      MIN(aa.expires_at) as exp_at,
      (array_agg(aa.src ORDER BY aa.granted_at DESC))[1] as src,
      (array_agg(aa.mod_id ORDER BY aa.granted_at DESC))[1] as mod_id,
      (array_agg(aa.mod_name ORDER BY aa.granted_at DESC))[1] as mod_name,
      (array_agg(aa.unlock_offs ORDER BY aa.granted_at DESC))[1] as unlock_day_val,
      (array_agg(aa.act_days ORDER BY aa.granted_at DESC))[1] as act_days_val
    FROM all_access aa
    GROUP BY aa.material_id
  )

  SELECT
    m.id,
    m.name as title,
    m.description,
    m.cover_image_path as cover_image,
    m.audio_url,
    m.animation_url,
    m.duration_seconds,
    m.material_type,
    m.status,
    m.purchase_url,
    m.upgrade_tariff_chat_url,
    m.unlock_condition_type,
    m.unlock_condition_value,
    m.order_num,
    COALESCE(ua.has_acc, false) as has_access,
    -- can_purchase: можно купить если нет доступа и статус paid или free
    -- ИЗМЕНЕНО: 'purchasable' заменён на 'paid'
    (m.status IN ('paid', 'free') AND NOT COALESCE(ua.has_acc, false)
     AND m.unlock_condition_type IS NULL) as can_purchase,
    -- is_unlocked: разблокирована ли техника
    CASE
      WHEN ua.src = 'module' THEN COALESCE(ua.has_acc, false)
      WHEN COALESCE(ua.has_acc, false) THEN true
      WHEN m.unlock_condition_type IS NOT NULL THEN false
      ELSE true
    END as is_unlocked,
    ua.mod_id as module_id,
    ua.mod_name as module_name,
    ua.unlock_day_val as unlock_day,
    ua.act_days_val as active_days,
    ua.src as user_access_source,
    ua.exp_at as user_access_expires_at
  FROM public.materials m
  LEFT JOIN user_access ua ON ua.material_id = m.id
  WHERE m.is_standalone = true
     OR ua.material_id IS NOT NULL
  ORDER BY
    CASE WHEN COALESCE(ua.has_acc, false) THEN 0 ELSE 1 END,
    m.order_num NULLS LAST;

END;
$function$;

-- Комментарий
COMMENT ON FUNCTION public.get_user_techniques_with_schedule(uuid) IS
'Возвращает техники для библиотеки. Статусы: free, paid, locked';

-- Права
GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO anon;

-- =============================================
-- 5. ОБНОВИТЬ ФУНКЦИЮ can_user_purchase_technique
-- =============================================

CREATE OR REPLACE FUNCTION public.can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_technique RECORD;
  v_has_access BOOLEAN := false;
  v_prerequisite_technique_id UUID;
  v_duration_days INT;
  v_user_created_at TIMESTAMPTZ;
  v_prerequisite_access_date TIMESTAMPTZ;
BEGIN
  -- Получаем информацию о технике
  SELECT * INTO v_technique
  FROM public.materials
  WHERE id = p_technique_id AND material_type = 'technique';

  IF v_technique IS NULL THEN
    RETURN jsonb_build_object('can_purchase', false, 'reason', 'Техника не найдена');
  END IF;

  -- Проверяем, есть ли уже доступ
  SELECT EXISTS (
    SELECT 1 FROM public.user_material_access
    WHERE user_id = p_user_id AND material_id = p_technique_id
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN jsonb_build_object('can_purchase', false, 'reason', 'Доступ уже есть');
  END IF;

  -- Бесплатная техника
  IF v_technique.status = 'free' THEN
    RETURN jsonb_build_object('can_purchase', true, 'reason', 'Бесплатная техника');
  END IF;

  -- Платная техника без условий - можно покупать
  -- ИЗМЕНЕНО: 'purchasable' заменён на 'paid'
  IF v_technique.status = 'paid' AND v_technique.unlock_condition_type IS NULL THEN
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна для покупки',
      'purchase_url', v_technique.purchase_url
    );
  END IF;

  -- Техника locked с условием after_technique
  IF v_technique.status = 'locked' AND v_technique.unlock_condition_type = 'after_technique' THEN
    v_prerequisite_technique_id := (v_technique.unlock_condition_value->>'technique_id')::UUID;
    v_duration_days := COALESCE((v_technique.unlock_condition_value->>'duration_days')::INT, 30);

    -- Проверяем, когда был получен доступ к prerequisite технике
    SELECT granted_at INTO v_prerequisite_access_date
    FROM public.user_material_access
    WHERE user_id = p_user_id AND material_id = v_prerequisite_technique_id
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY granted_at DESC
    LIMIT 1;

    IF v_prerequisite_access_date IS NULL THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', 'Сначала нужно получить доступ к предыдущей технике'
      );
    END IF;

    -- Проверяем, прошло ли достаточно времени
    IF v_prerequisite_access_date + (v_duration_days || ' days')::interval > NOW() THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Доступна через %s дней после получения предыдущей техники', v_duration_days),
        'unlocks_at', v_prerequisite_access_date + (v_duration_days || ' days')::interval
      );
    END IF;

    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Условие выполнено',
      'purchase_url', v_technique.purchase_url
    );
  END IF;

  -- Техника locked с условием after_duration
  IF v_technique.status = 'locked' AND v_technique.unlock_condition_type = 'after_duration' THEN
    v_duration_days := (v_technique.unlock_condition_value->>'duration_days')::INT;

    SELECT created_at INTO v_user_created_at
    FROM public.users
    WHERE id = p_user_id;

    IF v_user_created_at IS NULL THEN
      RETURN jsonb_build_object('can_purchase', false, 'reason', 'Пользователь не найден');
    END IF;

    IF v_user_created_at + (v_duration_days || ' days')::interval > NOW() THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Доступна через %s дней после регистрации', v_duration_days),
        'unlocks_at', v_user_created_at + (v_duration_days || ' days')::interval
      );
    END IF;

    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Условие по времени выполнено',
      'purchase_url', v_technique.purchase_url
    );
  END IF;

  -- Платная техника - можно покупать
  IF v_technique.status = 'paid' THEN
    RETURN jsonb_build_object(
      'can_purchase', true,
      'reason', 'Доступна для покупки',
      'purchase_url', v_technique.purchase_url
    );
  END IF;

  -- По умолчанию - недоступна
  RETURN jsonb_build_object('can_purchase', false, 'reason', 'Техника недоступна');
END;
$function$;

-- Комментарий
COMMENT ON FUNCTION public.can_user_purchase_technique(uuid, uuid) IS
'Проверяет может ли пользователь купить технику. Статусы: free, paid, locked';

-- Права
GRANT EXECUTE ON FUNCTION public.can_user_purchase_technique(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_purchase_technique(uuid, uuid) TO anon;

-- =============================================
-- 6. ИНФОРМАЦИОННОЕ СООБЩЕНИЕ
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Миграция статусов завершена:';
  RAISE NOTICE '  - purchasable → paid';
  RAISE NOTICE '  - default → locked';
  RAISE NOTICE '  - Доступные статусы: free, paid, locked';
  RAISE NOTICE '  - Default статус: paid';
END $$;
