-- Добавляем поле personal_chat_link в таблицу users
ALTER TABLE users 
ADD COLUMN personal_chat_link text NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN users.personal_chat_link IS 'Ссылка на персональный чат пользователя (например, Telegram чат с куратором)'; 