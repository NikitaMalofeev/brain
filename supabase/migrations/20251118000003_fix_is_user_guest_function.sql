-- Migration: Fix is_user_guest to check role instead of tariff
-- Date: 2025-11-18
-- Description: Изменяем логику проверки гостя - проверяем роль напрямую вместо наличия тарифа

DROP FUNCTION IF EXISTS is_user_guest(UUID);

CREATE OR REPLACE FUNCTION is_user_guest(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Получаем роль пользователя
  SELECT role INTO v_role
  FROM public.users
  WHERE id = p_user_id;

  -- Если пользователь не найден, считаем гостем
  IF v_role IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Гость только если роль = 'guest'
  RETURN v_role = 'guest';
END;
$$;

COMMENT ON FUNCTION is_user_guest(UUID) IS 'Определяет, является ли пользователь гостем по роли в таблице users';
