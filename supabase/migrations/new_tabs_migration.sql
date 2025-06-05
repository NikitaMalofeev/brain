-- Миграция для создания таблиц chats, faq и broadcasts
-- Версия: 1
-- Описание: Добавляет таблицы для управления чатами, FAQ и эфирами в админ-панели.

-- 1. Таблица для чатов
CREATE TABLE public.chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    link text NOT NULL,
    order_num integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.chats ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.chats ADD CONSTRAINT chats_pkey PRIMARY KEY (id);
COMMENT ON TABLE public.chats IS 'Список Telegram-чатов для пользователей';

-- 2. Таблица для эфиров
CREATE TABLE public.broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    broadcast_url text,
    start_time timestamp with time zone,
    status text DEFAULT 'planned'::text NOT NULL,
    recording_url text,
    order_num integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT broadcasts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'live'::text, 'completed'::text])))
);

ALTER TABLE public.broadcasts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.broadcasts ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);
COMMENT ON TABLE public.broadcasts IS 'Список эфиров и трансляций';

-- 3. Таблица для FAQ
CREATE TABLE public.faq (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    order_num integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.faq ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.faq ADD CONSTRAINT faq_pkey PRIMARY KEY (id);
COMMENT ON TABLE public.faq IS 'Часто задаваемые вопросы';

-- 4. Политики доступа (RLS) для таблицы chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read chats" ON public.chats;
CREATE POLICY "Allow authenticated users to read chats" ON public.chats
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admin users to manage chats" ON public.chats;
CREATE POLICY "Allow admin users to manage chats" ON public.chats
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5. Политики доступа (RLS) для таблицы faq
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read faq" ON public.faq;
CREATE POLICY "Allow authenticated users to read faq" ON public.faq
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admin users to manage faq" ON public.faq;
CREATE POLICY "Allow admin users to manage faq" ON public.faq
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6. Политики доступа (RLS) для таблицы broadcasts
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read broadcasts" ON public.broadcasts;
CREATE POLICY "Allow authenticated users to read broadcasts" ON public.broadcasts
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admin users to manage broadcasts" ON public.broadcasts;
CREATE POLICY "Allow admin users to manage broadcasts" ON public.broadcasts
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Сообщение о завершении
SELECT 'Миграция для chats, faq и broadcasts успешно завершена.'; 