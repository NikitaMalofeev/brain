-- Migration: Create calendar system tables
-- Date: 2025-11-14
-- Description: Создание таблиц для системы календаря: потоки, модули, события

-- ============================================
-- 1. Таблица потоков
-- ============================================
CREATE TABLE IF NOT EXISTS public.streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Поток сентябрь 2025"
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.streams IS 'Потоки обучения (группы учеников с общим расписанием)';
COMMENT ON COLUMN public.streams.start_date IS 'Дата начала потока, относительно которой рассчитываются даты событий';

-- ============================================
-- 2. Таблица модулей потока
-- ============================================
CREATE TABLE IF NOT EXISTS public.stream_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Модуль Исцеление"
  color TEXT DEFAULT '#4CAF50', -- Цвет модуля для подсветки в календаре
  order_num INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.stream_modules IS 'Модули внутри потока для группировки событий';
COMMENT ON COLUMN public.stream_modules.color IS 'Цвет для подсветки событий этого модуля в календаре';

-- ============================================
-- 3. Таблица событий календаря
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.stream_modules(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,

  -- Тип события
  event_type TEXT NOT NULL CHECK (event_type IN ('zoom', 'offline', 'lesson_unlock', 'material_unlock', 'technique_unlock')),

  -- Ссылки и ID для разных типов событий
  external_url TEXT, -- Для zoom/offline - ссылка на мероприятие
  lesson_id INT REFERENCES public.lessons(id) ON DELETE CASCADE, -- Для lesson_unlock
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE, -- Для material_unlock
  technique_id UUID REFERENCES public.techniques(id) ON DELETE CASCADE, -- Для technique_unlock

  -- Обложка события
  cover_image TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.calendar_events IS 'События календаря: вебинары, разблокировки уроков, материалов, техник';
COMMENT ON COLUMN public.calendar_events.event_type IS 'Тип события: zoom (онлайн вебинар), offline (оффлайн встреча), lesson_unlock, material_unlock, technique_unlock';

-- Индексы для быстрого поиска
CREATE INDEX idx_calendar_events_stream ON public.calendar_events(stream_id);
CREATE INDEX idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX idx_calendar_events_module ON public.calendar_events(module_id);

-- ============================================
-- 4. Таблица доступа к событиям по тарифам
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_tariff_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  tariff_id UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, tariff_id)
);

COMMENT ON TABLE public.event_tariff_access IS 'Доступ к событиям календаря по тарифам';

-- ============================================
-- 5. Таблица записи пользователей на потоки
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_stream_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stream_id)
);

COMMENT ON TABLE public.user_stream_enrollments IS 'Запись пользователей на потоки обучения';

-- Индекс для быстрого поиска
CREATE INDEX idx_user_stream_enrollments_user ON public.user_stream_enrollments(user_id);
CREATE INDEX idx_user_stream_enrollments_stream ON public.user_stream_enrollments(stream_id);

-- ============================================
-- 6. Триггеры для updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_streams_updated_at
  BEFORE UPDATE ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. RLS Policies
-- ============================================

-- Streams: только админы могут создавать/редактировать
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage streams"
  ON public.streams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Stream modules: только админы
ALTER TABLE public.stream_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stream modules"
  ON public.stream_modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Calendar events: чтение для всех аутентифицированных, управление для админов
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view calendar events"
  ON public.calendar_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage calendar events"
  ON public.calendar_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Event tariff access: только админы
ALTER TABLE public.event_tariff_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event tariff access"
  ON public.event_tariff_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User stream enrollments: пользователи видят свои, админы видят все
ALTER TABLE public.user_stream_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their enrollments"
  ON public.user_stream_enrollments
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'curator')
  ));

CREATE POLICY "Admins can manage enrollments"
  ON public.user_stream_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 8. Вывод информации
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Таблицы календаря успешно созданы:';
  RAISE NOTICE '- streams (потоки обучения)';
  RAISE NOTICE '- stream_modules (модули потока)';
  RAISE NOTICE '- calendar_events (события календаря)';
  RAISE NOTICE '- event_tariff_access (доступ к событиям по тарифам)';
  RAISE NOTICE '- user_stream_enrollments (запись пользователей на потоки)';
END $$;
