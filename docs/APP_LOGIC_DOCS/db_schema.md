# Схема базы данных Supabase - Brain Programming
*Обновлено: 26.06.2025 - Миграция на Supabase Storage*

## Обзор

База данных приложения "Brain Programming" построена на PostgreSQL через Supabase и содержит 22 основные таблицы и 1 бакет в Storage для управления пользователями, курсами, медиа-контентом, прогрессом, тарифами и доступом.

**Проект Supabase:** `bzbpwmzhywaqwsjthwid` (EU Central 1)

## Supabase Storage

### Бакет `media`
- **Назначение:** Хранение всего медиа-контента приложения (обложки, аудио, видео, PDF).
- **Доступ:**
  - **Чтение:** Публичное. Любой пользователь может просматривать файлы.
  - **Запись/Изменение/Удаление:** Только для аутентифицированных пользователей с ролью `admin`.

## Таблицы и их назначение

### 1. `users` - Пользователи ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Хранение информации о пользователях приложения, интегрированных через Telegram Web App.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор пользователя
- `telegram_id` (text, UNIQUE, NOT NULL) - ID пользователя в Telegram
- `first_name` (text, nullable) - Имя пользователя
- `last_name` (text, nullable) - Фамилия пользователя  
- `username` (text, nullable) - Username в Telegram
- `photo_url` (text, nullable) - URL аватара пользователя
- `auth_date` (text, nullable) - Дата авторизации в Telegram
- `hash` (text, nullable) - Хеш для проверки подлинности данных Telegram
- `last_login` (timestamptz, nullable) - Время последнего входа через Telegram
- `created_at` (timestamptz, default: now()) - Время создания записи
- `updated_at` (timestamptz, default: now()) - Время последнего обновления
- `total_points` (int4, default: 0) - Общее количество очков пользователя
- `lives_remaining` (int4, default: 3) - Количество оставшихся жизней
- `role` (user_role ENUM, default: 'user', NOT NULL) - Роль пользователя: 'user', 'curator', 'admin'
- `access_till` (timestamptz, nullable) - Дата окончания доступа (NULL = бессрочный доступ)
- `web_login` (varchar, UNIQUE, nullable) - Логин для веб-авторизации админов/кураторов
- `web_password_hash` (text, nullable) - Хеш пароля для веб-авторизации
- `web_last_login` (timestamptz, nullable) - Время   последнего входа через веб-интерфейс
- `onboarding_completed` (boolean, default: false, NOT NULL) - Флаг завершения онбординга

**✅ НОВОЕ: Onboarding система:**
- Добавлено поле `onboarding_completed` для отслеживания завершения вводного процесса

**🔒 Система ролей:**
- **user** - обычный пользователь, доступ только к материалам курса
- **curator** - куратор, может проверять домашние задания и выставлять баллы
- **admin** - администратор, полный доступ к админке включая управление контентом

**✅ Веб-авторизация:**
- Поля `web_login` и `web_password_hash` для входа в админку.
- При успешном входе через функцию `authenticate_web_user` генерируется JWT-токен, который используется для аутентификации запросов к защищенным ресурсам (например, Supabase Storage).
- Работает только для пользователей с ролями 'admin' и 'curator'.

**RLS:** Включен (Row Level Security)

### 2. `courses` - Курсы ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Основные курсы обучения в приложении.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор курса
- `title` (text, NOT NULL) - Название курса
- `subtitle` (text, nullable) - Подзаголовок курса
- `created_at` (timestamptz, default: now()) - Время создания

**RLS:** ВЫКЛЮЧЕН

### 3. `course_stages` - Этапы курса ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Этапы (ступени) внутри курсов, которые пользователи проходят последовательно.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор этапа
- `course_id` (uuid, FK → courses.id, NOT NULL) - Ссылка на курс
- `name` (text, NOT NULL) - Название этапа
- `description` (text, nullable) - Описание этапа
- `order_num` (int4, NOT NULL) - Порядковый номер этапа в курсе
- `unlock_condition_type` (text, nullable) - Тип условия разблокировки
- `unlock_condition_value` (text, nullable) - Значение условия разблокировки
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления
- `is_unlocked` (boolean, default: false, NOT NULL) - Флаг разблокировки этапа
- `cover_image_path` (text, nullable) - Путь к файлу обложки ступени в Supabase Storage (например: images/stage_cover_123.jpg)

**✅ Система обложек:**
- Поле `cover_image_path` для хранения пути к обложке ступени
- Файлы обложек хранятся в Supabase Storage в папке `images/`
- Полный URL формируется динамически через `supabase.storage.from('media').getPublicUrl(cover_image_path)`
- При отсутствии обложки используется дефолтная заглушка

**RLS:** ВЫКЛЮЧЕН

### 4. `lessons` - Уроки ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Отдельные уроки внутри этапов курса. Урок содержит блоки контента.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор урока
- `stage_id` (bigint, FK → course_stages.id, NOT NULL) - Ссылка на этап
- `name` (text, NOT NULL) - Название урока
- `description` (text, nullable) - Описание урока
- `order_num` (int4, NOT NULL) - Порядковый номер урока в этапе
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления
- `cover_image_path` (text, nullable) - Путь к файлу обложки в Supabase Storage (например: images/filename.webp)
- `has_assignment` (boolean, default: false) - Есть ли в уроке домашнее задание для сдачи
- `open_at` (timestamptz, nullable) - Дата и время открытия урока (до этого времени урок недоступен)
- `deadline_at` (timestamptz, nullable) - Дедлайн сдачи задания (после этого времени поздняя сдача)

**❌ ВАЖНО:** В таблице `lessons` НЕТ поля `is_unlocked`. Статус открытости урока определяется динамически по полю `open_at` в логике приложения.

**✅ Система временного управления:**
- `open_at` - позволяет настроить точное время открытия урока для пользователей
- `deadline_at` - автоматически устанавливается как open_at + 2 дня в админке
- Используются для определения статуса "Откроется завтра" и просроченных сдач

**✅ Система обложек:**
- Поле `cover_image_path` для хранения пути к обложке урока
- Интеграция с Supabase Storage в папке `images/`
- Полный URL строится через `supabase.storage.from('media').getPublicUrl()`

**RLS:** ВЫКЛЮЧЕН

### 5. `lesson_blocks` - Блоки контента урока ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Блоки контента внутри уроков (текст, видео, аудио, изображения, файлы).

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор блока
- `lesson_id` (bigint, FK → lessons.id, NOT NULL) - Ссылка на урок
- `order_num` (int4, NOT NULL) - Порядковый номер блока в уроке
- `title` (text, nullable) - Заголовок блока
- `block_type` (text, NOT NULL) - Тип блока: 'text', 'video', 'audio', 'image', 'pdf', 'assignment_instruction'
- `content_text` (text, nullable) - Текстовое содержимое для text-блоков
- `content_url` (text, nullable) - URL для файлов/медиа контента
- `meta_json` (jsonb, default: '{}') - Дополнительные поля: длительность видео, подписи и т.п.
- `created_at` (timestamptz, default: now()) - Время создания
- `updated_at` (timestamptz, default: now()) - Время обновления

**⚠️ УСТАРЕВШИЙ ТИП БЛОКА:** В CHECK constraint еще есть тип 'assignment_instruction', который должен быть удален в пользу `lessons.has_assignment`

**RLS:** Включен

### 6. `lesson_progress` - Прогресс по урокам ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Детальное отслеживание прогресса пользователей по отдельным урокам.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `lesson_id` (bigint, FK → lessons.id, NOT NULL) - Ссылка на урок
- `started_at` (timestamptz, nullable) - Время начала урока
- `completed_at` (timestamptz, nullable) - Время завершения урока
- `is_completed` (bool, default: false) - Флаг завершения урока
- `submission_id` (bigint, FK → submissions.id, nullable) - Связь с сдачей, если есть
- `created_at` (timestamptz, default: now()) - Время создания
- `updated_at` (timestamptz, default: now()) - Время обновления

**Ограничения:**
- Уникальная связь (user_id, lesson_id)

**RLS:** Включен

### 7. `submissions` - Сдачи заданий ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Хранение сдач заданий пользователями и результатов их проверки.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор сдачи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `lesson_id` (bigint, FK → lessons.id, NOT NULL) - Ссылка на урок
- `submitted_at` (timestamptz, default: now()) - Время сдачи
- `first_submitted_at` (timestamptz, nullable) - Время первоначальной сдачи (для определения опоздания при пересдачах)
- `content_text` (text, nullable) - Текстовая сдача
- `file_url` (text, nullable) - URL файла в Supabase Storage
- `status` (text, default: 'submitted', NOT NULL) - Статус: 'submitted', 'pending_review', 'approved', 'rejected'
- `reviewed_by_curator_id` (uuid, FK → users.id, nullable) - Куратор, который проверил
- `reviewed_at` (timestamptz, nullable) - Время проверки
- `feedback_text` (text, nullable) - Обратная связь от куратора
- `points_awarded` (int4, default: 0) - Начисленные баллы
- `created_at` (timestamptz, default: now()) - Время создания
- `updated_at` (timestamptz, default: now()) - Время обновления

**Особенности:**
- Поле `first_submitted_at` заполняется автоматически при первой сдаче задания
- При пересдаче обновляется только `submitted_at`, `first_submitted_at` остается неизменным
- Определение опоздания происходит динамически на основе `first_submitted_at` и дедлайна урока

**RLS:** Включен

### 8. `user_course_enrollments` - Зачисления на курсы ✅ АКТУАЛИЗИРОВАНО
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

### 9. `user_stage_progress` - Прогресс по этапам ⚠️ ТРЕБУЕТ ИСПРАВЛЕНИЯ
**Назначение:** Отслеживание прогресса пользователей по этапам курсов.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `stage_id` (bigint, FK → course_stages.id, NOT NULL) - Ссылка на этап
- `status` (text, default: 'not_started') - Статус прохождения этапа
- `started_at` (timestamptz, nullable) - Время начала этапа
- `completed_at` (timestamptz, nullable) - Время завершения этапа
- `created_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время создания
- `updated_at` (timestamptz, default: CURRENT_TIMESTAMP) - Время обновления

**⚠️ ПРОБЛЕМА:** FK ссылается на `auth.users`, а должен на `public.users` (требует исправления)

**RLS:** ВЫКЛЮЧЕН

### 10. `materials` - Дополнительные материалы ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Хранение информации о дополнительных материалах.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор материала
- `name` (text, NOT NULL) - Название материала
- `description` (text, nullable) - Описание материала
- `cover_image_path` (text, nullable) - Путь к файлу обложки в Supabase Storage
- `material_type` (text, NOT NULL) - Тип материала ('video', 'audio', 'article', 'link', 'file')
- `order_num` (int4, default: 0, NOT NULL) - Порядковый номер для сортировки
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания
- `updated_at` (timestamptz, default: now(), NOT NULL) - Время последнего обновления

**RLS:** ВЫКЛЮЧЕН

### 11. `material_blocks` - Блоки контента дополнительных материалов ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Блоки контента внутри одного дополнительного материала (текст, видео Kinescope, аудио, изображения, файлы PDF).

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор блока
- `material_id` (uuid, FK → materials.id, NOT NULL, onDelete: CASCADE) - Ссылка на материал
- `order_num` (int4, NOT NULL) - Порядковый номер блока в материале
- `title` (text, nullable) - Заголовок блока
- `block_type` (text, NOT NULL) - Тип блока: 'text', 'video' (для Kinescope), 'audio', 'image', 'pdf'
- `content_text` (text, nullable) - Текстовое содержимое для 'text' блоков
- `content_url` (text, nullable) - URL для 'video', 'audio', 'image', 'pdf' блоков (файлы из Supabase Storage или Kinescope URL)
- `meta_json` (jsonb, default: '{}', nullable) - Дополнительные метаданные (например, длительность видео)
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания
- `updated_at` (timestamptz, default: now(), NOT NULL) - Время последнего обновления

**RLS:** ВЫКЛЮЧЕН

### 12. `user_material_views` - Просмотры дополнительных материалов ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Отслеживание просмотров/взаимодействий пользователей с дополнительными материалами.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → users.id, NOT NULL, onDelete: CASCADE) - Ссылка на пользователя
- `material_id` (uuid, FK → materials.id, NOT NULL, onDelete: CASCADE) - Ссылка на материал
- `first_viewed_at` (timestamptz, default: now(), NOT NULL) - Время первого просмотра
- `last_viewed_at` (timestamptz, default: now(), NOT NULL) - Время последнего просмотра (обновляется при каждом открытии)
- `is_completed` (boolean, default: false, NOT NULL) - Флаг "материал просмотрен/завершен"

**Ограничения:**
- `CONSTRAINT uq_user_material UNIQUE (user_id, material_id)` - Уникальная пара пользователь-материал

**RLS:** ВЫКЛЮЧЕН

### 13. `user_curator` - Связи куратор-ученик ✅ НОВАЯ ТАБЛИЦА
**Назначение:** Связь между кураторами и учениками для персонализированного сопровождения.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `curator_id` (uuid, FK → users.id, NOT NULL) - ID куратора (пользователь с ролью curator или admin)
- `student_id` (uuid, FK → users.id, NOT NULL) - ID ученика (пользователь с ролью user)
- `created_at` (timestamptz, default: now(), NOT NULL) - Дата назначения ученика куратору

**Особенности:**
- Один ученик может быть назначен только одному куратору
- Один куратор может иметь множество учеников
- Используется для фильтрации заданий в админке и персонализации

**RLS:** Включен

### 14. `chats` - Telegram-чаты ✅ НОВАЯ ТАБЛИЦА
**Назначение:** Список Telegram-чатов для пользователей.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор чата
- `name` (text, NOT NULL) - Название чата
- `description` (text, nullable) - Краткое описание
- `link` (text, NOT NULL) - Ссылка на чат
- `order_num` (int4, default: 0, NOT NULL) - Порядковый номер для сортировки
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания

**RLS:** Включен (SELECT для всех, INSERT/UPDATE/DELETE только для админов)

### 15. `faq` - Часто задаваемые вопросы ✅ НОВАЯ ТАБЛИЦА
**Назначение:** Часто задаваемые вопросы и ответы.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор записи
- `question` (text, NOT NULL) - Вопрос
- `answer` (text, NOT NULL) - Ответ
- `order_num` (int4, default: 0, NOT NULL) - Порядковый номер для сортировки
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания

**RLS:** Включен (SELECT для всех, INSERT/UPDATE/DELETE только для админов)

### 16. `broadcasts` - Эфиры и трансляции ✅ НОВАЯ ТАБЛИЦА
**Назначение:** Список эфиров и трансляций.

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор эфира
- `name` (text, NOT NULL) - Название эфира
- `description` (text, nullable) - Описание
- `broadcast_url` (text, nullable) - Ссылка на трансляцию (Zoom, YouTube)
- `start_time` (timestamptz, nullable) - Дата и время начала
- `status` (text, default: 'planned', NOT NULL) - Статус эфира: 'planned', 'live', 'completed'
- `recording_url` (text, nullable) - Ссылка на запись (добавляется после)
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания
- `order_num` (int4, default: 0, NOT NULL) - Порядковый номер для сортировки

**RLS:** Включен (SELECT для всех, INSERT/UPDATE/DELETE только для админов)

### 17. `tariffs` - Тарифы ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Справочник тарифов (T1, T2, T3, T4 и т.д.)

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор тарифа
- `name` (text, NOT NULL) - Название тарифа
- `code` (text, UNIQUE, NOT NULL) - Уникальный код тарифа для использования в логике (например, "T1")
- `description` (text, nullable) - Описание тарифа
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания

**RLS:** ВЫКЛЮЧЕН

### 18. `user_tariffs` - Привязка пользователей к тарифам ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Привязка пользователей к их активным тарифам.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `user_id` (uuid, FK → users.id, NOT NULL) - Ссылка на пользователя
- `tariff_id` (uuid, FK → tariffs.id, NOT NULL) - Ссылка на тариф
- `is_active` (boolean, default: true, NOT NULL) - Флаг активности тарифа для ручного управления
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания
- `updated_at` (timestamptz, default: now(), NOT NULL) - Время последнего обновления

**RLS:** ВЫКЛЮЧЕН

### 19. `tariff_limits` - Правила доступа тарифов ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Правила доступа тарифов к этапам курсов.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `tariff_id` (uuid, FK → tariffs.id, NOT NULL) - Ссылка на тариф
- `stage_id` (bigint, FK → course_stages.id, NOT NULL) - Ссылка на этап
- `max_days_access` (int4, nullable) - Лимит доступа в днях/уроках для этапа (NULL = безлимитно)
- `requires_full_prereq` (boolean, default: false, NOT NULL) - Требуется ли сдача всех ДЗ на предыдущих этапах для доступа
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания

**RLS:** ВЫКЛЮЧЕН

### 20. `tariff_material_access` - Доступ тарифов к материалам ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Связь тарифов с доступом к дополнительным материалам (библиотеке).

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `tariff_id` (uuid, FK → tariffs.id, NOT NULL) - Ссылка на тариф
- `material_id` (uuid, FK → materials.id, NOT NULL) - Ссылка на материал
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания

**RLS:** ВЫКЛЮЧЕН

### 21. `tariff_chat_access` - Доступ тарифов к чатам ✅ АКТУАЛИЗИРОВАНО
**Назначение:** Связь тарифов с доступом к Telegram-чатам.

**Поля:**
- `id` (bigint, PK, auto-increment) - Уникальный идентификатор записи
- `tariff_id` (uuid, FK → tariffs.id, NOT NULL) - Ссылка на тариф
- `chat_id` (uuid, FK → chats.id, NOT NULL) - Ссылка на чат
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания

**RLS:** ВЫКЛЮЧЕН

### 22. `access_tokens` - Токены доступа ✅ АКТУАЛИЗИРОВАНО 13.06.2025
**Назначение:** Система токенов доступа для автоматического зачисления пользователей на курсы с назначением тарифов. Поддерживает как обычные токены (через ссылки), так и персональные токены (привязанные к Telegram ID).

**Поля:**
- `id` (uuid, PK, default: gen_random_uuid()) - Уникальный идентификатор токена
- `token` (text, UNIQUE, NOT NULL) - Токен доступа (base62, 16 символов)
- `course_id` (uuid, FK → courses.id, nullable) - Ссылка на курс
- `tariff_id` (uuid, FK → tariffs.id, nullable) - Ссылка на тариф
- `status` (text, default: 'created', NOT NULL) - Статус токена: 'created', 'used', 'revoked'
- `used_by_user_id` (uuid, FK → users.id, nullable) - Кто использовал токен
- `used_at` (timestamptz, nullable) - Время использования токена
- `created_by_user_id` (uuid, FK → users.id, nullable) - Кто создал токен
- `comment` (text, nullable) - Комментарий к токену
- `created_at` (timestamptz, default: now(), NOT NULL) - Время создания
- `tg_id` (bigint, nullable) - Telegram ID пользователя для персональных токенов ✅ НОВОЕ

**Особенности:**
- Токен генерируется в формате base62, 16 символов
- После использования статус меняется на 'used' и записывается пользователь
- **Два типа токенов:**
  - **Обычные токены** (`tg_id = NULL`): Используются для создания ссылок `https://t.me/bot?startapp=<token>`
  - **Персональные токены** (`tg_id IS NOT NULL`): Привязаны к конкретному Telegram ID, активируются автоматически при входе пользователя

**RLS:** Включен (только админы и кураторы имеют доступ)

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
- `cover_image_path` (text) - путь к обложке ступени в Supabase Storage

### `lesson_has_submission(lesson_id_param BIGINT)` ⚠️ УСТАРЕВШАЯ
**Назначение:** Проверяет есть ли в уроке форма сдачи.

**⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА:** Функция проверяет блоки типа `assignment_instruction`, которые устарели. Должна проверять поле `has_assignment` в таблице `lessons`.

**Правильный код (ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ):**
```sql
BEGIN
  RETURN (SELECT has_assignment FROM lessons WHERE id = lesson_id_param);
END;
```

**Возвращает:** `BOOLEAN`

### `mark_lesson_completed(lesson_id_param BIGINT, user_id_param UUID)`
**Назначение:** Отмечает урок как завершенный для указанного пользователя.

**Параметры:**
- `lesson_id_param` - ID урока
- `user_id_param` - ID пользователя (по умолчанию `auth.uid()`)

**Возвращает:** `BOOLEAN`

### `is_curator_or_admin()` ✅ НОВАЯ ФУНКЦИЯ
**Назначение:** Проверяет, является ли текущий пользователь куратором или администратором.

**Возвращает:** `BOOLEAN`

### `is_admin()` ✅ НОВАЯ ФУНКЦИЯ
**Назначение:** Проверяет, является ли текущий аутентифицированный пользователь администратором.
**Логика:** Извлекает `user_role` из метаданных JWT-токена (`raw_app_meta_data`) и сравнивает ее со значением `'admin'`.
**Возвращает:** `BOOLEAN`.

### `authenticate_web_user(login TEXT, password TEXT)` ✅ ОБНОВЛЕНО
**Назначение:** Аутентификация пользователей для веб-интерфейса админки.
**Логика:**
1. Находит пользователя по `web_login`.
2. Проверяет пароль с помощью `extensions.crypt`.
3. В случае успеха обновляет `web_last_login`.
4. **Генерирует и возвращает JWT-токен** со сроком жизни 8 часов, содержащий `user_id` и кастомную роль `user_role`.

**Возвращает:** Таблицу с полями `user_id`, `user_role`, `first_name`, `last_name`, `is_authenticated`, `access_token`.

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

### `chats`, `faq`, `broadcasts`
- SELECT для всех аутентифицированных пользователей
- INSERT, UPDATE, DELETE только для пользователей с ролью 'admin'

### `user_curator`
- Политики доступа настроены для админов и кураторов

### ✅ Политики доступа к Storage (Бакет: `media`)
- **`Public Read Access` (SELECT):**
  - **Назначение:** Разрешает публичное чтение всех файлов в бакете `media`.
  - **Условие:** `USING ( bucket_id = 'media' )`
- **`Admin Write Access` (ALL):**
  - **Назначение:** Разрешает создание, обновление и удаление файлов.
  - **Условие:** `WITH CHECK ( is_admin() )` - только для пользователей, для которых функция `is_admin()` возвращает `true`.

## Выявленные проблемы и несоответствия

### 🚨 Критические проблемы
1. **Функция `lesson_has_submission`** - использует устаревшую логику блоков `assignment_instruction` ⚠️ ПОДТВЕРЖДЕНО через MCP
2. **CHECK constraint в `lesson_blocks`** - до сих пор разрешает тип `assignment_instruction` ⚠️ ПОДТВЕРЖДЕНО через MCP
3. **FK в `user_stage_progress`** - ссылается на `auth.users` вместо `public.users` ⚠️ ПОДТВЕРЖДЕНО через MCP
4. **Отсутствие поля `is_unlocked` в таблице `lessons`** - уроки не имеют собственного поля разблокировки, только `open_at`

### ✅ Решенные проблемы
1. **Функция `can_user_access_stage`** - ✅ ИСПРАВЛЕНО (19.06.2025): правильная обработка тарифов без записей в `tariff_limits`

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

2. **Обновить CHECK constraint для `lesson_blocks`:**
```sql
ALTER TABLE lesson_blocks 
DROP CONSTRAINT IF EXISTS lesson_blocks_block_type_check;

ALTER TABLE lesson_blocks 
ADD CONSTRAINT lesson_blocks_block_type_check 
CHECK (block_type = ANY (ARRAY['text'::text, 'video'::text, 'audio'::text, 'image'::text, 'pdf'::text]));
```

3. **Исправить FK в `user_stage_progress`:**
```sql
ALTER TABLE user_stage_progress 
DROP CONSTRAINT IF EXISTS user_stage_progress_user_id_fkey;

ALTER TABLE user_stage_progress 
ADD CONSTRAINT user_stage_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);
```

## Статусы и енумы

**ENUM `user_role`:**
- `user` - обычный пользователь
- `curator` - куратор
- `admin` - администратор

**Статусы `user_stage_progress.status`:**
- `not_started` - Не начато
- `in_progress` - В процессе
- `completed` - Завершено

**Статусы `submissions.status`:**
- `submitted` - Сдано
- `pending_review` - Ожидает проверки
- `approved` - Одобрено
- `rejected` - Отклонено

**Статусы `broadcasts.status`:**
- `planned` - Запланировано
- `live` - В эфире
- `completed` - Завершено

**Примечание:** Статус опоздания (`late`) больше не хранится в базе данных, а определяется динамически путем сравнения `first_submitted_at` с дедлайном урока (`lessons.deadline_at`).

**Типы блоков `lesson_blocks.block_type`:**
- `text` - Текстовый блок
- `video` - Видео контент
- `audio` - Аудио контент
- `image` - Изображение
- `pdf` - PDF файл
- ~~`assignment_instruction`~~ - **УСТАРЕЛ** (заменен на `lessons.has_assignment`)

**Типы материалов `materials.material_type`:**
- `video` - Видео материал
- `audio` - Аудио материал
- `article` - Статья
- `link` - Ссылка
- `file` - Файл

## Схема взаимосвязей

```
users (roles: user/curator/admin)
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

Дополнительные материалы:
materials → material_blocks
users → user_material_views → materials

Тарифная система:
tariffs → user_tariffs ← users
tariffs → tariff_limits → course_stages
tariffs → tariff_material_access → materials
tariffs → tariff_chat_access → chats

Токены доступа:
access_tokens → courses (nullable)
access_tokens → tariffs (nullable)
access_tokens → users (created_by, used_by)

Админские сущности:
users (admin) → chats, faq, broadcasts

Кураторская система:
users (curator) ← user_curator → users (student)
```

## Примеры использования

### Получение урока со всеми блоками:
```sql
SELECT * FROM get_lesson_blocks(4);
```

### Проверка наличия формы сдачи:
```sql
SELECT has_assignment FROM lessons WHERE id = 4;
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

### Получение учеников куратора:
```sql
SELECT u.* FROM users u
JOIN user_curator uc ON u.id = uc.student_id
WHERE uc.curator_id = $curator_id;
```
