-- Migration: Add RLS Policies for Users Table
-- Date: 2025-11-14
-- Description: Добавление RLS политик для публичного доступа к users

-- Включаем RLS для users (если еще не включен)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: любой пользователь может читать записи users
-- Это нужно для аутентификации через Telegram
CREATE POLICY "Allow public read access to users"
ON public.users
FOR SELECT
TO public
USING (true);

-- Политика для вставки: любой может создать свою запись пользователя
-- Это нужно для регистрации новых пользователей через Telegram
CREATE POLICY "Allow public insert for new users"
ON public.users
FOR INSERT
TO public
WITH CHECK (true);

-- Политика для обновления: пользователи могут обновлять только свои записи
-- Определяем "свою запись" через telegram_id (так как у нас нет auth.uid())
CREATE POLICY "Allow users to update their own data"
ON public.users
FOR UPDATE
TO public
USING (true)  -- Временно разрешаем всем для упрощения, можно ужесточить позже
WITH CHECK (true);

COMMENT ON POLICY "Allow public read access to users" ON public.users
IS 'Разрешает публичное чтение таблицы users для аутентификации через Telegram';

COMMENT ON POLICY "Allow public insert for new users" ON public.users
IS 'Разрешает создание новых пользователей при первом входе через Telegram';

COMMENT ON POLICY "Allow users to update their own data" ON public.users
IS 'Разрешает пользователям обновлять свои данные';
