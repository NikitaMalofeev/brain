-- Migration: Fix technique unlock calculation with module offset
-- Date: 2025-11-27
-- Description: Исправляем расчёт unlock для техник - добавляем offset модуля к offset техники
-- Теперь: unlock_date = stream.start_date + tsm.unlock_offset_days + tmm.unlock_offset_days

DROP FUNCTION IF EXISTS public.get_user_techniques_with_schedule(uuid);

CREATE OR REPLACE FUNCTION public.get_user_techniques_with_schedule(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  cover_image text,
  audio_url text,
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
  -- ВАЖНО: total_unlock_days = tsm.unlock_offset_days (модуль) + tmm.unlock_offset_days (техника)
  module_access AS (
    SELECT
      tmm.material_id,
      'module'::text as src,
      -- Дата истечения доступа к технике
      CASE
        WHEN tmm.active_days IS NOT NULL
        THEN s.start_date + (COALESCE(tsm.unlock_offset_days, 0) + COALESCE(tmm.unlock_offset_days, 0))::integer * INTERVAL '1 day' + (tmm.active_days || ' days')::interval
        ELSE NULL
      END as expires_at,
      -- Дата разблокировки техники = start_date + offset модуля + offset техники
      s.start_date + (COALESCE(tsm.unlock_offset_days, 0) + COALESCE(tmm.unlock_offset_days, 0))::integer * INTERVAL '1 day' as unlocks_at,
      uma.granted_at,
      sm.id as mod_id,
      sm.name as mod_name,
      -- Общий offset = offset модуля + offset техники
      (COALESCE(tsm.unlock_offset_days, 0) + COALESCE(tmm.unlock_offset_days, 0))::integer as unlock_offs,
      tmm.active_days as act_days,
      tmm.order_num as tmm_order_num,
      -- Дополнительно: offset только модуля для отображения
      COALESCE(tsm.unlock_offset_days, 0) as module_unlock_offs
    FROM public.user_module_access uma
    JOIN public.stream_modules sm ON sm.id = uma.stream_module_id
    JOIN public.streams s ON s.id = sm.stream_id
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
      bool_or(aa.unlocks_at <= NOW()) as has_acc,
      bool_or(aa.unlocks_at > NOW()) as has_future_acc,
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
    m.duration_seconds,
    m.material_type,
    m.status,
    m.purchase_url,
    m.upgrade_tariff_chat_url,
    m.unlock_condition_type,
    m.unlock_condition_value,
    m.order_num,
    COALESCE(ua.has_acc, false) as has_access,
    -- can_purchase: можно купить если нет доступа, статус позволяет и нет unlock_condition
    (m.status IN ('purchasable', 'free') AND NOT COALESCE(ua.has_acc, false)
     AND m.unlock_condition_type IS NULL) as can_purchase,
    -- is_unlocked: разблокирована ли техника
    -- Для модульных техник (ua.src = 'module') - проверяем has_acc (учитывает unlock_offset_days)
    -- Для остальных (standalone, bundle, direct) - true если нет unlock_condition или has_acc
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

COMMENT ON FUNCTION public.get_user_techniques_with_schedule(uuid) IS
'Возвращает техники для библиотеки с учётом всех источников доступа.
unlock_day для модульных техник = tsm.unlock_offset_days + tmm.unlock_offset_days
(сумма offset модуля и offset техники от даты начала потока)';

GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO anon;

DO $$
BEGIN
  RAISE NOTICE 'Функция get_user_techniques_with_schedule обновлена:';
  RAISE NOTICE '  - unlock_day теперь = offset модуля + offset техники';
  RAISE NOTICE '  - unlocks_at считается от stream.start_date';
END $$;
