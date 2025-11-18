# Edge Function: send-event-notifications

## Описание

Edge Function для отправки пуш-уведомлений пользователям о событиях календаря через Telegram Bot API.

Функция запускается ежедневно в 19:00 (настраивается через Cron) и отправляет уведомления о событиях, которые состоятся на следующий день.

## Переменные окружения

Необходимо настроить следующие переменные окружения в Supabase Dashboard:

- `TELEGRAM_BOT_TOKEN` - токен Telegram бота для отправки уведомлений
- `SUPABASE_URL` - URL вашего Supabase проекта (автоматически доступен)
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role ключ (автоматически доступен)

## Деплой

### 1. Установка Supabase CLI

```bash
npm install -g supabase
```

### 2. Логин в Supabase

```bash
supabase login
```

### 3. Деплой функции

```bash
supabase functions deploy send-event-notifications --project-ref YOUR_PROJECT_REF
```

### 4. Установка переменных окружения

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token_here --project-ref YOUR_PROJECT_REF
```

## Настройка Cron

После деплоя функции необходимо настроить Cron задачу в Supabase SQL Editor:

```sql
-- Настройка Cron для ежедневного запуска в 19:00 (UTC)
SELECT cron.schedule(
  'send-event-notifications-daily',
  '0 19 * * *', -- Каждый день в 19:00 UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

### Изменение времени отправки

Если нужно изменить время отправки (например, на 20:00):

```sql
-- Удаляем старое расписание
SELECT cron.unschedule('send-event-notifications-daily');

-- Создаем новое с другим временем
SELECT cron.schedule(
  'send-event-notifications-daily',
  '0 20 * * *', -- Каждый день в 20:00 UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

## Ручной запуск для тестирования

Для тестирования функции можно запустить её вручную:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Или через Supabase SQL Editor:

```sql
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
```

## Логика работы

1. Функция получает все события на завтра из таблицы `calendar_events`
2. Для каждого события находит всех пользователей, записанных на поток этого события
3. Отправляет каждому пользователю уведомление в Telegram
4. Возвращает статистику: количество обработанных событий, отправленных уведомлений и ошибок

## Формат уведомления

Пример уведомления в Telegram:

```
🎥 Напоминание о событии

Завтра в 19:00: Вебинар по медитации

Вводный вебинар для новичков

📚 Модуль: Исцеление
```

Эмодзи выбирается в зависимости от типа события:
- 🎥 - Zoom вебинар
- 📍 - Оффлайн встреча
- 📖 - Открытие урока
- 📄 - Открытие материала
- 🎧 - Открытие техники

## Мониторинг

Логи функции можно посмотреть в Supabase Dashboard:
1. Перейдите в раздел "Edge Functions"
2. Выберите функцию "send-event-notifications"
3. Откройте вкладку "Logs"

## Зависимости

- SQL функция `get_users_for_event(UUID)` - получение пользователей для события
- Таблицы: `calendar_events`, `user_stream_enrollments`, `users`, `stream_modules`
- Telegram Bot API

## Автор

**Claude Code** - автоматическая генерация кода
**Дата создания**: 17.11.2025
