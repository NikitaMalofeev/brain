-- Функция: find_access_token_by_tg_id
-- Дата: 13.06.2025
-- Цель: Поиск неактивированного персонального токена по Telegram ID

CREATE OR REPLACE FUNCTION find_access_token_by_tg_id(p_tg_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    token_record RECORD;
BEGIN
    -- Проверяем параметр
    IF p_tg_id IS NULL THEN
        RETURN json_build_object('error', 'Telegram ID обязателен');
    END IF;

    -- Ищем неактивированный токен для данного tg_id
    SELECT 
        token,
        course_id,
        tariff_id,
        comment,
        created_at
    INTO token_record
    FROM public.access_tokens
    WHERE tg_id = p_tg_id 
      AND status = 'created'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Если токен найден
    IF FOUND THEN
        RETURN json_build_object(
            'found', true,
            'token', token_record.token,
            'course_id', token_record.course_id,
            'tariff_id', token_record.tariff_id,
            'comment', token_record.comment,
            'created_at', token_record.created_at
        );
    ELSE
        RETURN json_build_object(
            'found', false,
            'message', 'Персональный токен не найден'
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', 'Ошибка при поиске токена: ' || SQLERRM
    );
END;
$$; 