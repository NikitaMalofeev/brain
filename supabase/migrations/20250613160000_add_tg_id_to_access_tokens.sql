-- Миграция: Добавление поля tg_id в таблицу access_tokens
-- Дата: 13.06.2025
-- Цель: Поддержка персональных токенов привязанных к Telegram ID

-- Добавляем поле tg_id для хранения Telegram ID пользователя
ALTER TABLE access_tokens 
ADD COLUMN tg_id BIGINT NULL;

-- Создаем индекс для быстрого поиска токенов по Telegram ID
-- Используем частичный индекс только для записей где tg_id не NULL
CREATE INDEX access_tokens_tg_id_idx 
ON access_tokens(tg_id) 
WHERE tg_id IS NOT NULL;

-- Добавляем комментарий к новому полю
COMMENT ON COLUMN access_tokens.tg_id IS 'Telegram ID пользователя для персональных токенов (nullable)';

-- Обновляем комментарий к таблице
COMMENT ON TABLE access_tokens IS 'Токены доступа для автоматического зачисления пользователей на курсы. Поддерживает как обычные токены (через ссылки), так и персональные токены (привязанные к tg_id)'; 