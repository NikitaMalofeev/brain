-- Обновляем функцию can_user_access_stage, убирая логику с max_days_access
CREATE OR REPLACE FUNCTION public.can_user_access_stage(p_user_id UUID, p_stage_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tariff_id UUID;
  user_access_expires_at TIMESTAMPTZ;
  v_limit RECORD;
BEGIN
  -- 1. Проверяем, не истек ли общий доступ пользователя
  SELECT access_till INTO user_access_expires_at FROM public.users WHERE id = p_user_id;
  IF user_access_expires_at IS NOT NULL AND user_access_expires_at < now() THEN
    RETURN FALSE;
  END IF;

  -- 2. Получаем активный тариф пользователя
  SELECT tariff_id INTO user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, доступа нет
  IF user_tariff_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Получаем лимиты для этого тарифа и этапа
  SELECT * INTO v_limit
  FROM public.tariff_limits
  WHERE tariff_id = user_tariff_id AND stage_id = p_stage_id;

  -- Если для тарифа нет никаких правил по этому этапу, доступа нет
  IF v_limit IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 4. Проверяем условный доступ (требуется прохождение всех предыдущих уроков)
  IF v_limit.requires_full_prereq THEN
    IF NOT public.check_all_previous_lessons_completed(p_user_id, p_stage_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- 5. Если все проверки пройдены, доступ есть
  -- Логика по max_days_access больше не используется - доступ к урокам управляется на уровне отдельных уроков
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_access_stage IS 'Проверяет, имеет ли пользователь доступ к конкретному этапу курса с учетом его тарифа и прогресса. Доступ к урокам теперь управляется на уровне отдельных уроков.'; 