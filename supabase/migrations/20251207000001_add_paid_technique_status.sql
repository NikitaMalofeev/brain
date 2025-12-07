-- Migration: Add 'paid' and 'default' status for techniques
-- Date: 2025-12-07
-- Description: Добавляем новые статусы техник:
--   - 'paid' = платная (показывается в библиотеке, требует оплаты)
--   - 'default' = по умолчанию (только через модули/пакеты, НЕ в библиотеке)
-- Обратная совместимость:
--   - 'purchasable' маппится на 'paid'
--   - 'locked' маппится на 'default'
--
-- ВАЖНО: Миграция идемпотентная - безопасна для повторного запуска

-- =============================================
-- 0. ОБНОВИТЬ CHECK CONSTRAINT ДЛЯ СТАТУСОВ
-- =============================================

-- Удаляем старые check constraints (могут называться по-разному)
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS techniques_status_check;
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_status_check;

-- Создаём новый check constraint с поддержкой всех статусов
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check
  CHECK (status IS NULL OR status IN ('free', 'paid', 'default', 'purchasable', 'locked'));

-- =============================================
-- 1. ОБНОВИТЬ СУЩЕСТВУЮЩИЕ ДАННЫЕ
-- =============================================

-- Конвертируем старые статусы на новые (только если они ещё не конвертированы)
UPDATE public.materials
SET status = 'paid'
WHERE status = 'purchasable';

UPDATE public.materials
SET status = 'default'
WHERE status = 'locked';

-- Обновляем is_standalone на основе статуса
UPDATE public.materials
SET is_standalone = (status IN ('paid', 'free'))
WHERE is_standalone IS DISTINCT FROM (status IN ('paid', 'free'));

-- =============================================
-- 2. ОБНОВИТЬ RPC ФУНКЦИЮ get_user_techniques_with_schedule
-- =============================================

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
      ub.assigned_at as granted_at,
      b.id as b_id,
      b.name as b_name
    FROM public.user_bundles ub
    JOIN public.bundle_techniques bt ON bt.bundle_id = ub.bundle_id
    JOIN public.bundles b ON b.id = ub.bundle_id
    WHERE ub.user_id = p_user_id
  ),

  -- 3. Доступ через модули тарифа
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
           NULL::int as tmm_order_num, granted_at as unlocks_at,
           NULL::uuid as b_id, NULL::text as b_name
    FROM direct_access

    UNION ALL

    SELECT material_id, src, expires_at, granted_at,
           NULL::uuid, NULL::text, NULL::int, NULL::int, NULL::int, granted_at,
           b_id, b_name
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
      (array_agg(aa.b_id ORDER BY aa.granted_at DESC))[1] as ua_bundle_id,
      (array_agg(aa.b_name ORDER BY aa.granted_at DESC))[1] as ua_bundle_name
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
    -- has_access: приоритет источника доступа
    -- 1. Если есть доступ через модуль/пакет/прямой → true (status игнорируется)
    -- 2. Если нет доступа через модуль/пакет → смотрим status (free = true)
    CASE
      WHEN COALESCE(ua.has_acc, false) THEN true  -- Есть доступ через модуль/пакет/прямой
      WHEN m.status = 'free' THEN true            -- Бесплатная для всех (гости тоже)
      ELSE false                                   -- Нет доступа
    END as has_access,
    -- can_purchase: можно купить если status='paid', нет доступа, нет unlock_condition
    (m.status = 'paid'
     AND NOT COALESCE(ua.has_acc, false)
     AND m.unlock_condition_type IS NULL) as can_purchase,
    -- is_unlocked: разблокирована ли техника
    CASE
      WHEN ua.src = 'module' THEN COALESCE(ua.has_acc, false)  -- Модульная - по времени
      WHEN COALESCE(ua.has_acc, false) THEN true               -- Есть прямой доступ
      WHEN m.status = 'free' THEN true                         -- Бесплатная
      WHEN m.unlock_condition_type IS NOT NULL THEN false      -- Есть условие разблокировки
      ELSE true
    END as is_unlocked,
    ua.mod_id as module_id,
    ua.mod_name as module_name,
    ua.unlock_day_val as unlock_day,
    ua.act_days_val as active_days,
    ua.src as user_access_source,
    ua.exp_at as user_access_expires_at,
    ua.ua_bundle_id as bundle_id,
    ua.ua_bundle_name as bundle_name
  FROM public.materials m
  LEFT JOIN user_access ua ON ua.material_id = m.id
  WHERE m.is_standalone = true
     OR ua.material_id IS NOT NULL
  ORDER BY
    -- Сначала доступные, потом недоступные
    CASE
      WHEN COALESCE(ua.has_acc, false) OR m.status = 'free' THEN 0
      ELSE 1
    END,
    m.order_num NULLS LAST;

END;
$function$;

COMMENT ON FUNCTION public.get_user_techniques_with_schedule(uuid) IS
'Возвращает техники для библиотеки с учётом всех источников доступа.
Статусы: free (бесплатная), paid (платная), default (только через модули/пакеты)';

GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_techniques_with_schedule(uuid) TO anon;

-- =============================================
-- 3. СОЗДАТЬ ТАБЛИЦУ ДЛЯ ОПЛАТЫ ПЛАТНЫХ ТЕХНИК
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_paid_technique_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  technique_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  paid_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, technique_id)
);

-- Индексы (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_user_paid_technique_user ON public.user_paid_technique_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_paid_technique_technique ON public.user_paid_technique_access(technique_id);
CREATE INDEX IF NOT EXISTS idx_user_paid_technique_is_paid ON public.user_paid_technique_access(is_paid) WHERE is_paid = true;

-- RLS
ALTER TABLE public.user_paid_technique_access ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если существуют, затем создаём новые
DROP POLICY IF EXISTS "Users can read own paid technique access" ON public.user_paid_technique_access;
DROP POLICY IF EXISTS "Admins can manage paid technique access" ON public.user_paid_technique_access;

CREATE POLICY "Users can read own paid technique access"
  ON public.user_paid_technique_access
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage paid technique access"
  ON public.user_paid_technique_access
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.user_paid_technique_access IS
'Отслеживает оплату платных техник (status=paid).
Если is_paid=true, техника доступна пользователю.';

-- =============================================
-- 4. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ПЛАТНЫХ ТЕХНИК ПОЛЬЗОВАТЕЛЯ
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_paid_techniques(p_user_id uuid)
RETURNS TABLE(
  technique_id uuid,
  technique_name text,
  technique_description text,
  technique_cover text,
  technique_audio_url text,
  is_paid boolean,
  paid_at timestamptz,
  paid_by uuid,
  order_num integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id as technique_id,
    m.name as technique_name,
    m.description as technique_description,
    m.cover_image_path as technique_cover,
    m.audio_url as technique_audio_url,
    COALESCE(upta.is_paid, false) as is_paid,
    upta.paid_at,
    upta.paid_by,
    m.order_num
  FROM public.materials m
  LEFT JOIN public.user_paid_technique_access upta
    ON upta.technique_id = m.id AND upta.user_id = p_user_id
  WHERE m.status = 'paid'
    AND m.is_standalone = true
  ORDER BY m.order_num NULLS LAST;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_user_paid_techniques(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_paid_techniques(uuid) TO anon;

COMMENT ON FUNCTION public.get_user_paid_techniques(uuid) IS
'Возвращает список платных техник (status=paid) с информацией об оплате для пользователя.';

-- =============================================
-- 5. ИСПРАВИТЬ ВСЕ ФУНКЦИИ СО СТАРЫМИ ИМЕНАМИ ТАБЛИЦ
-- user_technique_access -> user_material_access
-- techniques -> materials
-- =============================================

-- Удаляем старые версии функций
DROP FUNCTION IF EXISTS public.grant_technique_access(uuid, uuid, text, timestamptz);
DROP FUNCTION IF EXISTS public.grant_technique_access(uuid, uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.revoke_technique_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_techniques_with_access(uuid);
DROP FUNCTION IF EXISTS public.can_user_access_technique(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_user_purchase_technique(uuid, uuid);

-- =============================================
-- 5.1 Функция can_user_access_technique (исправленная)
-- Логика приоритета источника доступа:
-- 1. Если есть доступ через модуль/пакет/прямой → true (status игнорируется)
-- 2. Если status = 'free' → true (бесплатная для всех, включая гостей)
-- 3. Иначе → false
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_access_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_technique_status TEXT;
  v_has_direct_access BOOLEAN := false;
  v_has_bundle_access BOOLEAN := false;
  v_has_module_access BOOLEAN := false;
BEGIN
  -- Получить статус техники из materials
  SELECT status INTO v_technique_status
  FROM public.materials
  WHERE id = p_technique_id;

  IF v_technique_status IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Если пользователь указан - проверяем все источники доступа
  IF p_user_id IS NOT NULL THEN
    -- 1. Прямой доступ через user_material_access
    SELECT EXISTS (
      SELECT 1
      FROM public.user_material_access
      WHERE user_id = p_user_id
        AND material_id = p_technique_id
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_has_direct_access;

    IF v_has_direct_access THEN
      RETURN TRUE;
    END IF;

    -- 2. Доступ через пакеты (bundles)
    SELECT EXISTS (
      SELECT 1
      FROM public.user_bundles ub
      JOIN public.bundle_techniques bt ON bt.bundle_id = ub.bundle_id
      WHERE ub.user_id = p_user_id
        AND bt.technique_id = p_technique_id
    ) INTO v_has_bundle_access;

    IF v_has_bundle_access THEN
      RETURN TRUE;
    END IF;

    -- 3. Доступ через модули (упрощённая проверка)
    SELECT EXISTS (
      SELECT 1
      FROM public.user_module_access uma
      JOIN public.tariff_stream_modules tsm ON tsm.stream_module_id = uma.stream_module_id
      JOIN public.tariff_module_materials tmm ON tmm.tariff_stream_module_id = tsm.id
      WHERE uma.user_id = p_user_id
        AND tmm.material_id = p_technique_id
        AND (uma.expires_at IS NULL OR uma.expires_at > NOW())
        AND (uma.granted_at + (COALESCE(tmm.unlock_offset_days, 0) || ' days')::interval) <= NOW()
    ) INTO v_has_module_access;

    IF v_has_module_access THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Нет доступа через модуль/пакет/прямой → смотрим status
  -- Бесплатные техники доступны всем (включая гостей)
  IF v_technique_status = 'free' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_access_technique IS
'Проверяет доступ к технике с приоритетом источника:
1. Модуль/пакет/прямой доступ → true (status игнорируется)
2. status=free → true (для всех, включая гостей)
3. Иначе → false';
GRANT EXECUTE ON FUNCTION public.can_user_access_technique(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_access_technique(uuid, uuid) TO anon;

-- =============================================
-- 5.2 Функция can_user_purchase_technique (исправленная)
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_purchase_technique(
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
  -- Получить данные техники из materials
  SELECT * INTO v_technique
  FROM public.materials
  WHERE id = p_technique_id;

  IF v_technique.id IS NULL THEN
    RETURN jsonb_build_object('can_purchase', false, 'reason', 'Техника не найдена', 'unlock_date', null);
  END IF;

  IF v_technique.status = 'free' THEN
    RETURN jsonb_build_object('can_purchase', false, 'reason', 'Техника бесплатная', 'unlock_date', null);
  END IF;

  IF can_user_access_technique(p_user_id, p_technique_id) THEN
    RETURN jsonb_build_object('can_purchase', false, 'reason', 'У вас уже есть доступ', 'unlock_date', null);
  END IF;

  -- Платные техники можно покупать
  IF v_technique.status = 'paid' AND v_technique.unlock_condition_type IS NULL THEN
    RETURN jsonb_build_object('can_purchase', true, 'reason', 'Доступна к покупке', 'unlock_date', null);
  END IF;

  -- Техники по умолчанию нельзя покупать напрямую
  IF v_technique.status = 'default' THEN
    RETURN jsonb_build_object('can_purchase', false, 'reason', 'Доступна только через модули', 'unlock_date', null);
  END IF;

  -- Проверка условия after_technique
  IF v_technique.unlock_condition_type = 'after_technique' THEN
    v_prerequisite_technique_id := (v_technique.unlock_condition_value->>'technique_id')::UUID;
    v_duration_days := COALESCE((v_technique.unlock_condition_value->>'duration_days')::INT, 0);

    SELECT granted_at INTO v_prerequisite_granted_at
    FROM public.user_material_access
    WHERE user_id = p_user_id
      AND material_id = v_prerequisite_technique_id
      AND (expires_at IS NULL OR expires_at > NOW());

    IF v_prerequisite_granted_at IS NULL THEN
      RETURN jsonb_build_object('can_purchase', false, 'reason', 'Сначала получите предыдущую технику', 'unlock_date', null);
    END IF;

    v_unlock_date := v_prerequisite_granted_at + (v_duration_days || ' days')::INTERVAL;

    IF NOW() < v_unlock_date THEN
      RETURN jsonb_build_object(
        'can_purchase', false,
        'reason', format('Доступна через %s дней', CEIL(EXTRACT(EPOCH FROM (v_unlock_date - NOW())) / 86400)),
        'unlock_date', v_unlock_date
      );
    END IF;

    RETURN jsonb_build_object('can_purchase', true, 'reason', 'Доступна к покупке', 'unlock_date', null);
  END IF;

  RETURN jsonb_build_object('can_purchase', true, 'reason', 'Доступна к покупке', 'unlock_date', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_purchase_technique IS 'Проверяет может ли пользователь купить технику';
GRANT EXECUTE ON FUNCTION public.can_user_purchase_technique(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_purchase_technique(uuid, uuid) TO anon;

-- =============================================
-- 5.3 Функция get_techniques_with_access (исправленная, fallback)
-- Логика приоритета источника доступа:
-- 1. Если есть доступ через модуль/пакет/прямой → has_access=true
-- 2. Если status='free' → has_access=true (для всех, включая гостей)
-- 3. Иначе → has_access=false
-- =============================================
CREATE OR REPLACE FUNCTION public.get_techniques_with_access(p_user_id UUID)
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
  unlock_condition_type TEXT,
  unlock_condition_value JSONB,
  order_num INT,
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  is_unlocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name as title,
    m.description,
    m.audio_url,
    m.cover_image_path as cover_image,
    m.duration_seconds,
    m.status,
    m.purchase_url,
    m.upgrade_tariff_chat_url,
    m.unlock_condition_type,
    m.unlock_condition_value,
    m.order_num,
    -- has_access с приоритетом источника
    can_user_access_technique(p_user_id, m.id) as has_access,
    -- can_purchase: только для paid техник без доступа
    (m.status = 'paid'
     AND NOT can_user_access_technique(p_user_id, m.id)
     AND m.unlock_condition_type IS NULL) as can_purchase,
    -- is_unlocked
    CASE
      WHEN can_user_access_technique(p_user_id, m.id) THEN true
      WHEN m.status = 'free' THEN true
      WHEN m.unlock_condition_type IS NOT NULL THEN false
      ELSE true
    END as is_unlocked
  FROM public.materials m
  WHERE m.is_standalone = true
  ORDER BY
    -- Сначала доступные
    CASE WHEN can_user_access_technique(p_user_id, m.id) OR m.status = 'free' THEN 0 ELSE 1 END,
    m.order_num ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_techniques_with_access IS
'Возвращает техники с приоритетом источника доступа (fallback функция):
1. Модуль/пакет/прямой доступ → has_access=true
2. status=free → has_access=true
3. Иначе → has_access=false';
GRANT EXECUTE ON FUNCTION public.get_techniques_with_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_techniques_with_access(uuid) TO anon;

-- =============================================
-- 5.4 Функции grant/revoke_technique_access (исправленные)
-- =============================================

CREATE OR REPLACE FUNCTION public.grant_technique_access(
  p_user_id uuid,
  p_technique_id uuid,
  p_access_source text DEFAULT 'gift',
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.materials WHERE id = p_technique_id) THEN
    RAISE EXCEPTION 'Technique not found: %', p_technique_id;
  END IF;

  INSERT INTO public.user_material_access (user_id, material_id, access_source, expires_at, granted_at)
  VALUES (p_user_id, p_technique_id, p_access_source, p_expires_at, NOW())
  ON CONFLICT (user_id, material_id) DO UPDATE SET
    access_source = EXCLUDED.access_source,
    expires_at = EXCLUDED.expires_at,
    granted_at = NOW();

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.grant_technique_access(uuid, uuid, text, timestamptz) TO authenticated;
COMMENT ON FUNCTION public.grant_technique_access IS 'Выдаёт доступ к технике пользователю';

CREATE OR REPLACE FUNCTION public.revoke_technique_access(
  p_user_id uuid,
  p_technique_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.user_material_access
  WHERE user_id = p_user_id AND material_id = p_technique_id;
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.revoke_technique_access(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.revoke_technique_access IS 'Отзывает доступ к технике у пользователя';

-- =============================================
-- ГОТОВО
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
END $$;
