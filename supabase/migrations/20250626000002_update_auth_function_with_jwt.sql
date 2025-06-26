-- Обновленная функция, которая СОХРАНЯЕТ существующую логику и добавляет JWT
CREATE OR REPLACE FUNCTION authenticate_web_user(
  login_param TEXT,
  password_param TEXT
)
RETURNS TABLE (
  user_id UUID,
  user_role TEXT,
  first_name TEXT,
  last_name TEXT,
  is_authenticated BOOLEAN,
  access_token TEXT -- Новое поле для токена
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    token_payload JSON;
BEGIN
    -- Ищем пользователя по веб-логину (твоя логика)
    SELECT
        u.id,
        u.role::TEXT,
        u.first_name,
        u.last_name,
        u.web_password_hash
    INTO user_record
    FROM public.users u
    WHERE u.web_login = login_param
      AND u.role IN ('admin', 'curator')
      AND u.web_password_hash IS NOT NULL;

    -- Если пользователь найден, проверяем пароль (твоя логика)
    IF FOUND THEN
        -- Проверяем пароль с помощью extensions.crypt (ИСПРАВЛЕНО)
        IF user_record.web_password_hash = extensions.crypt(password_param, user_record.web_password_hash) THEN
            -- Обновляем время последнего входа (СОХРАНЕНО)
            UPDATE public.users
            SET web_last_login = now()
            WHERE id = user_record.id;

            -- >>> НАЧАЛО НОВОЙ ЛОГИКИ <<<
            -- Формируем полезную нагрузку для JWT
            token_payload := json_build_object(
              'sub', user_record.id,
              'role', 'authenticated',
              'user_role', user_record.role, -- Наша кастомная роль
              'exp', extract(epoch from now() + interval '8 hour') -- Время жизни токена
            );
            -- >>> КОНЕЦ НОВОЙ ЛОГИКИ <<<

            -- Возвращаем успешную авторизацию + токен (ОБЪЕДИНЕНО)
            RETURN QUERY
            SELECT
                user_record.id,
                user_record.role,
                user_record.first_name,
                user_record.last_name,
                true as is_authenticated,
                sign(token_payload, current_setting('app.settings.jwt_secret'))::TEXT; -- Добавили токен
        ELSE
            -- Неверный пароль (твоя логика)
            RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false, NULL::TEXT;
        END IF;
    ELSE
        -- Пользователь не найден (твоя логика)
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false, NULL::TEXT;
    END IF;
END;
$$;