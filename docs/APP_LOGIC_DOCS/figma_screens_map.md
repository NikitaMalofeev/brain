# Карта экранов Brain Programming

Построена на основе метаданных Figma (figma_screens_metadata.md) и требований PRD.md

---

## 🧭 Общая навигационная структура

### Роуты приложения (React Router):
```
/                     - Главная страница (MainScreen/IndexPage)
/onboarding           - Онбординг
/library              - Библиотека ступеней (LibraryPage)
/library/stage/:id    - Детальная страница ступени
/library/lesson/:id   - Урок
/library/assignment/:id - Задание (в Figma названо "Квиз")
/library/materials    - Дополнительные материалы (library_materials из PRD)
/profile              - Профиль
/profile/chats        - Важные чаты
/profile/help         - Помощь
/profile/faq          - FAQ
/info/points          - Что такое баллы?
```

---

## 🎯 1. БЛОК "ONBOARDING" (38-1421)

### 1.1 Экран "Добро пожаловать" (38:1423)
**Роут:** `/onboarding`  
**Компонент:** `OnboardingWelcome.tsx`

**🔽 Вводимые данные:**
- Данные пользователя Telegram (автоматически через WebApp SDK)
- Прогресс онбординга

**🔼 Выводимые данные:**
- Приветственное видео (URL из материалов)
- Кнопка "Далее"
- Индикатор прогресса (1/4)
- Кнопка "Закрыть"

**📊 Таблицы Supabase:**
- `users` - создание/обновление профиля пользователя
- `user_course_enrollments` - запись о начале курса
- `lessons` - получение приветственного видео
- `users` - инициализация баллов/жизней (поля total_points: 0, lives_remaining: 3)

**🔗 Навигация:**
- "Далее" → `/onboarding/main`
- "Закрыть" → `/` (главная)

---

### 1.2 Экран "Главная" (38:1424)
**Роут:** `/onboarding/main`  
**Компонент:** `OnboardingMain.tsx`

**🔽 Вводимые данные:**
- Статус завершения предыдущего экрана

**🔼 Выводимые данные:**
- Демонстрация интерфейса главной страницы
- Объяснение функций главной
- Кнопка "Далее"
- Индикатор прогресса (2/4)

**📊 Таблицы Supabase:**
- `lessons` - демо-контент для показа

**🔗 Навигация:**
- "Далее" → `/onboarding/library`
- "Назад" → `/onboarding`
- "Закрыть" → `/`

---

### 1.3 Экран "Библиотека" (38:1425)
**Роут:** `/onboarding/library`  
**Компонент:** `OnboardingLibrary.tsx`

**🔽 Вводимые данные:**
- Статус завершения предыдущих экранов

**🔼 Выводимые данные:**
- Демонстрация интерфейса библиотеки
- Объяснение системы ступеней
- Кнопка "Далее"
- Индикатор прогресса (3/4)

**📊 Таблицы Supabase:**
- `course_stages` - демо-данные ступеней
- `lessons` - демо-контент

**🔗 Навигация:**
- "Далее" → `/onboarding/profile`
- "Назад" → `/onboarding/main`
- "Закрыть" → `/`

---

### 1.4 Экран "Профиль" (38:1426)
**Роут:** `/onboarding/profile`  
**Компонент:** `OnboardingProfile.tsx`

**🔽 Вводимые данные:**
- Статус завершения всех предыдущих экранов

**🔼 Выводимые данные:**
- Демонстрация интерфейса профиля
- Объяснение системы поддержки
- Кнопка "Завершить"
- Индикатор прогресса (4/4)

**📊 Таблицы Supabase:**
- `users` - финальное обновление статуса онбординга
- `user_course_enrollments` - активация участия в курсе

**🔗 Навигация:**
- "Завершить" → `/` (главная)
- "Назад" → `/onboarding/library`

---

## 🏠 2. БЛОК "ГЛАВНАЯ" (38-1422)

### 2.1 Главная страница (38:1427)
**Роут:** `/`  
**Компонент:** `MainScreen/IndexPage.tsx`

**🔽 Вводимые данные:**
- ID пользователя (Telegram)
- Текущая сессия

**🔼 Выводимые данные:**
- Приветствие "Привет, {имя пользователя}"
- Аватар пользователя
- Счетчик баллов с иконкой
- Карточки ступеней с состояниями (разблокирована/заблокирована)
- Прогресс-блок: "Выполнено X заданий"
- Прогресс-бар
- "Еще X заданий до следующей ступени"
- Tab bar навигация

**📊 Таблицы Supabase:**
```sql
-- Основной запрос для главной:
SELECT 
  u.first_name, u.last_name, u.photo_url,
  u.total_points, u.lives_remaining,
  cs.name, cs.order_num, 
  usp.status, 
  COUNT(a.id) as total_assignments,
  COUNT(ulp.completed_at) as completed_lessons
FROM users u
JOIN user_course_enrollments uce ON u.id = uce.user_id
JOIN course_stages cs ON uce.course_id = cs.course_id
LEFT JOIN user_stage_progress usp ON u.id = usp.user_id AND cs.id = usp.stage_id
LEFT JOIN lessons l ON cs.id = l.stage_id
LEFT JOIN assignments a ON l.id = a.lesson_id
LEFT JOIN user_lesson_progress ulp ON u.id = ulp.user_id AND l.id = ulp.lesson_id
WHERE u.id = $1
```

**Таблицы:**
- `users` - имя, аватар, баллы, жизни пользователя
- `course_stages` - информация о ступенях
- `user_stage_progress` - прогресс по ступеням
- `user_lesson_progress` - прогресс по урокам
- `assignments` - общее количество заданий

**🔗 Навигация:**
- Карточка ступени → `/library/stage/{stage_id}` (если разблокирована)
- Tab "Библиотека" → `/library`
- Tab "Профиль" → `/profile`
- Счетчик баллов → `/info/points`

---

### 2.2 Экран "Что такое баллы?" (38:1428)
**Роут:** `/info/points`  
**Компонент:** `InfoPage/PointsInfo.tsx`

**🔽 Вводимые данные:**
- Переход с главной страницы

**🔼 Выводимые данные:**
- Детальное описание системы баллов
- Объяснение типов заданий (видео, аудио)
- Объяснение начисления баллов
- Кнопка "Понятно" / "Назад"

**📊 Таблицы Supabase:**
- `lessons` - статическая информация о баллах (можно хранить в content_value)
- Возможно статический контент в коде приложения

**🔗 Навигация:**
- "Назад" → `/` (главная)

---

## 📚 3. БЛОК "БИБЛИОТЕКА" (38-917)

### 3.1 Основной экран библиотеки (38:918)
**Роут:** `/library`  
**Компонент:** `LibraryPage/LibraryPage.tsx`

**🔽 Вводимые данные:**
- ID пользователя
- Текущий прогресс

**🔼 Выводимые данные:**
- Заголовок "Библиотека"
- Карточки ступеней в двухколоночной сетке
- Подписи "1 ступень", "2 ступень" и т.д.
- Статус каждой ступени (доступна/заблокирована)
- Прогресс по каждой ступени
- Tab bar навигация

**📊 Таблицы Supabase:**
```sql
-- SQL-функция get_library_stages:
SELECT 
  cs.id, cs.name, cs.description, cs.order_num,
  usp.status,
  usp.started_at, usp.completed_at,
  COUNT(l.id) as total_lessons,
  COUNT(CASE WHEN ulp.completed_at IS NOT NULL THEN 1 END) as completed_lessons
FROM course_stages cs
LEFT JOIN user_stage_progress usp ON cs.id = usp.stage_id AND usp.user_id = $1
LEFT JOIN lessons l ON cs.id = l.stage_id
LEFT JOIN user_lesson_progress ulp ON l.id = ulp.lesson_id AND ulp.user_id = $1
WHERE cs.course_id = $2
GROUP BY cs.id, cs.name, cs.description, cs.order_num, usp.status, usp.started_at, usp.completed_at
ORDER BY cs.order_num
```

**Таблицы:**
- `course_stages` - список ступеней
- `user_stage_progress` - прогресс пользователя по ступеням
- `user_course_enrollments` - активный курс пользователя
- `lessons` - для подсчета общего количества уроков
- `user_lesson_progress` - для подсчета завершенных уроков

**🔗 Навигация:**
- Карточка ступени → `/library/stage/{stage_id}` (если разблокирована)
- Tab "Главная" → `/`
- Tab "Профиль" → `/profile`

---

### 3.2 Детальный экран ступени (38:919)
**Роут:** `/library/stage/:id`  
**Компонент:** `LibraryPage/StagePage.tsx`

**🔽 Вводимые данные:**
- ID ступени из URL
- ID пользователя

**🔼 Выводимые данные:**
- Заголовок ступени ("Первая ступень")
- Список уроков с индикаторами выполнения
- Прогресс по ступени
- Кнопка "Назад"

**📊 Таблицы Supabase:**
```sql
-- Получение уроков ступени:
SELECT 
  l.id, l.title, l.content_type, l.order_num,
  ulp.completed_at IS NOT NULL as is_completed,
  ulp.progress_percentage
FROM lessons l
LEFT JOIN user_lesson_progress ulp ON l.id = ulp.lesson_id AND ulp.user_id = $1
WHERE l.stage_id = $2
ORDER BY l.order_num
```

**Таблицы:**
- `lessons` - уроки ступени
- `user_lesson_progress` - прогресс по урокам
- `course_stages` - информация о ступени

**🔗 Навигация:**
- Урок → `/library/lesson/{lesson_id}`
- "Назад" → `/library`

---

### 3.3 Экран урока (38:920)
**Роут:** `/library/lesson/:id`  
**Компонент:** `LibraryPage/LessonPage.tsx`

**🔽 Вводимые данные:**
- ID урока из URL
- ID пользователя
- Время просмотра/прослушивания

**🔼 Выводимые данные:**
- Заголовок урока
- Видео/аудио контент
- Элементы управления воспроизведением
- Прогресс просмотра
- Кнопка "Завершить урок"
- Кнопка "Пройти квиз" (если есть)

**📊 Таблицы Supabase:**
```sql
-- Получение контента урока:
SELECT 
  l.name, l.content_type, l.content_value, l.description,
  a.id as assignment_id, a.title as assignment_title
FROM lessons l
LEFT JOIN assignments a ON l.id = a.lesson_id
WHERE l.id = $1

-- Обновление прогресса:
INSERT INTO user_lesson_progress (user_id, lesson_id, status, completed_at, progress_details)
VALUES ($1, $2, 'completed', NOW(), '{"progress_percentage": 100}')
ON CONFLICT (user_id, lesson_id) 
UPDATE SET status = 'completed', completed_at = NOW(), progress_details = '{"progress_percentage": 100}'
```

**Таблицы:**
- `lessons` - контент урока
- `user_lesson_progress` - отслеживание прогресса
- `assignments` - связанные задания/квизы

**🔗 Навигация:**
- "Пройти квиз" → `/library/assignment/{assignment_id}`
- "Назад" → `/library/stage/{stage_id}`

---

### 3.4 Экран задания/квиза (38:921)
**Роут:** `/library/assignment/:id`  
**Компонент:** `LibraryPage/AssignmentPage.tsx`

**🔽 Вводимые данные:**
- ID задания из URL
- Ответы пользователя (текст/файлы)
- ID пользователя

**🔼 Выводимые данные:**
- Заголовок задания
- Описание задания
- Форма сдачи (если `submission_type = 'tma'`):
  - Поле для ввода текста
  - Загрузка файлов
  - Кнопка "Сдать задание"
- Инструкции для чата (если `submission_type = 'chat_report'`):
  - Описание что нужно сделать
  - Кнопка "Я выполнил задание в чате"
- Статус сдачи и обратная связь куратора

**📊 Таблицы Supabase:**
```sql
-- Получение задания:
SELECT a.title, a.description, a.assignment_type, a.config
FROM assignments a 
WHERE a.id = $1

-- В реальной схеме БД нет таблицы submissions!
-- Возможные варианты хранения сдач:
-- 1. Поле в user_lesson_progress.progress_details (JSON)
-- 2. Отдельная таблица submissions (требует создания)
-- 3. Интеграция через Telegram Bot API

-- Обновление баллов при одобрении:
UPDATE users 
SET total_points = total_points + $1 
WHERE id = $2
```

**Таблицы:**
- `assignments` - данные задания
- `user_lesson_progress` - возможно хранение статуса сдачи в progress_details
- `users` - начисление баллов (поле total_points)

**🔗 Навигация:**
- "Сдать" → обновление статуса, возврат к `/library/stage/{stage_id}`
- "Назад" → `/library/lesson/{lesson_id}`

**📝 Примечание:** В Figma этот экран назван "Квиз", но по PRD это обычное задание для сдачи. В реальной схеме БД отсутствует таблица submissions - требует доработки архитектуры или использования progress_details.

---

### 3.5 Экран "Дополнительные материалы" (НЕТ В FIGMA)
**Роут:** `/library/materials`  
**Компонент:** `LibraryPage/MaterialsPage.tsx`

**🔽 Вводимые данные:**
- ID пользователя
- Поисковый запрос (опционально)
- Фильтр по категории

**🔼 Выводимые данные:**
- Заголовок "Дополнительные материалы"
- Поиск по материалам
- Фильтры по категориям
- Список материалов с превью:
  - Заголовок материала
  - Тип контента (видео/аудио/текст/файл/ссылка)
  - Категория
  - Превью изображение
- Пагинация или бесконечная прокрутка

**📊 Таблицы Supabase:**
```sql
-- В реальной схеме БД нет таблицы library_materials!
-- Возможные варианты реализации:
-- 1. Создать таблицу library_materials по спецификации PRD
-- 2. Использовать lessons с типом "library_material"
-- 3. Расширить существующую структуру

-- Пример структуры из PRD:
-- library_materials (id, title, content_type, content_url/text, category)

-- Временное решение через lessons:
SELECT 
  l.id, l.name as title, l.content_type, l.content_value,
  'library' as category
FROM lessons l
WHERE l.content_type IN ('video', 'audio', 'text', 'file')
  AND l.description LIKE '%библиотека%'
ORDER BY l.created_at DESC
```

**Таблицы:**
- `library_materials` - ОТСУТСТВУЕТ (нужно создать по PRD)
- Временно: `lessons` с фильтрацией по типу

**🔗 Навигация:**
- Материал → открытие в соответствующем плеере/просмотрщике
- "Назад" → `/library` 
- Доступ через Tab "Библиотека" или отдельную кнопку на главной

**📝 Примечание:** Этот раздел описан в PRD как отдельная сущность `library_materials`, но отсутствует в Figma макетах и реальной схеме БД. Требует создания соответствующей таблицы и UI.

---

## 👤 4. БЛОК "ПРОФИЛЬ" (36-790)

### 4.1 Основной экран профиля (4:200)
**Роут:** `/profile`  
**Компонент:** `ProfilePage/ProfilePage.tsx`

**🔽 Вводимые данные:**
- ID пользователя
- Данные сессии

**🔼 Выводимые данные:**
- Аватар пользователя
- Приветствие "Привет, {имя}"
- Кнопки меню:
  - "Важные чаты" (с иконкой стрелки)
  - "Помощь" (с иконкой стрелки)  
  - "FAQ" (с иконкой стрелки)
- Tab bar навигация

**📊 Таблицы Supabase:**
- `users` - данные пользователя (имя, аватар)

**🔗 Навигация:**
- "Важные чаты" → `/profile/chats`
- "Помощь" → `/profile/help`
- "FAQ" → `/profile/faq`
- Tab "Главная" → `/`
- Tab "Библиотека" → `/library`

---

### 4.2 Экран "Важные чаты" (4:437)
**Роут:** `/profile/chats`  
**Компонент:** `ProfilePage/ChatsPage.tsx`

**🔽 Вводимые данные:**
- ID пользователя

**🔼 Выводимые данные:**
- Заголовок "Важные чаты"
- Статический список чатов (в коде приложения):
  - Общий чат
  - Чат поддержки
  - Чат с отчетами
- Каждый чат содержит:
  - Аватар/иконку чата
  - Название чата
  - Краткое описание
  - Иконку стрелки для перехода
- Кнопка "Назад"

**📊 Таблицы Supabase:**
- В реальной схеме БД нет таблиц telegram_chats, tariffs!
- Список чатов хранится статично в коде приложения
- Возможно хранение в lessons с типом "chat_info"

---

### 4.3 Экран "Помощь" (4:878)
**Роут:** `/profile/help`  
**Компонент:** `ProfilePage/HelpPage.tsx`

**🔽 Вводимые данные:**
- ID пользователя

**🔼 Выводимые данные:**
- Заголовок "Помощь"
- Статический список контактов поддержки:
  - Алена, Ваня, Макс, Маша, Ваня, Елена
- Каждый контакт с:
  - Аватаром (статическим)
  - Именем
  - Ролью/специализацией
- Кнопка FAQ
- Кнопка "Назад"

**📊 Таблицы Supabase:**
- В реальной схеме БД нет таблиц roles, user_roles!
- Контакты кураторов хранятся статично в коде приложения
- Возможно расширение таблицы users флагом is_curator

---

### 4.4 Экран "FAQ" (36:713)
**Роут:** `/profile/faq`  
**Компонент:** `ProfilePage/FAQPage.tsx`

**🔽 Вводимые данные:**
- Статический контент FAQ

**🔼 Выводимые данные:**
- Заголовок "FAQ"
- Список часто задаваемых вопросов:
  - Как работают пригласительные ссылки?
  - Как работает оплата?
  - Информация о списаниях и картах
- Развернутые ответы
- Кнопка "Назад"

**📊 Таблицы Supabase:**
- В реальной схеме БД нет таблицы faq_items!
- FAQ хранится статично в коде приложения
- Возможно использование lessons с типом "faq"

**🔗 Навигация:**
- "Назад" → `/profile/help`

---

## 🔄 Общие компоненты и состояния

### Navigation Bar (глобальный)
**Компонент:** `components/Navigation/NavigationBar.tsx`

**Данные:**
- Время (статус-бар iPhone)
- Заголовок текущей страницы
- Кнопки навигации (Назад/Закрыть/Меню)

### Tab Bar (глобальный)
**Компонент:** `components/TabBar/TabBar.tsx`

**Навигация:**
- Главная → `/`
- Библиотека → `/library` 
- Профиль → `/profile`

**Данные:**
- Активная вкладка
- Счетчики/бейджи (опционально)

### Система уведомлений
**Реализация:** Supabase Realtime + Edge Functions

**События:**
- Разблокировка нового контента
- Принятие/отклонение задания
- Начисление баллов
- Потеря жизней
- Напоминания о дедлайнах

**Таблицы:**
- В реальной схеме БД нет таблиц для уведомлений!
- Возможно расширение через дополнительные таблицы
- Или интеграция через Telegram Bot API

---

## 🗄️ Сводка по таблицам Supabase

### ✅ Реально существующие таблицы (согласно db_schema.md):
1. **Пользователи:** `users` (с полями total_points, lives_remaining)
2. **Курсы:** `courses`, `course_stages`, `lessons`, `assignments`
3. **Прогресс:** `user_course_enrollments`, `user_stage_progress`, `user_lesson_progress`

### ❌ Таблицы из PRD, которых НЕТ в реальной схеме:
- `profiles` → заменено на `users`
- `user_gamification` → заменено полями в `users`
- `submissions` → отсутствует (нужно создать или использовать progress_details)
- `materials` → заменено на `lessons`
- `telegram_chats`, `tariffs`, `tariff_chat_access` → отсутствуют
- `faq_items`, `support_tickets` → отсутствуют
- `notification_templates`, `user_notifications_log` → отсутствуют
- `roles`, `user_roles` → отсутствуют
- `gamification_events_log` → отсутствует

### 📝 Рекомендации по доработке:
1. **Создать таблицу submissions** для сдачи заданий
2. **Создать таблицу library_materials** для дополнительных материалов (по PRD)
3. **Добавить систему ролей** (users.role_type)
4. **Добавить таблицу notifications** для уведомлений
5. **Расширить lessons** типом "faq", "chat_info" для статического контента

---

## 📱 Техническая реализация

### Размеры и адаптивность:
- Базовый размер: **375x812px** (iPhone X)
- Адаптивный дизайн для разных устройств
- Поддержка Telegram WebApp constraints

### Состояния загрузки:
- Loading states для всех экранов
- Skeleton loaders для карточек
- Обработка ошибок Supabase

### Офлайн поддержка:
- Кеширование данных через React Query
- Оптимистичные обновления UI
- Синхронизация при восстановлении соединения
