-- Migration: Add promote_user_to_curator function
-- Date: 27.06.2025
-- Purpose: Allow admins to promote regular users to curator role with web credentials

-- Примечание: Используем extensions.crypt() вместо прямого pgcrypto для совместимости с authenticate_web_user

-- Обновляем функцию promote_user_to_curator для поддержки явной передачи ID админа
CREATE OR REPLACE FUNCTION promote_user_to_curator(
    p_user_id UUID,
    p_web_login TEXT,
    p_web_password TEXT,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role TEXT;
    target_user_role TEXT;
    target_user_exists BOOLEAN;
    login_exists BOOLEAN;
BEGIN
    -- Шаг 1: Проверка прав доступа
    -- Проверяем, что admin_id передан
    IF p_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Admin ID is required';
    END IF;
    
    -- Получаем роль админа
    SELECT role INTO admin_role 
    FROM public.users 
    WHERE id = p_admin_id;
    
    -- Проверяем, что это действительно админ
    IF admin_role IS NULL OR admin_role != 'admin' THEN
        RAISE EXCEPTION 'Forbidden: Only admins can promote users to curator';
    END IF;
    
    -- Шаг 2: Валидация входных параметров
    -- Проверяем обязательные поля
    IF p_web_login IS NULL OR TRIM(p_web_login) = '' THEN
        RAISE EXCEPTION 'Web login is required';
    END IF;
    
    IF p_web_password IS NULL OR LENGTH(p_web_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters long';
    END IF;
    
    -- Проверяем уникальность логина
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE web_login = p_web_login AND id != p_user_id
    ) INTO login_exists;
    
    IF login_exists THEN
        RAISE EXCEPTION 'Web login already exists';
    END IF;
    
    -- Проверяем, что целевой пользователь существует
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) 
    INTO target_user_exists;
    
    IF NOT target_user_exists THEN
        RAISE EXCEPTION 'User not found: User with ID % does not exist', p_user_id;
    END IF;
    
    -- Получаем роль целевого пользователя
    SELECT role INTO target_user_role 
    FROM public.users 
    WHERE id = p_user_id;
    
    -- Проверяем, что пользователь не является уже куратором или админом
    IF target_user_role = 'curator' THEN
        RAISE EXCEPTION 'User is already a curator';
    END IF;
    
    IF target_user_role = 'admin' THEN
        RAISE EXCEPTION 'Cannot change admin role';
    END IF;
    
    -- Шаг 3: Удаление из списка учеников (если пользователь был учеником)
    DELETE FROM public.user_curator
    WHERE student_id = p_user_id;

    -- Шаг 4: Основное действие
    UPDATE public.users 
    SET 
        role = 'curator',
        web_login = p_web_login,
        web_password_hash = extensions.crypt(p_web_password, extensions.gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Логируем успешное выполнение
    RAISE NOTICE 'User % successfully promoted to curator with login % by admin %', p_user_id, p_web_login, p_admin_id;
    
END;
$$;

-- Предоставляем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION promote_user_to_curator(UUID, TEXT, TEXT, UUID) TO authenticated;

-- Обновляем комментарий к функции
COMMENT ON FUNCTION promote_user_to_curator(UUID, TEXT, TEXT, UUID) IS 
'Promotes a regular user to curator role with web credentials. Can only be executed by admin users.
Parameters:
- p_user_id: UUID of the user to promote
- p_web_login: Login for web interface access
- p_web_password: Password for web interface (will be hashed)
- p_admin_id: UUID of the admin making the promotion';