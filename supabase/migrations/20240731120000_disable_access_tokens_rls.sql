-- Отключение RLS для таблицы access_tokens
-- Поскольку доступ к админ-панели уже защищен веб-аутентификацией через логин/пароль

-- Удаляем существующую политику, если она есть
DROP POLICY IF EXISTS "Allow admin and curator access" ON access_tokens;

-- Отключаем Row Level Security для таблицы access_tokens
ALTER TABLE access_tokens DISABLE ROW LEVEL SECURITY;

-- Комментарий: Безопасность обеспечивается на уровне приложения
-- через проверку веб-авторизации админов и кураторов 