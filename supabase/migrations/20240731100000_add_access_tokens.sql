-- Создание таблицы для токенов доступа
CREATE TABLE access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL,
    course_id UUID REFERENCES courses(id),
    tariff_id UUID REFERENCES tariffs(id),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'used', 'revoked')),
    used_by_user_id UUID REFERENCES users(id), -- ИСПРАВЛЕНО: было profiles, стало users
    used_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id), -- ИСПРАВЛЕНО: было profiles, стало users  
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Уникальный индекс для токена, чтобы избежать дубликатов
CREATE UNIQUE INDEX access_tokens_token_uidx ON access_tokens(token);

-- RLS отключен для access_tokens, так как доступ к админ-панели уже защищен
-- веб-аутентификацией через логин/пароль
-- ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Политика доступа не нужна, так как таблица доступна только из админ-панели,
-- которая уже защищена собственной системой аутентификации 