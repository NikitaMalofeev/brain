-- Создание бакета 'media', если он не существует
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Создание функции для проверки роли администратора
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем, есть ли у текущего пользователя (из JWT) роль 'admin'
  RETURN (
    SELECT COALESCE(raw_app_meta_data->>'user_role', 'user') = 'admin'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Политика для публичного доступа на чтение
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- Политика для доступа на запись/изменение/удаление только для админов
DROP POLICY IF EXISTS "Admin Write Access" ON storage.objects;
CREATE POLICY "Admin Write Access"
ON storage.objects FOR ALL -- <<< ИСПРАВЛЕНИЕ ЗДЕСЬ
WITH CHECK ( is_admin() );
