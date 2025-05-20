-- Включение RLS (Row Level Security) для таблицы users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика доступа на чтение: анонимные пользователи могут читать данные Telegram-пользователей
CREATE POLICY "Анонимные пользователи могут читать таблицу users"
ON public.users
FOR SELECT
TO anon
USING (true);

-- Политика доступа на вставку: анонимные пользователи могут создавать записи
CREATE POLICY "Анонимные пользователи могут создавать записи в таблице users"
ON public.users
FOR INSERT
TO anon
WITH CHECK (true);

-- Политика доступа на обновление: анонимные пользователи могут обновлять только свои записи
CREATE POLICY "Анонимные пользователи могут обновлять только свои записи в users"
ON public.users
FOR UPDATE
TO anon
USING (auth.uid() = id OR telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Примечание: для более безопасной настройки вы можете ограничить доступ:
-- Например, использовать проверку JWT токена для идентификации пользователя Telegram
-- И разрешать доступ только к своим данным

-- Пример более безопасной политики (требует настройки JWT и claims):
/*
CREATE POLICY "Пользователи могут видеть только свои данные"
ON public.users
FOR SELECT
TO anon
USING (telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id');
*/ 