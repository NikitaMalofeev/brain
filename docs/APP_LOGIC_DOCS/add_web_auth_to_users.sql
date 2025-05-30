-- Добавление веб-авторизации к существующей таблице users
-- Расширяем таблицу users для поддержки веб-логинов админов и кураторов

-- 1. Добавляем поля для веб-авторизации
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS web_login VARCHAR(50) UNIQUE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS web_password_hash TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS web_last_login TIMESTAMPTZ;

-- 2. Добавляем ограничение на формат логина
DO $$
BEGIN
    -- Проверяем, существует ли ограничение
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'users_web_login_format'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_web_login_format 
        CHECK (web_login IS NULL OR web_login ~ '^[a-zA-Z0-9_-]+$');
    END IF;
END $$;

-- 3. Создаем индекс для быстрого поиска по веб-логину
CREATE INDEX IF NOT EXISTS users_web_login_idx ON public.users (web_login);

-- 4. Создаем системного админа
INSERT INTO public.users (
    id,
    telegram_id,
    first_name,
    last_name,
    username,
    photo_url,
    auth_date,
    hash,
    role,
    total_points,
    lives_remaining,
    web_login,
    web_password_hash,
    created_at,
    updated_at
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'web_admin_system',
    'Системный',
    'Администратор',
    'web_admin',
    null,
    extract(epoch from now())::text,
    'web_admin_hash',
    'admin',
    0,
    3,
    'admin',
    crypt('admin123', gen_salt('bf')), -- bcrypt hash для "admin123"
    now(),
    now()
)
ON CONFLICT (telegram_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    web_login = EXCLUDED.web_login,
    web_password_hash = EXCLUDED.web_password_hash,
    updated_at = now();

-- 5. Создаем системного куратора  
INSERT INTO public.users (
    id,
    telegram_id,
    first_name,
    last_name,
    username,
    photo_url,
    auth_date,
    hash,
    role,
    total_points,
    lives_remaining,
    web_login,
    web_password_hash,
    created_at,
    updated_at
) VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    'web_curator_system',
    'Системный',
    'Куратор',
    'web_curator',
    null,
    extract(epoch from now())::text,
    'web_curator_hash',
    'curator',
    0,
    3,
    'curator',
    crypt('curator123', gen_salt('bf')), -- bcrypt hash для "curator123"
    now(),
    now()
)
ON CONFLICT (telegram_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    web_login = EXCLUDED.web_login,
    web_password_hash = EXCLUDED.web_password_hash,
    updated_at = now();

-- 6. Функция для веб-авторизации (используем существующую таблицу users)
CREATE OR REPLACE FUNCTION authenticate_web_user(
    login_param TEXT,
    password_param TEXT
)
RETURNS TABLE(
    user_id UUID,
    user_role TEXT,
    first_name TEXT,
    last_name TEXT,
    is_authenticated BOOLEAN
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Ищем пользователя по веб-логину
    SELECT 
        u.id,
        u.role,
        u.first_name,
        u.last_name,
        u.web_password_hash
    INTO user_record
    FROM public.users u
    WHERE u.web_login = login_param 
      AND u.role IN ('admin', 'curator')
      AND u.web_password_hash IS NOT NULL;

    -- Если пользователь найден, проверяем пароль
    IF FOUND THEN
        -- Для простоты пока сравниваем хеши напрямую
        -- В production нужно использовать bcrypt
        IF user_record.web_password_hash = crypt(password_param, user_record.web_password_hash) THEN
            -- Обновляем время последнего входа
            UPDATE public.users 
            SET web_last_login = now() 
            WHERE id = user_record.id;

            -- Возвращаем успешную авторизацию
            RETURN QUERY
            SELECT 
                user_record.id,
                user_record.role,
                user_record.first_name,
                user_record.last_name,
                true as is_authenticated;
        ELSE
            -- Неверный пароль
            RETURN QUERY
            SELECT 
                NULL::UUID,
                NULL::TEXT,
                NULL::TEXT,
                NULL::TEXT,
                false as is_authenticated;
        END IF;
    ELSE
        -- Пользователь не найден
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            false as is_authenticated;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Простая функция для обновления пароля (для будущего использования)
CREATE OR REPLACE FUNCTION update_web_password(
    user_id_param UUID,
    new_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.users 
    SET 
        web_password_hash = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = user_id_param 
      AND role IN ('admin', 'curator');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Проверяем созданные записи
SELECT 
    id,
    first_name,
    last_name,
    role,
    web_login,
    telegram_id,
    web_last_login,
    created_at
FROM public.users 
WHERE web_login IS NOT NULL
ORDER BY role DESC;

-- 9. Комментарии по архитектуре
/*
АРХИТЕКТУРА:

1. Обычные пользователи (через Telegram):
   - telegram_id заполнен
   - web_login = NULL
   - web_password_hash = NULL

2. Веб-админы/кураторы:
   - telegram_id = 'web_admin_system' (специальное значение)
   - web_login заполнен (уникальный)
   - web_password_hash заполнен

3. Гибридные пользователи (в будущем):
   - И telegram_id, и web_login заполнены
   - Может входить и через Telegram, и через веб

4. Простота:
   - Одна таблица users
   - Роли уже есть: 'user', 'curator', 'admin'
   - Никаких дополнительных JOIN
   - Легко расширять
*/ 