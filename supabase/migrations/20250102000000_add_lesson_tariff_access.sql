-- Создание таблицы для доступа тарифов к отдельным урокам
CREATE TABLE public.tariff_lesson_access (
  id           BIGSERIAL PRIMARY KEY,
  tariff_id    UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  lesson_id    BIGINT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tariff_id, lesson_id)
);

COMMENT ON TABLE public.tariff_lesson_access IS 'Связь тарифов с доступом к отдельным урокам. Если для урока нет записей - доступен всем тарифам.';
COMMENT ON COLUMN public.tariff_lesson_access.tariff_id IS 'Ссылка на тариф';
COMMENT ON COLUMN public.tariff_lesson_access.lesson_id IS 'Ссылка на урок';

-- Индексы для оптимизации запросов
CREATE INDEX idx_tariff_lesson_access_tariff_id ON public.tariff_lesson_access(tariff_id);
CREATE INDEX idx_tariff_lesson_access_lesson_id ON public.tariff_lesson_access(lesson_id);

-- RLS отключен для админского управления
-- ALTER TABLE public.tariff_lesson_access ENABLE ROW LEVEL SECURITY; 