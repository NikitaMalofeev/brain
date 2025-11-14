-- Migration: Set guest as default role for new users
-- Date: 2025-11-14
-- Description: Устанавливаем роль 'guest' по умолчанию для новых пользователей

-- 1. Установить default значение для колонки role в таблице users
ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'guest';

-- 2. Обновить существующих пользователей без роли
UPDATE public.users
SET role = 'guest'
WHERE role IS NULL;

-- 3. Создать триггер для автоматического назначения роли guest при создании пользователя
CREATE OR REPLACE FUNCTION set_default_guest_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Если роль не указана, устанавливаем guest
  IF NEW.role IS NULL THEN
    NEW.role := 'guest';
  END IF;

  RETURN NEW;
END;
$$;

-- Создать триггер перед вставкой
DROP TRIGGER IF EXISTS ensure_guest_role_on_insert ON public.users;
CREATE TRIGGER ensure_guest_role_on_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_default_guest_role();

-- Комментарии
COMMENT ON FUNCTION set_default_guest_role() IS 'Автоматически устанавливает роль guest для новых пользователей';
COMMENT ON TRIGGER ensure_guest_role_on_insert ON public.users IS 'Гарантирует что новые пользователи получают роль guest по умолчанию';
