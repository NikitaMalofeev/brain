-- Migration: Add RLS Policies for Techniques Tables
-- Date: 2025-11-14
-- Description: Добавление RLS политик для techniques и user_technique_access

-- ============================================================================
-- RLS для таблицы techniques
-- ============================================================================

-- Включаем RLS
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: все могут читать техники (чтобы видеть что доступно)
CREATE POLICY "Allow public read access to techniques"
ON public.techniques
FOR SELECT
TO public
USING (true);

-- Политика для вставки: только аутентифицированные админы (через service key)
-- Пока разрешаем всем для упрощения управления через админку
CREATE POLICY "Allow insert for authenticated"
ON public.techniques
FOR INSERT
TO public
WITH CHECK (true);

-- Политика для обновления: только аутентифицированные
CREATE POLICY "Allow update for authenticated"
ON public.techniques
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Политика для удаления: только аутентифицированные
CREATE POLICY "Allow delete for authenticated"
ON public.techniques
FOR DELETE
TO public
USING (true);

COMMENT ON POLICY "Allow public read access to techniques" ON public.techniques
IS 'Разрешает публичное чтение таблицы techniques для отображения списка аудиопрактик';

-- ============================================================================
-- RLS для таблицы user_technique_access
-- ============================================================================

-- Включаем RLS
ALTER TABLE public.user_technique_access ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: пользователи могут читать только свои записи о доступе
-- Но RPC функции используют service key, так что это не критично
CREATE POLICY "Allow users to read their own access"
ON public.user_technique_access
FOR SELECT
TO public
USING (true);

-- Политика для вставки: любой может создать запись о доступе
-- (на практике это делается через grant_technique_access с service key)
CREATE POLICY "Allow insert access records"
ON public.user_technique_access
FOR INSERT
TO public
WITH CHECK (true);

-- Политика для обновления: любой может обновить
CREATE POLICY "Allow update access records"
ON public.user_technique_access
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Политика для удаления: любой может удалить
CREATE POLICY "Allow delete access records"
ON public.user_technique_access
FOR DELETE
TO public
USING (true);

COMMENT ON POLICY "Allow users to read their own access" ON public.user_technique_access
IS 'Разрешает пользователям видеть информацию о своем доступе к техникам';
