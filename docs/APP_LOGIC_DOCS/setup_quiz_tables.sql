-- Таблица типов контента
CREATE TABLE IF NOT EXISTS public.content_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица категорий контента
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    display_order INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица контента (практик)
CREATE TABLE IF NOT EXISTS public.contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    duration INTEGER NOT NULL, -- Длительность в секундах
    thumbnail_url TEXT,
    background_image_url TEXT,
    content_type_id UUID REFERENCES public.content_types(id),
    category_id UUID REFERENCES public.categories(id),
    difficulty_level TEXT,
    kinescope_id TEXT, -- ID видео в Kinescope
    audio_file_path TEXT, -- Путь к аудиофайлу
    is_premium BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица логики квиза
CREATE TABLE IF NOT EXISTS public.quiz_logic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_type TEXT NOT NULL, -- 'short', 'physical', 'breathing', 'meditation'
    duration_min INTEGER, -- Минимальная длительность в секундах
    duration_max INTEGER, -- Максимальная длительность в секундах
    goal TEXT, -- Цель практики
    approach TEXT, -- Подход ('self', 'guided') - для медитаций
    content_id UUID REFERENCES public.contents(id),
    priority INTEGER DEFAULT 0, -- Приоритет для выбора при множественных совпадениях
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица истории квиза пользователя
CREATE TABLE IF NOT EXISTS public.user_quiz_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    practice_type TEXT NOT NULL,
    duration INTEGER,
    goal TEXT,
    approach TEXT,
    content_id UUID REFERENCES public.contents(id),
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица статистики пользователя
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) UNIQUE,
    total_practices INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- Общая продолжительность в секундах
    last_practice_at TIMESTAMPTZ,
    streak_days INTEGER DEFAULT 0,
    max_streak_days INTEGER DEFAULT 0,
    practice_stats JSONB, -- Детальная статистика по типам практик
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для повышения производительности запросов
CREATE INDEX IF NOT EXISTS idx_contents_content_type_id ON public.contents (content_type_id);
CREATE INDEX IF NOT EXISTS idx_contents_category_id ON public.contents (category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_logic_content_id ON public.quiz_logic (content_id);
CREATE INDEX IF NOT EXISTS idx_quiz_logic_practice_type ON public.quiz_logic (practice_type);
CREATE INDEX IF NOT EXISTS idx_user_quiz_history_user_id ON public.user_quiz_history (user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_history_content_id ON public.user_quiz_history (content_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats (user_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применение триггеров
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contents_updated_at
BEFORE UPDATE ON public.contents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_logic_updated_at
BEFORE UPDATE ON public.quiz_logic
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание начальных типов контента
INSERT INTO public.content_types (name, slug, description)
VALUES 
    ('Телесная практика', 'physical', 'Физические упражнения для тела'),
    ('Дыхательная практика', 'breathing', 'Дыхательные упражнения'),
    ('Медитация', 'meditation', 'Практики для ума и осознанности'),
    ('Короткая практика', 'short', 'Короткие практики до 7 минут')
ON CONFLICT (slug) DO NOTHING;

-- Создание начальных категорий
INSERT INTO public.categories (name, slug, description, display_order)
VALUES 
    ('Утренние практики', 'morning', 'Практики для бодрого начала дня', 10),
    ('Вечерние практики', 'evening', 'Практики для расслабления перед сном', 20),
    ('Снятие стресса', 'stress-relief', 'Практики для снижения уровня стресса', 30),
    ('Для начинающих', 'beginners', 'Практики для тех, кто только начинает', 40),
    ('Для продвинутых', 'advanced', 'Практики для опытных практикующих', 50)
ON CONFLICT (slug) DO NOTHING;

-- Настройка RLS (Row Level Security)
-- Таблица quiz_logic должна быть доступна для чтения всем, но изменять могут только админы
ALTER TABLE public.quiz_logic ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_logic_select_policy ON public.quiz_logic FOR SELECT USING (true);

-- Таблица contents должна быть доступна для чтения всем, но изменять могут только админы
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY contents_select_policy ON public.contents FOR SELECT USING (true);

-- Таблица user_quiz_history доступна только для своего пользователя
ALTER TABLE public.user_quiz_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_quiz_history_select_policy ON public.user_quiz_history 
    FOR SELECT USING (auth.uid() = user_id::text);
CREATE POLICY user_quiz_history_insert_policy ON public.user_quiz_history 
    FOR INSERT WITH CHECK (auth.uid() = user_id::text);
CREATE POLICY user_quiz_history_update_policy ON public.user_quiz_history 
    FOR UPDATE USING (auth.uid() = user_id::text);

-- Таблица user_stats доступна только для своего пользователя
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_stats_select_policy ON public.user_stats 
    FOR SELECT USING (auth.uid() = user_id::text);
CREATE POLICY user_stats_insert_policy ON public.user_stats 
    FOR INSERT WITH CHECK (auth.uid() = user_id::text);
CREATE POLICY user_stats_update_policy ON public.user_stats 
    FOR UPDATE USING (auth.uid() = user_id::text); 