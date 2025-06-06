    -- Этап 1: Создание таблицы для справочника тарифов
CREATE TABLE public.tariffs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tariffs IS 'Справочник тарифов (T1, T2, T3, T4 и т.д.)';
COMMENT ON COLUMN public.tariffs.code IS 'Уникальный код тарифа для использования в логике (например, "T1")';

-- Этап 2: Создание таблицы для связи пользователей с тарифами
CREATE TABLE public.user_tariffs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tariff_id   UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_tariffs IS 'Привязка пользователей к их активным тарифам.';
COMMENT ON COLUMN public.user_tariffs.is_active IS 'Флаг активности тарифа для ручного управления.';

-- У одного пользователя может быть только один активный тариф
CREATE UNIQUE INDEX uq_user_active_tariff ON public.user_tariffs(user_id) WHERE (is_active = true);

-- Этап 3: Создание таблицы с "матрицей доступа" - лимиты и условия для тарифов
CREATE TABLE public.tariff_limits (
  id                    BIGSERIAL PRIMARY KEY,
  tariff_id             UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  stage_id              BIGINT NOT NULL REFERENCES public.course_stages(id) ON DELETE CASCADE,
  max_days_access       INTEGER NULL,
  requires_full_prereq  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tariff_id, stage_id)
);

COMMENT ON TABLE public.tariff_limits IS 'Правила доступа тарифов к этапам курсов.';
COMMENT ON COLUMN public.tariff_limits.max_days_access IS 'Лимит доступа в днях/уроках для этапа (NULL = безлимитно).';
COMMENT ON COLUMN public.tariff_limits.requires_full_prereq IS 'Требуется ли сдача всех ДЗ на предыдущих этапах для доступа.';

-- Этап 4: Создание таблицы для доступа к дополнительным материалам
CREATE TABLE public.tariff_material_access (
  id           BIGSERIAL PRIMARY KEY,
  tariff_id    UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  material_id  UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tariff_id, material_id)
);

COMMENT ON TABLE public.tariff_material_access IS 'Связь тарифов с доступом к дополнительным материалам (библиотеке).';

-- Этап 5: Создание таблицы для доступа к чатам
CREATE TABLE public.tariff_chat_access (
  id         BIGSERIAL PRIMARY KEY,
  tariff_id  UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  chat_id    UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tariff_id, chat_id)
);

COMMENT ON TABLE public.tariff_chat_access IS 'Связь тарифов с доступом к Telegram-чатам.';

-- Этап 6: Заполнение справочника тарифов
INSERT INTO public.tariffs (id, name, code, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Тариф 250+', 'T1', 'Предобучение + 7 дней основного обучения. Условный доступ к "Доктор наук" и "Спецслужбы"'),
('22222222-2222-2222-2222-222222222222', 'Тариф 500+', 'T2', 'Предобучение + 9 дней основного обучения. Условный доступ к "Доктор наук" и "Спецслужбы"'),
('33333333-3333-3333-3333-333333333333', 'Тариф 1млн+', 'T3', 'Предобучение + всё основное обучение. Прямой доступ к "Доктор наук" и "Спецслужбы"'),
('44444444-4444-4444-4444-444444444444', 'Тариф 10млн+', 'T4', 'Всё включено. Прямой доступ ко всем материалам и уровням.'); 