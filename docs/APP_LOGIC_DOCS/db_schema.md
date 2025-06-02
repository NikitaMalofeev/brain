# Схема базы данных Supabase - Brain Programming
*Обновлено: 27.05.2025 - Актуальное состояние БД*

## Обзор

База данных приложения "Brain Programming" построена на PostgreSQL через Supabase и содержит 9 основных таблиц для управления пользователями, курсами, этапами обучения, уроками, блоками контента и прогрессом пользователей.

**Проект Supabase:** `bzbpwmzhywaqwsjthwid` (EU Central 1)

## Таблицы и их назначение

### 1. `users` - Пользователи
**Назначение:** Хранение информации о пользователях приложения, интегрированных через Telegram Web App.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор пользователя
- `telegram_id` (text, UNIQUE) - ID пользователя в Telegram (⚠️ **ИСПРАВЛЕНИЕ:** тип TEXT, не bigint)
- `first_name` (text) - Имя пользователя
- `last_name` (text) - Фамилия пользователя  
- `username` (text) - Username в Telegram
- `photo_url` (text) - URL аватара пользователя
- `auth_date` (text) - Дата авторизации в Telegram (⚠️ **ИСПРАВЛЕНИЕ:** тип TEXT, не bigint)
- `hash` (text) - Хеш для проверки подлинности данных Telegram
- `last_login` (timestamptz) - Время последнего входа
- `created_at` (timestamptz, default: now()) - Время создания записи
- `updated_at` (timestamptz, default: now()) - Время последнего обновления
- `total_points` (int4, default: 0) - Общее количество очков пользователя
- `lives_remaining` (int4, default: 3) - Количество оставшихся жизней
- `role` (text, default: 'user') - Роль пользователя: 'user', 'curator', 'admin'

**❌ ОТСУТСТВУЮЩИЕ поля из документации:**
- `is_admin` (boolean, default: false) - Флаг администратора (⚠️ **ЗАМЕНЕН** на поле `role`)
- `access_till` (timestamptz) - Дата окончания доступа (nullable)

**🔒 Система ролей:**
- **user** - обычный пользователь, доступ только к материалам курса
- **curator** - куратор, может проверять домашние задания и выставлять баллы
- **admin** - администратор, полный доступ к админке включая управление контентом

**Проверка прав доступа:**
- SQL функция `is_curator_or_admin()` проверяет роль пользователя
- В админке интерфейс адаптируется под роль пользователя

**RLS:** Включен (Row Level Security)

### 2. `courses` - Курсы
**Назначение:** Основные курсы обучения в приложении.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор курса
- `title` (text, NOT NULL) - Название курса
- `subtitle` (text) - Подзаголовок курса
- `created_at` (timestamptz, default: now()) - Время создания

**RLS:** ВЫКЛЮЧЕН

### 3. `course_stages` - Этапы курса
**Назначение:** Этапы (ступени) внутри курсов, которые пользователи проходят последовательно.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор этапа
- `course_id` (uuid, FK → courses.id, NOT NULL) - Ссылка на курс
- `name` (text, NOT NULL) - Название этапа
- `description` (text) - Описание этапа
- `order_num` (int4, NOT NULL) - Порядковый номер этапа в курсе
- `unlock_condition_type` (text) - Тип условия разблокировки
- `unlock_condition_value` (text) - Значение условия разблокировки
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления
- `is_unlocked` (boolean, default: false, NOT NULL) - Флаг разблокировки этапа

**RLS:** ВЫКЛЮЧЕН

### 4. `lessons` - Уроки
**Назначение:** Отдельные уроки внутри этапов курса. Урок содержит блоки контента.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор урока
- `stage_id` (bigint, FK → course_stages.id, NOT NULL) - Ссылка на этап
- `name` (text, NOT NULL) - Название урока
- `description` (text) - Описание урока
- `order_num` (int4, NOT NULL) - Порядковый номер урока в этапе
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления
- `cover_image_path` (text) - Путь к файлу обложки в CloudFlare R2 (например: images/filename.webp)
- `has_assignment` (boolean, default: false) - Есть ли в уроке домашнее задание для сдачи
- `open_at` (timestamptz) - Дата и время открытия урока (до этого времени урок недоступен)
- `deadline_at` (timestamptz) - Дедлайн сдачи задания (после этого времени поздняя сдача)

**⭐ Новые поля для временного управления (добавлены 30.01.2025):**
- `open_at` - позволяет настроить точное время открытия урока для пользователей
- `deadline_at` - автоматически устанавливается как open_at + 2 дня в админке
- Используются для определения статуса "Откроется завтра" и просроченных сдач

**RLS:** ВЫКЛЮЧЕН

### 5. `lesson_blocks` - Блоки контента урока
**Назначение:** Блоки контента внутри уроков (текст, видео, аудио, изображения, файлы).

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор блока
- `lesson_id` (bigint, FK → lessons.id, NOT NULL) - Ссылка на урок
- `order_num` (int4, NOT NULL) - Порядковый номер блока в уроке
- `title` (text) - Заголовок блока
- `block_type` (text, NOT NULL) - Тип блока: 'text', 'video', 'audio', 'image', 'pdf'
- `content_text` (text) - Текстовое содержимое для text-блоков
- `content_url` (text) - URL для файлов/медиа контента
- `meta_json` (jsonb, default: '{}') - Дополнительные поля: длительность видео, подписи и т.п.
- `created_at` (timestamptz, default: now()) - Время создания
- `updated_at` (timestamptz, default: now()) - Время обновления

**⚠️ ПРОБЛЕМА:** В CHECK constraint еще есть тип 'assignment_instruction', который должен быть удален

**RLS:** Включен

### 6. `lesson_progress` - Прогресс по урокам
**Назначение:** Детальное отслеживание прогресса пользователей по отдельным урокам.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `lesson_id` (bigint, FK → lessons.id, NOT NULL) - Ссылка на урок
- `started_at` (timestamptz) - Время начала урока
- `completed_at` (timestamptz) - Время завершения урока
- `is_completed` (bool, default: false) - Флаг завершения урока
- `submission_id` (bigint, FK → submissions.id) - Связь с сдачей, если есть
- `created_at` (timestamptz, default: now()) - Время создания
- `updated_at` (timestamptz, default: now()) - Время обновления

**Ограничения:**
- Уникальная связь (user_id, lesson_id)

**RLS:** Включен

### 7. `submissions` - Сдачи заданий
**Назначение:** Хранение сдач заданий пользователями и результатов их проверки.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор сдачи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `lesson_id` (bigint, FK → lessons.id, NOT NULL) - Ссылка на урок
- `submitted_at` (timestamptz, default: now()) - Время сдачи
- `content_text` (text) - Текстовая сдача
- `file_url` (text) - URL файла в Supabase Storage
- `status` (text, default: 'submitted', NOT NULL) - Статус: 'submitted', 'pending_review', 'approved', 'rejected', 'late'
- `reviewed_by_curator_id` (uuid, FK → users.id) - Куратор, который проверил
- `reviewed_at` (timestamptz) - Время проверки
- `feedback_text` (text) - Обратная связь от куратора
- `points_awarded` (int4, default: 0) - Начисленные баллы
- `created_at` (timestamptz, default: now()) - Время создания
- `updated_at` (timestamptz, default: now()) - Время обновления

**RLS:** Включен

### 8. `user_course_enrollments` - Зачисления на курсы
**Назначение:** Связь между пользователями и курсами, на которые они записаны.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `course_id` (uuid, FK → courses.id, NOT NULL) - Ссылка на курс
- `enrollment_date` (timestamptz, default: CURRENT_TIMESTAMP, NOT NULL) - Дата зачисления
- `is_active` (bool, default: true) - Активность зачисления
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления

**RLS:** ВЫКЛЮЧЕН

### 9. `user_stage_progress` - Прогресс по этапам
**Назначение:** Отслеживание прогресса пользователей по этапам курсов.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → user_stage_progress.user_id, NOT NULL) - Ссылка на пользователя
- `stage_id` (bigint, FK → course_stages.id, NOT NULL) - Ссылка на этап
- `status` (text, default: 'not_started') - Статус прохождения этапа
- `started_at` (timestamptz) - Время начала этапа
- `completed_at` (timestamptz) - Время завершения этапа
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления

**⚠️ ПРОБЛЕМА:** FK ссылается на `auth.users`, а должен на `public.users`

**RLS:** ВЫКЛЮЧЕН

## Функции базы данных

### `get_lesson_blocks(lesson_id_param BIGINT)`
**Назначение:** Возвращает все блоки контента для указанного урока в правильном порядке.

**Параметры:**
- `lesson_id_param` - ID урока

**Возвращает:**
- `block_id` (bigint)
- `order_num` (integer) 
- `title` (text)
- `block_type` (text)
- `content_text` (text)
- `content_url` (text) 
- `meta_json` (jsonb)
- `is_required` (boolean) - ⚠️ **ПРОБЛЕМА:** поля `is_required` нет в таблице!

### `get_library_stages(p_user_id UUID, p_course_id UUID)`
**Назначение:** Получает список этапов курса с прогрессом пользователя (используется в LibraryPage).

**Параметры:**
- `p_user_id` - ID пользователя
- `p_course_id` - ID курса

**Возвращает:**
- `stage_id` (bigint)
- `stage_name` (text)
- `stage_order_num` (integer)
- `stage_description` (text)
- `is_unlocked` (boolean) - использует поле из `course_stages.is_unlocked`
- `total_lessons` (bigint)
- `completed_lessons` (bigint)
- `unlock_condition_type_val` (text)
- `unlock_condition_value_val` (text)

### `lesson_has_submission(lesson_id_param BIGINT)` ⚠️ УСТАРЕВШАЯ
**Назначение:** Проверяет есть ли в уроке форма сдачи.

**⚠️ ПРОБЛЕМА:** Функция проверяет блоки типа `assignment_instruction`, а должна проверять поле `has_assignment` в таблице `lessons`.

**Возвращает:** `BOOLEAN`

### `mark_lesson_completed(lesson_id_param BIGINT, user_id_param UUID)`
**Назначение:** Отмечает урок как завершенный для указанного пользователя.

**Параметры:**
- `lesson_id_param` - ID урока
- `user_id_param` - ID пользователя (по умолчанию `auth.uid()`)

**Возвращает:** `BOOLEAN`

## Триггеры

### Автоматическое обновление `updated_at`
- `set_timestamp_course_stages` - для `course_stages` (BEFORE UPDATE)
- `set_timestamp_lessons` - для `lessons` (BEFORE UPDATE)
- `set_timestamp_user_course_enrollments` - для `user_course_enrollments` (BEFORE UPDATE)
- `set_timestamp_user_stage_progress` - для `user_stage_progress` (BEFORE UPDATE)
- `update_lesson_blocks_updated_at` - для `lesson_blocks` (BEFORE UPDATE)
- `update_lesson_progress_updated_at` - для `lesson_progress` (BEFORE UPDATE)
- `update_submissions_updated_at` - для `submissions` (BEFORE UPDATE)

### Связывание сдач с прогрессом
- `link_submission_to_lesson_progress_trigger` - при создании сдачи автоматически обновляет `lesson_progress` (AFTER INSERT на `submissions`)

### Каскадное удаление
- `lesson_progress_deletion_trigger` - при удалении `lesson_progress` обрабатывает связанные записи (AFTER DELETE)
- `handle_submission_deletion_trigger` - при удалении `submissions` обрабатывает связанные записи (AFTER DELETE)

## Представления (Views)

### `user_lesson_progress_view` ⚠️ УСТАРЕВШЕЕ
**Назначение:** Объединяет прогресс пользователя по урокам с данными о сдачах заданий.

**⚠️ ПРОБЛЕМА:** В поле `has_submission` используется старая логика проверки блоков `assignment_instruction`, а должно использоваться поле `lessons.has_assignment`.

**Поля:**
- `user_id`, `lesson_id`, `lesson_name`, `stage_id`
- `started_at`, `completed_at`, `is_completed`, `submission_id`
- `submission_status`, `points_awarded`, `feedback_text`, `reviewed_at`
- `has_submission` - ⚠️ **ПРОБЛЕМА:** проверяет блоки вместо поля `has_assignment`

## Политики RLS (Row Level Security)

### `lesson_blocks`
- `lesson_blocks_select_policy` - чтение для всех аутентифицированных пользователей

### `lesson_progress`
- `lesson_progress_select_policy` - пользователи видят только свой прогресс
- `lesson_progress_insert_policy` - пользователи могут создавать свой прогресс
- `lesson_progress_update_policy` - пользователи могут обновлять свой прогресс

### `submissions`
- `submissions_select_policy` - пользователи видят свои сдачи + кураторы видят назначенные им
- `submissions_insert_policy` - пользователи могут создавать свои сдачи
- `submissions_update_policy` - пользователи и кураторы могут обновлять сдачи

### `users`
- `Анонимные пользователи могут чита` - SELECT для анонимных пользователей
- `Анонимные пользователи могут созд` - INSERT для анонимных пользователей
- `Анонимные пользователи могут обно` - UPDATE для анонимных пользователей (через Telegram ID)

## Выявленные проблемы и несоответствия

### 🚨 Критические проблемы
1. **Функция `lesson_has_submission`** - использует устаревшую логику блоков `assignment_instruction`
2. **Представление `user_lesson_progress_view`** - использует устаревшую логику в поле `has_submission`
3. **CHECK constraint в `lesson_blocks`** - до сих пор разрешает тип `assignment_instruction`
4. **FK в `user_stage_progress`** - ссылается на `auth.users` вместо `public.users`

### ⚠️ Несоответствия документации
1. **`users.telegram_id`** - тип TEXT вместо bigint
2. **`users.auth_date`** - тип TEXT вместо bigint
3. **Отсутствуют поля** `users.is_admin` и `users.access_till`
4. **Функция `get_lesson_blocks`** - возвращает несуществующее поле `is_required`

### 🔧 Требуемые исправления

1. **Обновить функцию `lesson_has_submission`:**
```sql
CREATE OR REPLACE FUNCTION public.lesson_has_submission(lesson_id_param bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT has_assignment FROM lessons WHERE id = lesson_id_param);
END;
$$;
```

2. **Обновить представление `user_lesson_progress_view`:**
```sql
CREATE OR REPLACE VIEW user_lesson_progress_view AS
SELECT 
    lp.user_id,
    l.id AS lesson_id,
    l.name AS lesson_name,
    l.stage_id,
    lp.started_at,
    lp.completed_at,
    lp.is_completed,
    lp.submission_id,
    s.status AS submission_status,
    s.points_awarded,
    s.feedback_text,
    s.reviewed_at,
    l.has_assignment AS has_submission  -- ИСПРАВЛЕНИЕ
FROM lesson_progress lp
JOIN lessons l ON lp.lesson_id = l.id
LEFT JOIN submissions s ON lp.submission_id = s.id
ORDER BY l.order_num;
```

3. **Обновить CHECK constraint для `lesson_blocks`:**
```sql
ALTER TABLE lesson_blocks 
DROP CONSTRAINT IF EXISTS lesson_blocks_block_type_check;

ALTER TABLE lesson_blocks 
ADD CONSTRAINT lesson_blocks_block_type_check 
CHECK (block_type = ANY (ARRAY['text'::text, 'video'::text, 'audio'::text, 'image'::text, 'pdf'::text]));
```

4. **Исправить FK в `user_stage_progress`:**
```sql
ALTER TABLE user_stage_progress 
DROP CONSTRAINT IF EXISTS user_stage_progress_user_id_fkey;

ALTER TABLE user_stage_progress 
ADD CONSTRAINT user_stage_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);
```

## Статусы прогресса

**Статусы `user_stage_progress.status`:**
- `not_started` - Не начато
- `in_progress` - В процессе
- `completed` - Завершено

**Статусы `submissions.status`:**
- `submitted` - Сдано
- `pending_review` - Ожидает проверки
- `approved` - Одобрено
- `rejected` - Отклонено
- `late` - Сдано с опозданием

**Типы блоков `lesson_blocks.block_type`:**
- `text` - Текстовый блок
- `video` - Видео контент
- `audio` - Аудио контент
- `image` - Изображение
- `pdf` - PDF файл
- ~~`assignment_instruction`~~ - **УСТАРЕЛ** (заменен на `lessons.has_assignment`)

## Схема взаимосвязей

```
users
    ↓ (1:M)
user_course_enrollments
    ↓ (M:1)
courses
    ↓ (1:M)
course_stages [is_unlocked field]
    ↓ (1:M)
lessons [has_assignment field]
    ↓ (1:M)
lesson_blocks
    
lessons
    ↓ (1:M)
submissions
    ↓ (1:1)
lesson_progress [через submission_id]

Прогресс пользователей:
users → user_stage_progress → course_stages
users → lesson_progress → lessons
users → submissions → lessons
```

## Примеры использования

### Получение урока со всеми блоками:
```sql
SELECT * FROM get_lesson_blocks(4);
```

### Проверка наличия формы сдачи (ИСПРАВЛЕННАЯ):
```sql
SELECT has_assignment FROM lessons WHERE id = 4;
-- ИЛИ (после исправления функции):
SELECT lesson_has_submission(4);
```

### Получение этапов курса для пользователя:
```sql
SELECT * FROM get_library_stages($user_id, $course_id);
```

### Создание сдачи:
```sql
INSERT INTO submissions (user_id, lesson_id, content_text)
VALUES ($user_id, $lesson_id, $content);
```
