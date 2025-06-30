-- Migration: Add course-chat access system with one-to-one relation
-- Date: 30.06.2025
-- Purpose: Enable chat access control based on both tariffs AND courses using direct course_id in chats table

-- 1. Add course_id column directly to chats table (one-to-one relation)
ALTER TABLE public.chats 
ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- 2. Set course_id for all existing chats (assuming default course)
-- Note: In production, you would need to update this with actual course IDs
UPDATE public.chats 
SET course_id = '1d66bf31-dc5b-4291-9581-f7f12cc373b6';

-- 3. Add comment to the new column
COMMENT ON COLUMN public.chats.course_id IS 'Привязка чата к конкретному курсу (один-к-одному)';

-- 4. Create optimized RPC function to get available chats for a user
CREATE OR REPLACE FUNCTION public.get_available_chats_for_user(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    link text,
    order_num integer,
    course_name text
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
    co.title as course_name
FROM public.chats c
LEFT JOIN public.courses co ON c.course_id = co.id
INNER JOIN public.tariff_chat_access tca ON c.id = tca.chat_id
INNER JOIN public.user_tariffs ut ON tca.tariff_id = ut.tariff_id 
    AND ut.user_id = p_user_id 
    AND ut.is_active = true
INNER JOIN public.user_course_enrollments uce ON c.course_id = uce.course_id 
    AND uce.user_id = p_user_id 
    AND uce.is_active = true
ORDER BY c.order_num;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_available_chats_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_chats_for_user(uuid) TO anon;

-- 6. Add function description
COMMENT ON FUNCTION public.get_available_chats_for_user(uuid) IS 'Returns chats available to user based on their active tariff AND course enrollment (one-to-one relation)'; 