-- ============================================
-- Обновление функции get_user_techniques_with_schedule
-- Теперь возвращает ТОЛЬКО техники из модулей потока пользователя
-- ============================================

DROP FUNCTION IF EXISTS get_user_techniques_with_schedule(uuid);

CREATE FUNCTION get_user_techniques_with_schedule(
  p_user_id UUID
)
RETURNS TABLE (
  -- Основные поля техники
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
  -- Поля о доступе
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  purchase_info JSONB,
  access_granted_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  access_source TEXT,
  -- Поля для расписания модулей
  unlock_day INT,
  is_unlocked BOOLEAN,
  module_id UUID,
  module_name TEXT
) AS $$
DECLARE
  v_user_stream_id UUID;
  v_stream_start_date DATE;
  v_current_day INT;
BEGIN
  -- Получить поток пользователя
  SELECT use.stream_id INTO v_user_stream_id
  FROM public.user_stream_enrollments use
  WHERE use.user_id = p_user_id
  LIMIT 1;

  -- Если у пользователя нет потока - возвращаем пустой результат
  IF v_user_stream_id IS NULL THEN
    RETURN;
  END IF;

  -- Получаем дату начала потока и текущий день
  SELECT s.start_date INTO v_stream_start_date
  FROM public.streams s
  WHERE s.id = v_user_stream_id;

  v_current_day := GREATEST(1, (CURRENT_DATE - v_stream_start_date)::INT + 1);

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
    -- Поля для расписания (из tariff_module_techniques)
    tmt.unlock_offset_days as unlock_day,
    (tmt.unlock_offset_days <= v_current_day) as is_unlocked,
    sm.id as module_id,
    sm.name as module_name
  FROM public.user_stream_enrollments use2
  -- Получаем тариф пользователя
  JOIN public.stream_tariffs st ON st.stream_id = use2.stream_id AND st.tariff_id = use2.tariff_id
  -- Модули тарифа
  JOIN public.tariff_stream_modules tsm ON tsm.stream_tariff_id = st.id
  -- Техники в модулях тарифа
  JOIN public.tariff_module_techniques tmt ON tmt.tariff_stream_module_id = tsm.id
  -- Данные модуля
  JOIN public.stream_modules sm ON sm.id = tsm.stream_module_id
  -- Данные техники
  JOIN public.techniques t ON t.id = tmt.technique_id
  -- LEFT JOIN для информации о доступе пользователя
  LEFT JOIN public.user_technique_access uta
    ON uta.technique_id = t.id
    AND uta.user_id = p_user_id
    AND (uta.expires_at IS NULL OR uta.expires_at > NOW())
  -- Фильтр: только для текущего пользователя
  WHERE use2.user_id = p_user_id
  -- Сортировка: по модулю, затем по дню открытия
  ORDER BY
    tsm.order_num ASC,
    tmt.unlock_offset_days ASC,
    tmt.order_num ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_techniques_with_schedule IS 'Возвращает техники из модулей потока пользователя с информацией о доступе и расписании';

-- Информация
DO $$
BEGIN
  RAISE NOTICE 'Функция get_user_techniques_with_schedule обновлена';
  RAISE NOTICE 'Теперь возвращает только техники из stream_module_techniques потока пользователя';
END $$;
