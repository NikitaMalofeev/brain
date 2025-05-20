# База данных приложения: Детальное описание схемы

## Общая архитектура базы данных

База данных Supabase используется для хранения всей информации, необходимой для функционирования приложения. Схема базы данных спроектирована таким образом, чтобы обеспечить:

1. Эффективное хранение и доступ к данным
2. Поддержку всех функциональных возможностей приложения
3. Масштабируемость для будущего расширения
4. Интеграцию с Telegram Mini App

## Основные таблицы

### Пользователи (users)

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  auth_date BIGINT NOT NULL,
  hash TEXT NOT NULL,
  last_login TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем индекс по telegram_id для быстрого поиска
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON public.users (telegram_id);

-- Создаем триггер для автоматического обновления поля updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `telegram_id` - ID пользователя в Telegram, используется для авторизации
- `first_name` - Имя пользователя из Telegram
- `last_name` - Фамилия пользователя из Telegram (опционально)
- `username` - Имя пользователя в Telegram (опционально)
- `photo_url` - URL фотографии пользователя из Telegram
- `auth_date` - Timestamp авторизации пользователя через Telegram
- `hash` - Хеш для проверки подлинности данных пользователя
- `last_login` - Дата и время последнего входа в приложение
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

### Прогресс пользователя (user_progress)

```sql
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  before_image_url TEXT,
  after_image_url TEXT,
  before_date TIMESTAMPTZ,
  after_date TIMESTAMPTZ,
  before_description TEXT,
  after_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_progress_user_id_idx ON public.user_progress (user_id);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `user_id` - Ссылка на пользователя, внешний ключ
- `before_image_url` - URL фотографии "до"
- `after_image_url` - URL фотографии "после"
- `before_date` - Дата фотографии "до"
- `after_date` - Дата фотографии "после"
- `before_description` - Текстовое описание состояния "до"
- `after_description` - Текстовое описание состояния "после"
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

### Материалы (materials)

```sql
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'video', 'audio'
  category TEXT NOT NULL, -- 'body', 'meditation', 'breathing', 'base'
  duration INTEGER NOT NULL, -- длительность в секундах
  difficulty_level INTEGER, -- 1-5
  tags TEXT[],
  content_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materials_category_idx ON public.materials (category);
CREATE INDEX IF NOT EXISTS materials_type_idx ON public.materials (type);
CREATE INDEX IF NOT EXISTS materials_tags_idx ON public.materials USING GIN (tags);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `title` - Название материала
- `description` - Описание материала
- `type` - Тип материала (видео, аудио)
- `category` - Категория (тело, медитация, дыхание, база)
- `duration` - Длительность в секундах
- `difficulty_level` - Уровень сложности от 1 до 5
- `tags` - Массив тегов для поиска и фильтрации
- `content_url` - URL контента (видео или аудио)
- `thumbnail_url` - URL превью
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

### Избранное (favorites)

```sql
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, material_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites (user_id);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `user_id` - Ссылка на пользователя, внешний ключ
- `material_id` - Ссылка на материал, внешний ключ
- `added_at` - Дата и время добавления в избранное

### События календаря (events)

```sql
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'practice', 'live', 'reminder'
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_start_time_idx ON public.events (start_time);
CREATE INDEX IF NOT EXISTS events_event_type_idx ON public.events (event_type);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `title` - Название события
- `description` - Описание события
- `event_type` - Тип события (практика, эфир, напоминание)
- `start_time` - Время начала события
- `end_time` - Время окончания события
- `location` - Место проведения или ссылка для онлайн-событий
- `instructor_id` - Ссылка на пользователя-инструктора
- `thumbnail_url` - URL превью события
- `is_recurring` - Флаг повторяющегося события
- `recurring_pattern` - JSON с паттерном повторения
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

### Участие в событиях (user_events)

```sql
CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  notification_settings JSONB,
  participation_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'declined'
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON public.user_events (user_id);
CREATE INDEX IF NOT EXISTS user_events_event_id_idx ON public.user_events (event_id);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `user_id` - Ссылка на пользователя, внешний ключ
- `event_id` - Ссылка на событие, внешний ключ
- `notification_settings` - JSON с настройками уведомлений
- `participation_status` - Статус участия
- `added_at` - Дата и время добавления

### Логика квиза (quiz_logic)

```sql
CREATE TABLE IF NOT EXISTS public.quiz_logic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'body', 'meditation', 'breathing', 'quick'
  duration TEXT, -- 'short', 'medium', 'long'
  goal TEXT NOT NULL,
  approach TEXT, -- 'self', 'guided'
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_logic_type_idx ON public.quiz_logic (type);
CREATE INDEX IF NOT EXISTS quiz_logic_goal_idx ON public.quiz_logic (goal);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `type` - Тип практики
- `duration` - Длительность (если применимо)
- `goal` - Цель практики
- `approach` - Подход к практике (если применимо)
- `material_id` - Ссылка на рекомендуемый материал
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

### Статистика пользователя (user_stats)

```sql
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_practice_time INTEGER DEFAULT 0, -- общее время практик в секундах
  practice_count INTEGER DEFAULT 0, -- количество практик
  last_practice_date TIMESTAMPTZ,
  streak INTEGER DEFAULT 0, -- текущая серия дней с практикой
  longest_streak INTEGER DEFAULT 0, -- самая длинная серия
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS user_stats_user_id_idx ON public.user_stats (user_id);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `user_id` - Ссылка на пользователя, внешний ключ
- `total_practice_time` - Общее время практик в секундах
- `practice_count` - Количество выполненных практик
- `last_practice_date` - Дата последней практики
- `streak` - Текущая серия дней с практикой
- `longest_streak` - Самая длинная серия дней с практикой
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

### История практик (practice_history)

```sql
CREATE TABLE IF NOT EXISTS public.practice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL, -- фактическая продолжительность в секундах
  completed BOOLEAN DEFAULT true,
  rating INTEGER, -- оценка от пользователя 1-5
  notes TEXT,
  practiced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_history_user_id_idx ON public.practice_history (user_id);
CREATE INDEX IF NOT EXISTS practice_history_practiced_at_idx ON public.practice_history (practiced_at);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `user_id` - Ссылка на пользователя, внешний ключ
- `material_id` - Ссылка на материал, внешний ключ
- `duration` - Фактическая продолжительность практики в секундах
- `completed` - Флаг завершения практики
- `rating` - Оценка от пользователя от 1 до 5
- `notes` - Заметки пользователя
- `practiced_at` - Дата и время выполнения практики

### Рекомендации (recommendations)

```sql
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'quiz', 'algorithm', 'manual'
  reason TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendations_user_id_idx ON public.recommendations (user_id);
CREATE INDEX IF NOT EXISTS recommendations_active_idx ON public.recommendations (active);
```

**Описание полей:**
- `id` - Уникальный UUID, первичный ключ
- `user_id` - Ссылка на пользователя, внешний ключ
- `material_id` - Ссылка на материал, внешний ключ
- `recommendation_type` - Тип рекомендации (квиз, алгоритм, ручной выбор)
- `reason` - Причина рекомендации
- `active` - Флаг активности рекомендации
- `created_at` - Дата и время создания записи
- `updated_at` - Дата и время последнего обновления записи

## Диаграмма связей

```
users
  ↑
  |-----------------|-----------------|-----------------|----------------|
  ↓                 ↓                 ↓                 ↓                ↓
user_progress    favorites    user_events    user_stats    practice_history
                    ↑             ↑                              ↑
                    |             |                              |
                    ↓             ↓                              ↓
                 materials <---- quiz_logic               recommendations
                    ↑
                    |
                    ↓
                  events
```

## Функции и триггеры

### Обновление статистики пользователя

```sql
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  last_date DATE;
  current_streak INTEGER;
BEGIN
  -- Получаем текущую статистику пользователя
  SELECT streak, last_practice_date::DATE INTO current_streak, last_date
  FROM public.user_stats
  WHERE user_id = NEW.user_id;
  
  -- Если это первая практика пользователя, создаем запись статистики
  IF NOT FOUND THEN
    INSERT INTO public.user_stats (
      user_id, 
      total_practice_time, 
      practice_count, 
      last_practice_date, 
      streak, 
      longest_streak
    ) 
    VALUES (
      NEW.user_id, 
      NEW.duration, 
      1, 
      NEW.practiced_at, 
      1, 
      1
    );
  ELSE
    -- Обновляем существующую статистику
    UPDATE public.user_stats 
    SET 
      total_practice_time = total_practice_time + NEW.duration,
      practice_count = practice_count + 1,
      last_practice_date = NEW.practiced_at,
      streak = CASE 
        WHEN last_date = current_date - INTERVAL '1 day' THEN current_streak + 1
        WHEN last_date = current_date THEN current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(
        longest_streak, 
        CASE 
          WHEN last_date = current_date - INTERVAL '1 day' THEN current_streak + 1
          WHEN last_date = current_date THEN current_streak
          ELSE 1
        END
      ),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stats_after_practice
AFTER INSERT ON public.practice_history
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();
```

### Генерация рекомендаций на основе истории

```sql
CREATE OR REPLACE FUNCTION generate_recommendations()
RETURNS TRIGGER AS $$
DECLARE
  similar_material_id UUID;
BEGIN
  -- Деактивировать старые рекомендации того же типа
  UPDATE public.recommendations
  SET active = false
  WHERE user_id = NEW.user_id AND recommendation_type = 'algorithm';
  
  -- Найти похожий материал по категории и тегам
  SELECT id INTO similar_material_id
  FROM public.materials m
  WHERE m.category = (
    SELECT category FROM public.materials WHERE id = NEW.material_id
  )
  AND m.id != NEW.material_id
  AND EXISTS (
    SELECT 1 FROM unnest(m.tags) t1
    JOIN unnest((SELECT tags FROM public.materials WHERE id = NEW.material_id)) t2
    ON t1 = t2
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.practice_history
    WHERE user_id = NEW.user_id AND material_id = m.id
  )
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Если найден похожий материал, создать рекомендацию
  IF similar_material_id IS NOT NULL THEN
    INSERT INTO public.recommendations (
      user_id,
      material_id,
      recommendation_type,
      reason,
      active
    )
    VALUES (
      NEW.user_id,
      similar_material_id,
      'algorithm',
      'Основано на ваших предыдущих практиках',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_recommendations_after_practice
AFTER INSERT ON public.practice_history
FOR EACH ROW
EXECUTE FUNCTION generate_recommendations();
```

## Политики безопасности RLS (Row Level Security)

### Пользователи (users)

```sql
-- Включаем RLS для таблицы users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика для чтения данных о текущем пользователе
CREATE POLICY users_select_own ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Политика для изменения только своих данных
CREATE POLICY users_update_own ON public.users 
FOR UPDATE USING (auth.uid() = id);
```

### Прогресс пользователя (user_progress)

```sql
-- Включаем RLS для таблицы user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Политика для чтения данных о прогрессе текущего пользователя
CREATE POLICY user_progress_select_own ON public.user_progress 
FOR SELECT USING (user_id = auth.uid());

-- Политика для изменения только своего прогресса
CREATE POLICY user_progress_update_own ON public.user_progress 
FOR UPDATE USING (user_id = auth.uid());

-- Политика для создания записей о своем прогрессе
CREATE POLICY user_progress_insert_own ON public.user_progress 
FOR INSERT WITH CHECK (user_id = auth.uid());
```

### Безопасность для других таблиц

Аналогичные политики безопасности настраиваются для всех таблиц, содержащих пользовательские данные, чтобы обеспечить доступ пользователей только к их собственной информации, за исключением публичных данных, таких как материалы и общедоступные события.

## Индексы и оптимизация

Для обеспечения высокой производительности созданы индексы для:

1. Всех полей внешних ключей (user_id, material_id и т.д.)
2. Часто используемых полей для фильтрации (category, type, tags и т.д.)
3. Временных полей (created_at, practiced_at, start_time и т.д.)
4. Полнотекстового поиска для поисковых запросов

## Миграции и управление схемой

Все изменения схемы базы данных отслеживаются через систему миграций. Каждая миграция представляет собой SQL-скрипт с версией и описанием изменений. Это обеспечивает:

1. Контроль версий схемы базы данных
2. Возможность откатить изменения при необходимости
3. Синхронизацию схемы между средами разработки, тестирования и продакшена
4. Автоматизацию процесса обновления 