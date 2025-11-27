-- Migration: Fix get_user_techniques_with_schedule - remove user_module_access dependency
-- Date: 2025-11-27
-- Description: Техники из модулей должны браться напрямую из тарифа пользователя,
-- БЕЗ использования user_module_access. Цепочка:
-- user_tariffs → stream_tariffs → tariff_stream_modules → tariff_module_materials

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
  user_access_expires_at timestamptz,
  bundle_id uuid,
  bundle_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY

  WITH
  -- Получаем поток пользователя
  user_stream AS (
    SELECT use.stream_id, s.start_date
    FROM public.user_stream_enrollments use
    JOIN public.streams s ON s.id = use.stream_id
    WHERE use.user_id = p_user_id
    LIMIT 1
  ),

  -- Активный тариф пользователя
  user_active_tariff AS (
    SELECT ut.tariff_id
    FROM public.user_tariffs ut
    WHERE ut.user_id = p_user_id AND ut.is_active = true
    LIMIT 1
  ),

  -- stream_tariff для потока и тарифа пользователя
  user_stream_tariff AS (
    SELECT st.id as stream_tariff_id
    FROM public.stream_tariffs st
    WHERE st.stream_id = (SELECT stream_id FROM user_stream)
      AND st.tariff_id = (SELECT tariff_id FROM user_active_tariff)
    LIMIT 1
  ),

  -- 1. Прямой доступ через user_material_access
  direct_access AS (
    SELECT
      uma.material_id,
      uma.access_source as src,
      uma.expires_at,
      uma.granted_at,
      NULL::uuid as bnd_id,
      NULL::text as bnd_name
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
      ub.assigned_at as granted_at,
      b.id as bnd_id,
      b.name as bnd_name
    FROM public.user_bundles ub
    JOIN public.bundles b ON b.id = ub.bundle_id
    JOIN public.bundle_techniques bt ON bt.bundle_id = ub.bundle_id
    WHERE ub.user_id = p_user_id
  ),

  -- 3. Доступ через модули тарифа (НАПРЯМУЮ, без user_module_access)
  -- Цепочка: user_tariffs → stream_tariffs → tariff_stream_modules → tariff_module_materials
  module_access AS (
    SELECT
      tmm.material_id,
      'module'::text as src,
      -- Дата истечения доступа к технике
      CASE
        WHEN tmm.active_days IS NOT NULL
        THEN us.start_date + (COALESCE(tsm.unlock_offset_days, 0) + COALESCE(tmm.unlock_offset_days, 0))::integer * INTERVAL '1 day' + (tmm.active_days || ' days')::interval
        ELSE NULL
      END as expires_at,
      -- Дата разблокировки техники = start_date + offset модуля + offset техники
      us.start_date + (COALESCE(tsm.unlock_offset_days, 0) + COALESCE(tmm.unlock_offset_days, 0))::integer * INTERVAL '1 day' as unlocks_at,
      us.start_date as granted_at,
      sm.id as mod_id,
      sm.name as mod_name,
      -- Общий offset = offset модуля + offset техники
      (COALESCE(tsm.unlock_offset_days, 0) + COALESCE(tmm.unlock_offset_days, 0))::integer as unlock_offs,
      tmm.active_days as act_days,
      tmm.order_num as tmm_order_num
    FROM user_stream us
    CROSS JOIN user_stream_tariff ust
    JOIN public.tariff_stream_modules tsm ON tsm.stream_tariff_id = ust.stream_tariff_id
    JOIN public.stream_modules sm ON sm.id = tsm.stream_module_id
    JOIN public.tariff_module_materials tmm ON tmm.tariff_stream_module_id = tsm.id
    WHERE EXISTS (SELECT 1 FROM user_active_tariff)
  ),

  -- Объединяем все источники доступа
  all_access AS (
    SELECT material_id, src, expires_at, granted_at,
           NULL::uuid as mod_id, NULL::text as mod_name,
           NULL::int as unlock_offs, NULL::int as act_days,
           NULL::int as tmm_order_num, granted_at as unlocks_at,
           bnd_id, bnd_name
    FROM direct_access

    UNION ALL

    SELECT material_id, src, expires_at, granted_at,
           NULL::uuid, NULL::text, NULL::int, NULL::int, NULL::int, granted_at,
           bnd_id, bnd_name
    FROM bundle_access

    UNION ALL

    SELECT material_id, src, expires_at, granted_at,
           mod_id, mod_name, unlock_offs, act_days, tmm_order_num, unlocks_at,
           NULL::uuid, NULL::text
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
      (array_agg(aa.act_days ORDER BY aa.granted_at DESC))[1] as act_days_val,
      (array_agg(aa.bnd_id ORDER BY aa.granted_at DESC))[1] as bundle_id_val,
      (array_agg(aa.bnd_name ORDER BY aa.granted_at DESC))[1] as bundle_name_val
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
    ua.exp_at as user_access_expires_at,
    ua.bundle_id_val as bundle_id,
    ua.bundle_name_val as bundle_name
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
ИСПРАВЛЕНО: Техники из модулей берутся напрямую из тарифа пользователя,
без использования user_module_access. Цепочка:
user_stream_enrollments → stream_tariffs → tariff_stream_modules → tariff_module_materials';

GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO anon;

DO $$
BEGIN
  RAISE NOTICE 'Функция get_user_techniques_with_schedule исправлена:';
  RAISE NOTICE '  - Убрана зависимость от user_module_access';
  RAISE NOTICE '  - Техники берутся напрямую из tariff_stream_modules → tariff_module_materials';
  RAISE NOTICE '  - Учитывается поток пользователя из user_stream_enrollments';
END $$;
