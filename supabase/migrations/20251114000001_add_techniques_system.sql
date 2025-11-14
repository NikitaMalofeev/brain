-- Migration: Add Techniques System (Audio Practices)
-- Date: 2025-11-14
-- Description: Создание системы техник (аудиопрактик) с условным доступом

-- 1. Создать таблицу techniques
CREATE TABLE public.techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_image TEXT,
  duration_seconds INT,

  -- Статусы: 'free', 'purchasable', 'locked'
  status TEXT NOT NULL DEFAULT 'purchasable'
    CHECK (status IN ('free', 'purchasable', 'locked')),

  -- URL для покупки на сайте
  purchase_url TEXT,

  -- URL чата с отделом продаж (для повышения тарифа)
  upgrade_tariff_chat_url TEXT,

  -- Метка "Доступна с модуля X"
  available_from_module TEXT,

  -- Условие разблокировки
  unlock_condition_type TEXT
    CHECK (unlock_condition_type IN ('after_technique', 'after_duration') OR unlock_condition_type IS NULL),

  -- Значение условия разблокировки (JSON)
  -- Формат: { "technique_id": "uuid", "duration_days": 30 }
  unlock_condition_value JSONB,

  -- Порядок отображения
  order_num INT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.techniques IS 'Техники (аудиопрактики) с условным доступом';
COMMENT ON COLUMN public.techniques.status IS 'Статус: free (бесплатная), purchasable (доступна к покупке), locked (заблокирована по условию)';
COMMENT ON COLUMN public.techniques.unlock_condition_type IS 'Тип условия разблокировки: after_technique (после получения другой техники), after_duration (через время)';
COMMENT ON COLUMN public.techniques.unlock_condition_value IS 'Параметры условия в формате JSON';

-- 2. Создать таблицу доступа пользователей к техникам
CREATE TABLE public.user_technique_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = навсегда
  access_source TEXT NOT NULL DEFAULT 'purchase'
    CHECK (access_source IN ('purchase', 'tariff', 'gift', 'free')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, technique_id)
);

COMMENT ON TABLE public.user_technique_access IS 'Доступ пользователей к техникам';
COMMENT ON COLUMN public.user_technique_access.access_source IS 'Источник доступа: purchase (покупка), tariff (включено в тариф), gift (подарок), free (бесплатная)';

-- 3. Создать индексы для производительности
CREATE INDEX idx_techniques_status ON public.techniques(status);
CREATE INDEX idx_techniques_order ON public.techniques(order_num);
CREATE INDEX idx_user_technique_access_user ON public.user_technique_access(user_id);
CREATE INDEX idx_user_technique_access_technique ON public.user_technique_access(technique_id);

-- 4. Создать триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_techniques_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_techniques_updated_at
  BEFORE UPDATE ON public.techniques
  FOR EACH ROW
  EXECUTE FUNCTION update_techniques_updated_at();

-- 5. Заполнить тестовыми данными (3 техники: Императрица, Верховная жрица, Богиня)
-- Императрица - доступна к покупке сразу
INSERT INTO public.techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- ID Императрицы
  'Императрица',
  'Аудиопрактика для раскрытия женской энергии',
  '/techniques/empress.mp3',
  '/techniques/empress.jpg',
  1800,
  'purchasable',
  'https://brainprogramming.ru/buy/empress',
  'https://t.me/brainprogramming_sales',
  'Модуль 1',
  NULL,
  NULL,
  1
);

-- Верховная жрица - доступна через 1 месяц после получения Императрицы
INSERT INTO public.techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  '00000000-0000-0000-0000-000000000002', -- ID Верховной жрицы
  'Верховная жрица',
  'Углубленная практика для духовного развития',
  '/techniques/priestess.mp3',
  '/techniques/priestess.jpg',
  2100,
  'locked',
  'https://brainprogramming.ru/buy/priestess',
  'https://t.me/brainprogramming_sales',
  'Модуль 2',
  'after_technique',
  '{"technique_id": "00000000-0000-0000-0000-000000000001", "duration_days": 30}',
  2
);

-- Богиня - доступна через 1 месяц после получения Верховной жрицы
INSERT INTO public.techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  '00000000-0000-0000-0000-000000000003', -- ID Богини
  'Богиня',
  'Высшая практика для достижения мастерства',
  '/techniques/goddess.mp3',
  '/techniques/goddess.jpg',
  2400,
  'locked',
  'https://brainprogramming.ru/buy/goddess',
  'https://t.me/brainprogramming_sales',
  'Модуль 3',
  'after_technique',
  '{"technique_id": "00000000-0000-0000-0000-000000000002", "duration_days": 30}',
  3
);

-- Добавить несколько бесплатных техник для гостей
INSERT INTO public.techniques (
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  available_from_module,
  order_num
) VALUES
(
  'Введение в медитацию',
  'Вводная бесплатная практика для новичков',
  '/techniques/intro.mp3',
  '/techniques/intro.jpg',
  900,
  'free',
  NULL,
  0
),
(
  'Дыхательная практика',
  'Базовая дыхательная техника',
  '/techniques/breathing.mp3',
  '/techniques/breathing.jpg',
  600,
  'free',
  NULL,
  0
);
