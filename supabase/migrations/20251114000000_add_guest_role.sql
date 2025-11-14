-- Migration: Add guest role for users
-- Date: 2025-11-14
-- Description: Добавление роли 'guest' для гостевого доступа

-- 1. Добавить роль 'guest' в enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guest';

-- 2. Создать функцию для определения, является ли пользователь гостем
-- Гость = пользователь без активного тарифа ИЛИ с истекшим доступом
CREATE OR REPLACE FUNCTION is_user_guest(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_active_tariff BOOLEAN;
  v_access_till TIMESTAMPTZ;
BEGIN
  -- Проверить общий access_till пользователя
  SELECT access_till INTO v_access_till
  FROM public.users
  WHERE id = p_user_id;

  -- Если access_till истек, пользователь - гость
  IF v_access_till IS NOT NULL AND v_access_till < NOW() THEN
    RETURN TRUE;
  END IF;

  -- Проверить, есть ли у пользователя активный тариф
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tariffs
    WHERE user_id = p_user_id
    AND is_active = true
  ) INTO v_has_active_tariff;

  -- Если нет активного тарифа - пользователь гость
  RETURN NOT v_has_active_tariff;
END;
$$;

-- Комментарии к функции
COMMENT ON FUNCTION is_user_guest(UUID) IS 'Определяет, является ли пользователь гостем (нет активного тарифа или истек access_till)';
