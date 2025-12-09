-- Migration: Add avatar_url to chats table
-- Date: 2025-12-09
-- Description: Добавляет колонку avatar_url в таблицу chats для хранения аватаров чатов

-- 1. Добавляем колонку avatar_url
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.chats.avatar_url IS 'Путь к аватару чата в хранилище';

-- 2. Пересоздаём RPC функцию для получения чатов пользователя с avatar_url
DROP FUNCTION IF EXISTS public.get_available_chats_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_available_chats_for_user(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    link text,
    order_num integer,
    stream_name text,
    avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT DISTINCT
        c.id,
        c.name,
        c.description,
        c.link,
        c.order_num,
        s.name as stream_name,
        c.avatar_url
    FROM public.chats c
    LEFT JOIN public.streams s ON c.stream_id = s.id
    -- Проверяем, что пользователь записан на поток чата
    INNER JOIN public.user_stream_enrollments use ON c.stream_id = use.stream_id
        AND use.user_id = p_user_id
    -- Проверяем, что у пользователя есть подходящий тариф для этого чата
    INNER JOIN public.tariff_chat_access tca ON c.id = tca.chat_id
    INNER JOIN public.user_tariffs ut ON tca.tariff_id = ut.tariff_id
        AND ut.user_id = p_user_id
        AND ut.is_active = true
    ORDER BY c.order_num;
$$;

COMMENT ON FUNCTION public.get_available_chats_for_user(uuid) IS 'Возвращает доступные чаты для пользователя на основе его потока и тарифа';

GRANT EXECUTE ON FUNCTION public.get_available_chats_for_user(uuid) TO authenticated;
