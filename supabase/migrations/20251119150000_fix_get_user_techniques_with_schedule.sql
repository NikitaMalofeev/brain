-- Migration: Fix get_user_techniques_with_schedule to return correct field structure
-- Date: 2025-11-19
-- Description: Обновление функции get_user_techniques_with_schedule для возвращения правильной структуры данных

-- =============================================
-- УДАЛИТЬ СТАРУЮ ФУНКЦИЮ
-- =============================================
DROP FUNCTION IF EXISTS get_user_techniques_with_schedule(uuid);

-- =============================================
-- СОЗДАТЬ ФУНКЦИЮ С ПРАВИЛЬНОЙ СТРУКТУРОЙ
-- =============================================
CREATE FUNCTION get_user_techniques_with_schedule(
  p_user_id UUID
)
RETURNS TABLE (
  -- Основные поля техники (как в оригинальной функции)
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
  -- Поля о доступе (как в оригинальной функции)
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  purchase_info JSONB,
  access_granted_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  access_source TEXT,
  -- Новые поля для расписания модулей
  unlock_date DATE,
  is_unlocked BOOLEAN
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
    -- Основные поля техники
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
    -- Поля о доступе
    can_user_access_technique(p_user_id, t.id) as has_access,
    (can_user_purchase_technique(p_user_id, t.id)->>'can_purchase')::BOOLEAN as can_purchase,
    can_user_purchase_technique(p_user_id, t.id) as purchase_info,
    uta.granted_at as access_granted_at,
    uta.expires_at as access_expires_at,
    uta.access_source as access_source,
    -- Новые поля для расписания
    smt.unlock_date,
    (smt.unlock_date IS NULL OR smt.unlock_date <= CURRENT_DATE) as is_unlocked
  FROM public.techniques t
  -- JOIN для информации о доступе пользователя
  LEFT JOIN public.user_technique_access uta
    ON uta.technique_id = t.id
    AND uta.user_id = p_user_id
    AND (uta.expires_at IS NULL OR uta.expires_at > NOW())
  -- JOIN для информации о расписании в модуле потока
  LEFT JOIN public.stream_module_techniques smt
    ON smt.technique_id = t.id
    AND smt.stream_module_id IN (
      SELECT sm.id
      FROM public.stream_modules sm
      WHERE sm.stream_id = v_user_stream_id
    )
  -- Сортировка: сначала по дате разблокировки модуля, потом по порядковому номеру
  ORDER BY
    CASE WHEN smt.unlock_date IS NOT NULL THEN 0 ELSE 1 END,
    smt.unlock_date ASC,
    t.order_num ASC,
    t.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_techniques_with_schedule IS 'Возвращает список всех техник с информацией о доступе пользователя и расписании модулей';
