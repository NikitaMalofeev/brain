# Схема базы данных Supabase - Brain Programming

## Обзор

База данных приложения "Brain Programming" построена на PostgreSQL через Supabase и содержит 8 основных таблиц для управления пользователями, курсами, этапами обучения, уроками, заданиями и прогрессом пользователей.

## Таблицы и их назначение

### 1. `users` - Пользователи
**Назначение:** Хранение информации о пользователях приложения, интегрированных через Telegram Web App.

**Поля:**
- `id` (uuid, PK) - Уникальный идентификатор пользователя
- `telegram_id` (text, UNIQUE) - ID пользователя в Telegram
- `first_name` (text) - Имя пользователя
- `last_name` (text) - Фамилия пользователя  
- `username` (text) - Username в Telegram
- `photo_url` (text) - URL аватара пользователя
- `auth_date` (text) - Дата авторизации в Telegram
- `hash` (text) - Хеш для проверки подлинности данных Telegram
- `last_login` (timestamptz) - Время последнего входа
- `created_at` (timestamptz) - Время создания записи
- `updated_at` (timestamptz) - Время последнего обновления
- `total_points` (int4, default: 0) - Общее количество очков пользователя
- `lives_remaining` (int4, default: 3) - Количество оставшихся жизней

**RLS:** Включен (Row Level Security)

### 2. `courses` - Курсы
**Назначение:** Основные курсы обучения в приложении.

**Поля:**
- `id` (uuid, PK) - Уникальный идентификатор курса
- `title` (text) - Название курса
- `subtitle` (text) - Подзаголовок курса
- `created_at` (timestamptz) - Время создания

**Связи:**
- Один курс может иметь множество этапов (`course_stages`)
- Один курс может иметь множество записей о зачислении (`user_course_enrollments`)

### 3. `course_stages` - Этапы курса
**Назначение:** Этапы (ступени) внутри курсов, которые пользователи проходят последовательно.

**Поля:**
- `id` (bigint, PK) - Уникальный идентификатор этапа
- `course_id` (uuid, FK → courses.id) - Ссылка на курс
- `name` (text) - Название этапа
- `description` (text) - Описание этапа
- `order_num` (int4) - Порядковый номер этапа в курсе
- `unlock_condition_type` (text) - Тип условия разблокировки
- `unlock_condition_value` (text) - Значение условия разблокировки
- `created_at` (timestamptz) - Время создания
- `updated_at` (timestamptz) - Время обновления

**Связи:**
- Принадлежит одному курсу (`courses`)
- Может иметь множество уроков (`lessons`)
- Может иметь множество записей прогресса (`user_stage_progress`)

### 4. `lessons` - Уроки
**Назначение:** Отдельные уроки внутри этапов курса.

**Поля:**
- `id` (bigint, PK) - Уникальный идентификатор урока
- `stage_id` (bigint, FK → course_stages.id) - Ссылка на этап
- `name` (text) - Название урока
- `description` (text) - Описание урока
- `content_type` (text, default: 'text') - Тип контента урока
- `content_value` (text) - Содержимое урока
- `order_num` (int4) - Порядковый номер урока в этапе
- `estimated_duration_minutes` (int4) - Предполагаемая длительность в минутах
- `created_at` (timestamptz) - Время создания
- `updated_at` (timestamptz) - Время обновления

**Связи:**
- Принадлежит одному этапу (`course_stages`)
- Может иметь множество заданий (`assignments`)
- Может иметь множество записей прогресса (`user_lesson_progress`)

### 5. `assignments` - Задания
**Назначение:** Практические задания и упражнения внутри уроков.

**Поля:**
- `id` (bigint, PK) - Уникальный идентификатор задания
- `lesson_id` (bigint, FK → lessons.id) - Ссылка на урок
- `title` (text) - Название задания
- `description` (text) - Описание задания
- `assignment_type` (text, default: 'text_submission') - Тип задания
- `config` (jsonb) - Конфигурация задания в JSON формате
- `created_at` (timestamptz) - Время создания
- `updated_at` (timestamptz) - Время обновления

**Связи:**
- Принадлежит одному уроку (`lessons`)

### 6. `user_course_enrollments` - Зачисления на курсы
**Назначение:** Связь между пользователями и курсами, на которые они записаны.

**Поля:**
- `id` (bigint, PK) - Уникальный идентификатор записи
- `user_id` (uuid, FK → auth.users.id) - Ссылка на пользователя
- `course_id` (uuid, FK → courses.id) - Ссылка на курс
- `enrollment_date` (timestamptz) - Дата зачисления
- `is_active` (bool, default: true) - Активность зачисления
- `created_at` (timestamptz) - Время создания
- `updated_at` (timestamptz) - Время обновления

**Связи:**
- Связывает пользователя (`auth.users`) с курсом (`courses`)

### 7. `user_stage_progress` - Прогресс по этапам
**Назначение:** Отслеживание прогресса пользователей по этапам курсов.

**Поля:**
- `id` (bigint, PK) - Уникальный идентификатор записи
- `user_id` (uuid, FK → auth.users.id) - Ссылка на пользователя
- `stage_id` (bigint, FK → course_stages.id) - Ссылка на этап
- `status` (text, default: 'not_started') - Статус прохождения этапа
- `started_at` (timestamptz) - Время начала этапа
- `completed_at` (timestamptz) - Время завершения этапа
- `created_at` (timestamptz) - Время создания
- `updated_at` (timestamptz) - Время обновления

**Связи:**
- Связывает пользователя (`auth.users`) с этапом (`course_stages`)

### 8. `user_lesson_progress` - Прогресс по урокам
**Назначение:** Детальное отслеживание прогресса пользователей по отдельным урокам.

**Поля:**
- `id` (bigint, PK) - Уникальный идентификатор записи
- `user_id` (uuid, FK → auth.users.id) - Ссылка на пользователя
- `lesson_id` (bigint, FK → lessons.id) - Ссылка на урок
- `status` (text, default: 'not_started') - Статус прохождения урока
- `started_at` (timestamptz) - Время начала урока
- `completed_at` (timestamptz) - Время завершения урока
- `progress_details` (jsonb) - Детали прогресса в JSON формате
- `created_at` (timestamptz) - Время создания
- `updated_at` (timestamptz) - Время обновления

**Связи:**
- Связывает пользователя (`auth.users`) с уроком (`lessons`)

## Схема взаимосвязей

```
users (auth.users)
    ↓ (1:M)
user_course_enrollments
    ↓ (M:1)
courses
    ↓ (1:M)
course_stages
    ↓ (1:M)
lessons
    ↓ (1:M)
assignments

Прогресс пользователей:
users (auth.users) → user_stage_progress → course_stages
users (auth.users) → user_lesson_progress → lessons
```

## Ключевые особенности архитектуры

1. **Иерархическая структура контента:**
   - Курсы → Этапы → Уроки → Задания

2. **Двухуровневое отслеживание прогресса:**
   - Прогресс по этапам (`user_stage_progress`)
   - Детальный прогресс по урокам (`user_lesson_progress`)

3. **Гибкая система разблокировки:**
   - Поля `unlock_condition_type` и `unlock_condition_value` в `course_stages`

4. **Интеграция с Telegram:**
   - Таблица `users` адаптирована для Telegram Web App
   - Хранение Telegram ID и данных авторизации

5. **Геймификация:**
   - Система очков (`total_points`)
   - Система жизней (`lives_remaining`)

6. **Гибкость контента:**
   - JSON поля для конфигурации заданий (`assignments.config`)
   - JSON поля для детального прогресса (`user_lesson_progress.progress_details`)

## Статусы прогресса

**Возможные значения для полей `status`:**
- `not_started` - Не начато
- `in_progress` - В процессе
- `completed` - Завершено

## Примечания по безопасности

- Таблица `users` имеет включенный RLS (Row Level Security)
- Связи с пользователями ссылаются на `auth.users` (встроенная аутентификация Supabase)
- Остальные таблицы не имеют RLS, что требует настройки политик безопасности
