# Изменения в базе данных и системе доступа

## Новые поля и таблицы

### 1. Поле `access_till` в таблице `users`

В таблицу `users` добавлено поле `access_till` типа `timestamp with time zone`, которое определяет дату окончания доступа пользователя к премиум-контенту.

```sql
ALTER TABLE public.users ADD COLUMN access_till TIMESTAMP WITH TIME ZONE DEFAULT NULL;
COMMENT ON COLUMN public.users.access_till IS 'Дата окончания доступа пользователя к премиум-контенту';
```

### 2. Таблица `webhook_logs`

Создана новая таблица `webhook_logs` для логирования входящих вебхуков:

```sql
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

## API для управления доступом

### Вебхук `/api/set_access_date`

Реализован вебхук для управления датой окончания доступа пользователя:

- **URL**: `/api/set_access_date`
- **Метод**: `POST`
- **Параметры**:
  - `userid`: ID пользователя в Telegram (строка или число)
  - `date`: Дата окончания доступа в ISO формате
- **Пример запроса**:

```json
{
  "userid": "123456789",
  "date": "2024-12-31T23:59:59.999Z"
}
```

- **Пример успешного ответа**:

```json
{
  "success": true,
  "message": "Access date updated for user 123456789",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "access_till": "2024-12-31T23:59:59.999Z"
}
```

- **Логирование**: Все запросы и ответы логируются в таблице `webhook_logs` для аудита и отладки.

## Компоненты для управления доступом

### 1. Хук `useAccessCheck`

Создан React-хук для проверки статуса доступа пользователя:

```typescript
const { isLoading, hasAccess, accessTill, isAdmin, error } = useAccessCheck(userId);
```

### 2. Компонент `AccessStatus`

Реализован компонент для отображения статуса доступа пользователя:

```jsx
<AccessStatus userId={user.id} showDetails={true} />
```

### 3. Утилиты для проверки доступа

Добавлены функции для программной проверки доступа:

```typescript
// Проверка доступа пользователя
const hasAccess = await checkUserAccess(userId);

// Создание middleware для проверки доступа
const checkAccess = createAccessMiddleware(() => {
  // Код, выполняемый при отсутствии доступа
  navigate('/subscription');
});
```

## Особенности реализации

1. **Админский доступ**: Пользователи с флагом `is_admin` всегда имеют доступ к премиум-контенту, независимо от поля `access_till`.

2. **Логика проверки доступа**:
   - Если `is_admin` = `true`, пользователь имеет доступ
   - Если `access_till` = `NULL`, доступ отсутствует
   - Если текущая дата > `access_till`, доступ истек
   - Если текущая дата <= `access_till`, доступ активен

3. **Логирование вебхуков**: Все входящие вебхуки логируются в таблице `webhook_logs` с полной информацией о запросе и ответе для последующего анализа.

## Интеграция с существующей кодовой базой

1. Обновлены типы в `src/lib/supabase/types.ts` для поддержки новых полей.
2. Добавлен компонент `AccessStatus` для отображения информации о доступе.
3. Добавлены утилиты и хуки для проверки доступа в реальном времени.

## Планы на будущее

- Реализация страницы подписки для пользователей с истекшим доступом
- Интеграция с платежной системой для автоматического продления доступа
- Разработка интерфейса админа для управления доступом пользователей
- Реализация уведомлений об истечении доступа 