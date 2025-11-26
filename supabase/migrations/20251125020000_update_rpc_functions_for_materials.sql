-- ============================================
-- Обновление RPC функций для работы с materials вместо techniques
-- ============================================
-- Дата: 2025-11-25

-- ========== 0. Удаляем старые функции если существуют ==========
DROP FUNCTION IF EXISTS public.grant_technique_access(UUID, UUID, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.revoke_technique_access(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_module_techniques_schedule(UUID);
DROP FUNCTION IF EXISTS public.can_user_purchase_technique(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_techniques_with_schedule(UUID);

-- ========== 1. grant_technique_access → grant_material_access ==========
CREATE OR REPLACE FUNCTION public.grant_material_access(
  p_user_id UUID,
  p_material_id UUID,
  p_access_source TEXT DEFAULT 'gift',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_material_access (user_id, material_id, access_source, expires_at)
  VALUES (p_user_id, p_material_id, p_access_source, p_expires_at)
  ON CONFLICT (user_id, material_id)
  DO UPDATE SET
    access_source = EXCLUDED.access_source,
    expires_at = EXCLUDED.expires_at,
    granted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backwards compatibility
CREATE OR REPLACE FUNCTION public.grant_technique_access(
  p_user_id UUID,
  p_technique_id UUID,
  p_access_source TEXT DEFAULT 'gift',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  PERFORM public.grant_material_access(p_user_id, p_technique_id, p_access_source, p_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 2. revoke_technique_access → revoke_material_access ==========
CREATE OR REPLACE FUNCTION public.revoke_material_access(
  p_user_id UUID,
  p_material_id UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.user_material_access
  WHERE user_id = p_user_id AND material_id = p_material_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backwards compatibility
CREATE OR REPLACE FUNCTION public.revoke_technique_access(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS VOID AS $$
BEGIN
  PERFORM public.revoke_material_access(p_user_id, p_technique_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 3. get_module_techniques_schedule → get_module_materials_schedule ==========
CREATE OR REPLACE FUNCTION public.get_module_materials_schedule(
  p_stream_module_id UUID
)
RETURNS TABLE(
  id UUID,
  module_id UUID,
  material_id UUID,
  material_name TEXT,
  material_type TEXT,
  release_day INTEGER,
  active_days INTEGER,
  order_num INTEGER,
  cover_image_path TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id,
    mm.module_id,
    mm.material_id,
    m.name as material_name,
    m.material_type,
    mm.release_day,
    mm.active_days,
    mm.order_num,
    m.cover_image_path,
    m.audio_url,
    m.duration_seconds,
    m.status
  FROM public.module_materials mm
  JOIN public.materials m ON mm.material_id = m.id
  WHERE mm.module_id = p_stream_module_id
  ORDER BY mm.order_num, mm.release_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backwards compatibility
CREATE OR REPLACE FUNCTION public.get_module_techniques_schedule(
  p_stream_module_id UUID
)
RETURNS TABLE(
  id UUID,
  stream_module_id UUID,
  technique_id UUID,
  technique_name TEXT,
  material_type TEXT,
  unlock_day INTEGER,
  active_days INTEGER,
  order_num INTEGER,
  cover_image TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id,
    mm.module_id as stream_module_id,
    mm.material_id as technique_id,
    m.name as technique_name,
    m.material_type,
    mm.release_day as unlock_day,
    mm.active_days,
    mm.order_num,
    m.cover_image_path as cover_image,
    m.audio_url,
    m.duration_seconds,
    m.status
  FROM public.module_materials mm
  JOIN public.materials m ON mm.material_id = m.id
  WHERE mm.module_id = p_stream_module_id
  ORDER BY mm.order_num, mm.release_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 4. can_user_purchase_technique → can_user_purchase_material ==========
CREATE OR REPLACE FUNCTION public.can_user_purchase_material(
  p_user_id UUID,
  p_material_id UUID
)
RETURNS TABLE(
  can_purchase BOOLEAN,
  reason TEXT,
  unlock_date TIMESTAMPTZ,
  module_name TEXT,
  stream_name TEXT
) AS $$
DECLARE
  v_has_access BOOLEAN;
  v_material_status TEXT;
  v_is_standalone BOOLEAN;
BEGIN
  -- Проверяем есть ли уже доступ
  SELECT EXISTS(
    SELECT 1 FROM public.user_material_access
    WHERE user_id = p_user_id AND material_id = p_material_id
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN QUERY SELECT FALSE, 'У вас уже есть доступ к этому материалу'::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Получаем статус материала
  SELECT m.status, COALESCE(m.is_standalone, FALSE)
  INTO v_material_status, v_is_standalone
  FROM public.materials m
  WHERE m.id = p_material_id;

  -- Если материал бесплатный
  IF v_material_status = 'free' THEN
    RETURN QUERY SELECT TRUE, 'Материал бесплатный'::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Если материал можно купить
  IF v_material_status = 'purchasable' AND v_is_standalone THEN
    RETURN QUERY SELECT TRUE, 'Материал доступен для покупки'::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Иначе материал locked или не standalone
  RETURN QUERY SELECT FALSE, 'Материал недоступен для покупки'::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backwards compatibility
CREATE OR REPLACE FUNCTION public.can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS TABLE(
  can_purchase BOOLEAN,
  reason TEXT,
  unlock_date TIMESTAMPTZ,
  module_name TEXT,
  stream_name TEXT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.can_user_purchase_material(p_user_id, p_technique_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 5. get_user_techniques_with_schedule → get_user_materials_with_schedule ==========
-- Эта функция возвращает материалы пользователя с учетом расписания модулей
CREATE OR REPLACE FUNCTION public.get_user_materials_with_schedule(
  p_user_id UUID
)
RETURNS TABLE(
  material_id UUID,
  name TEXT,
  description TEXT,
  cover_image_path TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  material_type TEXT,
  status TEXT,
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  module_id UUID,
  module_name TEXT,
  release_day INTEGER,
  active_days INTEGER,
  is_unlocked BOOLEAN,
  order_num INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as material_id,
    m.name,
    m.description,
    m.cover_image_path,
    m.audio_url,
    m.duration_seconds,
    m.material_type,
    m.status,
    EXISTS(
      SELECT 1 FROM public.user_material_access uma
      WHERE uma.user_id = p_user_id AND uma.material_id = m.id
    ) as has_access,
    (m.status = 'purchasable' OR m.status = 'free') as can_purchase,
    mm.module_id,
    sm.name as module_name,
    mm.release_day,
    mm.active_days,
    TRUE as is_unlocked, -- Упрощенная логика, можно расширить
    mm.order_num
  FROM public.materials m
  LEFT JOIN public.module_materials mm ON m.id = mm.material_id
  LEFT JOIN public.stream_modules sm ON mm.module_id = sm.id
  ORDER BY mm.order_num NULLS LAST, m.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backwards compatibility
CREATE OR REPLACE FUNCTION public.get_user_techniques_with_schedule(
  p_user_id UUID
)
RETURNS TABLE(
  technique_id UUID,
  title TEXT,
  description TEXT,
  cover_image TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  material_type TEXT,
  status TEXT,
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  module_id UUID,
  module_name TEXT,
  unlock_day INTEGER,
  active_days INTEGER,
  is_unlocked BOOLEAN,
  order_num INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    material_id as technique_id,
    name as title,
    description,
    cover_image_path as cover_image,
    audio_url,
    duration_seconds,
    material_type,
    status,
    has_access,
    can_purchase,
    module_id,
    module_name,
    release_day as unlock_day,
    active_days,
    is_unlocked,
    order_num
  FROM public.get_user_materials_with_schedule(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== ИНФОРМАЦИЯ ==========
DO $$
BEGIN
  RAISE NOTICE '✅ RPC функции обновлены успешно!';
  RAISE NOTICE 'Новые функции:';
  RAISE NOTICE '  - grant_material_access';
  RAISE NOTICE '  - revoke_material_access';
  RAISE NOTICE '  - get_module_materials_schedule';
  RAISE NOTICE '  - can_user_purchase_material';
  RAISE NOTICE '  - get_user_materials_with_schedule';
  RAISE NOTICE '';
  RAISE NOTICE 'Старые функции сохранены для совместимости (работают как aliases)';
END $$;
