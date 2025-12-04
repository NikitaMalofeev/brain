-- Migration: Change chats from course_id to stream_id
-- Date: 2025-12-04
-- Description: Привязка чатов к потокам вместо курсов, с учётом тарифов

-- 1. Добавляем колонку stream_id
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL;

-- 2. Удаляем старую колонку course_id
ALTER TABLE public.chats
DROP COLUMN IF EXISTS course_id;

-- 3. Пересоздаём RPC функцию для получения чатов пользователя
-- Чат доступен если: пользователь записан на поток чата И имеет подходящий тариф
DROP FUNCTION IF EXISTS public.get_available_chats_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_available_chats_for_user(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    link text,
    order_num integer,
    stream_name text
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
        s.name as stream_name
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

-- 4. Создаём индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_chats_stream_id ON public.chats(stream_id);
