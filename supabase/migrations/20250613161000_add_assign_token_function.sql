-- Функция: assign_access_token_to_user
-- Дата: 13.06.2025
-- Цель: Создание персонального токена и его автоматическая активация для пользователя

CREATE OR REPLACE FUNCTION assign_access_token_to_user(
    p_tg_id BIGINT,
    p_tariff_id UUID,
    p_course_id UUID,
    p_comment TEXT DEFAULT NULL,
    p_created_by_user_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    new_token TEXT;
    token_record RECORD;
    user_record RECORD;
    alphabet TEXT := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    token_length INTEGER := 16;
    i INTEGER;
BEGIN
    -- 1. Проверяем обязательные параметры
    IF p_tg_id IS NULL THEN
        RETURN json_build_object('error', 'Telegram ID обязателен');
    END IF;
    
    IF p_tariff_id IS NULL THEN
        RETURN json_build_object('error', 'Тариф обязателен');
    END IF;
    
    IF p_course_id IS NULL THEN
        RETURN json_build_object('error', 'Курс обязателен');
    END IF;

    -- 2. Проверяем существование тарифа и курса
    IF NOT EXISTS (SELECT 1 FROM public.tariffs WHERE id = p_tariff_id) THEN
        RETURN json_build_object('error', 'Тариф не найден');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RETURN json_build_object('error', 'Курс не найден');
    END IF;

    -- 3. Проверяем существует ли уже активный токен для этого tg_id
    IF EXISTS (
        SELECT 1 FROM public.access_tokens 
        WHERE tg_id = p_tg_id AND status = 'created'
    ) THEN
        RETURN json_build_object('error', 'У пользователя уже есть активный персональный токен');
    END IF;

    -- 4. Генерируем уникальный токен (base62, 16 символов)
    LOOP
        new_token := '';
        FOR i IN 1..token_length LOOP
            new_token := new_token || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
        END LOOP;
        
        -- Проверяем уникальность токена
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.access_tokens WHERE token = new_token);
    END LOOP;

    -- 5. Создаем токен
    INSERT INTO public.access_tokens (
        token, 
        course_id, 
        tariff_id, 
        tg_id,
        comment,
        created_by_user_id,
        status
    ) VALUES (
        new_token,
        p_course_id,
        p_tariff_id,
        p_tg_id,
        p_comment,
        p_created_by_user_id,
        'created'
    ) RETURNING * INTO token_record;

    -- 6. Ищем пользователя по telegram_id
    SELECT * INTO user_record 
    FROM public.users 
    WHERE telegram_id = p_tg_id::text;

    -- 7. Если пользователь найден - сразу активируем токен
    IF FOUND THEN
        -- а. Создаем связь пользователя с тарифом (если еще нет)
        INSERT INTO public.user_tariffs (user_id, tariff_id, is_active)
        SELECT user_record.id, p_tariff_id, true
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_tariffs 
            WHERE user_id = user_record.id AND tariff_id = p_tariff_id
        );

        -- Обновляем статус тарифа на активный, если связь уже существует
        UPDATE public.user_tariffs 
        SET is_active = true
        WHERE user_id = user_record.id AND tariff_id = p_tariff_id;

        -- б. Добавляем пользователя на курс, если его там еще нет
        INSERT INTO public.user_course_enrollments (user_id, course_id, enrollment_date, is_active)
        SELECT user_record.id, p_course_id, now(), true
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_course_enrollments 
            WHERE user_id = user_record.id AND course_id = p_course_id
        );

        -- в. Помечаем токен как использованный
        UPDATE public.access_tokens
        SET
            status = 'used',
            used_by_user_id = user_record.id,
            used_at = now()
        WHERE id = token_record.id;
        
        -- Возвращаем результат с информацией об автоматической активации
        RETURN json_build_object(
            'ok', true, 
            'token', new_token,
            'auto_activated', true,
            'user_id', user_record.id,
            'tariff_id', p_tariff_id, 
            'course_id', p_course_id,
            'message', 'Токен создан и автоматически активирован для пользователя'
        );
    ELSE
        -- Пользователь еще не зарегистрирован, токен будет активирован при первом входе
        RETURN json_build_object(
            'ok', true, 
            'token', new_token,
            'auto_activated', false,
            'tariff_id', p_tariff_id, 
            'course_id', p_course_id,
            'message', 'Токен создан и будет активирован при первом входе пользователя'
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Обработка ошибок
    RETURN json_build_object(
        'error', 'Ошибка при создании токена: ' || SQLERRM
    );
END;
$$; 