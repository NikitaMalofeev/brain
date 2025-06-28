# Настройка Supabase Storage для Brain Programming

> 📖 **См. также:** [Интеграция в админке](./Admin_Panel/admin_supabase_storage_integration.md) - как использовать Supabase Storage в интерфейсе

## Обзор

В админке реализована **прямая загрузка файлов** из браузера в Supabase Storage. Эта архитектура требует правильной настройки бакета (bucket) и политик доступа (RLS) в Supabase.

## 🚀 Настройка Supabase Storage

### 1. Создание бакета (Bucket)

1. Перейдите в ваш проект Supabase → Storage.
2. Нажмите "Create a new bucket".
3. **Название бакета:** `media`.
4. **Доступ:** Установите галочку "Public bucket". Это позволит файлам быть доступными по прямой ссылке.

### 2. Настройка политик доступа (RLS) - КРИТИЧЕСКИ ВАЖНО!

Политики Row Level Security (RLS) — это основной механизм защиты вашего хранилища. Они определяют, кто и какие действия может выполнять с файлами.

1.  Перейдите в ваш проект Supabase → Storage → Policies.
2.  Выберите бакет `media`.
3.  Создайте следующие политики:

#### Политика на чтение (SELECT)
- **Назначение:** Разрешает публичное чтение всех файлов в бакете `media`.
- **Policy Name:** `Public Read Access`
- **Allowed operation:** `SELECT`
- **Target roles:** `anon`, `authenticated`
- **USING expression:** `bucket_id = 'media'`

#### Политика на запись/изменение/удаление (INSERT, UPDATE, DELETE)
- **Назначение:** Разрешает создание, обновление и удаление файлов только для администраторов.
- **Policy Name:** `Admin Write Access`
- **Allowed operations:** `INSERT`, `UPDATE`, `DELETE`
- **Target roles:** `authenticated`
- **USING expression:** `is_admin()`
- **WITH CHECK expression:** `is_admin()`

**⚠️ Важно:** Эта политика опирается на SQL-функцию `is_admin()`, которая проверяет роль текущего аутентифицированного пользователя. Убедитесь, что эта функция создана в вашей БД.

```sql
-- Пример функции is_admin()
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  IF session_user = 'authenticator' THEN
    RETURN (
      SELECT rolname
      FROM pg_roles
      WHERE rolname = 'admin' AND oid = auth.uid()
    );
  END IF;
  
  RETURN FALSE;
END;
$$;
```

### 3. Получение API ключей

Для работы с Supabase из приложения вам понадобятся `URL проекта` и `anon key`.

1. Перейдите в ваш проект Supabase → Project Settings → API.
2. Скопируйте `Project URL`.
3. Скопируйте `Project API keys` → `anon` `public`.

## 🔧 Переменные окружения

Добавьте в ваш `.env` файл (или в переменные окружения на Vercel):

```env
# Supabase Project
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

### Префикс `VITE_`
Префикс `VITE_` обязателен. Он позволяет Vite "прокинуть" эти переменные в клиентский код, делая их доступными в браузере.

## 📁 Структура файлов в бакете `media`

```
media/
├── audio/           # Аудиофайлы уроков
│   ├── meditation_1.mp3
│   └── lesson_audio.wav
├── images/          # Изображения и обложки
│   ├── lesson_cover.jpg
│   └── stage_icon.png
├── documents/       # PDF файлы и документы ДЗ
│   ├── homework.pdf
│   └── user_submission.doc
```

## 🧪 Тестирование интеграции

1. Запустить приложение: `npm run dev:https`
2. Зайти в админку: `/admin`
3. Перейти в раздел, где есть загрузка файлов (например, "Курсы" -> "Ступени" -> "Уроки" -> "Блоки").
4. Создать блок типа "audio", "image" или "pdf".
5. Загрузить файл через `FileUploader`.
6. Проверить, что файл появился в Supabase Storage и корректно отображается в приложении.

## 🔥 Частые проблемы

### Ошибка: "new row violates row-level security policy for table "objects""
- **Причина**: Текущий пользователь не имеет прав на загрузку файла. RLS-политика не пропускает запрос.
- **Решение**: 
  1. Убедитесь, что вы залогинены в админку как пользователь с ролью `admin`.
  2. Проверьте правильность написания функции `is_admin()` и политик RLS в Supabase.
  3. Убедитесь, что JWT-токен админа корректно передается при запросе к Storage.

### Файлы загружаются, но не отображаются (ошибка 404)
- **Причина**: Неправильно сформирован публичный URL или файл не был загружен.
- **Решение**: Проверьте, что бакет `media` является публичным. Проверьте путь к файлу в таблице БД и сравните его с реальным путем в Supabase Storage.

## 🏗️ Архитектура

```
Frontend (React)
       ↓
@supabase/supabase-js (браузерный клиент)
       ↓
Supabase Storage API
       ↓
PostgreSQL (для RLS политик)
       ↓
S3-совместимое хранилище Supabase
```

**Преимущества этой архитектуры:**
- ✅ **Единая экосистема**: Все данные, включая файлы, хранятся и управляются в одном месте.
- ✅ **Безопасность**: Гибкие и мощные RLS-политики для контроля доступа.
- ✅ **Простота**: Используется официальный JS-клиент Supabase.
- ✅ **CDN**: Встроенный CDN для быстрой доставки контента.