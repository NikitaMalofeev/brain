-- Migration: Create user_module_access table
-- Date: 2025-11-19
-- Description: Отслеживание доступа пользователя к модулям с учётом времени

-- =============================================
-- 1. СОЗДАТЬ ТАБЛИЦУ user_module_access
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stream_module_id UUID NOT NULL REFERENCES public.stream_modules(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = бессрочно
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность: один пользователь может иметь только один доступ к модулю
  UNIQUE(user_id, stream_module_id)
);

COMMENT ON TABLE public.user_module_access IS 'Отслеживание доступа пользователя к модулям. Хранит дату начала и окончания доступа.';
COMMENT ON COLUMN public.user_module_access.granted_at IS 'Когда пользователь получил доступ к модулю';
COMMENT ON COLUMN public.user_module_access.expires_at IS 'Когда доступ к модулю истекает (NULL = бессрочно)';

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_module_access_user
  ON public.user_module_access(user_id);

CREATE INDEX IF NOT EXISTS idx_user_module_access_module
  ON public.user_module_access(stream_module_id);

CREATE INDEX IF NOT EXISTS idx_user_module_access_expires
  ON public.user_module_access(expires_at);

-- =============================================
-- 2. ФУНКЦИЯ: Автоматическое создание доступа к модулям при назначении тарифа
-- =============================================
CREATE OR REPLACE FUNCTION grant_module_access_on_tariff_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_stream_id UUID;
  v_stream_tariff_id UUID;
  v_module RECORD;
BEGIN
  -- Если тариф стал активным
  IF NEW.is_active = true THEN
    -- Получить поток пользователя
    SELECT stream_id INTO v_stream_id
    FROM public.user_stream_enrollments
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF v_stream_id IS NULL THEN
      -- Если пользователь не в потоке, ничего не делаем
      RETURN NEW;
    END IF;

    -- Получить stream_tariff_id
    SELECT id INTO v_stream_tariff_id
    FROM public.stream_tariffs
    WHERE stream_id = v_stream_id AND tariff_id = NEW.tariff_id;

    IF v_stream_tariff_id IS NULL THEN
      -- Если связь тарифа с потоком не настроена, ничего не делаем
      RETURN NEW;
    END IF;

    -- Создать доступ ко всем модулям тарифа
    FOR v_module IN
      SELECT
        tsm.stream_module_id,
        tsm.access_duration_days
      FROM public.tariff_stream_modules tsm
      WHERE tsm.stream_tariff_id = v_stream_tariff_id
    LOOP
      INSERT INTO public.user_module_access (
        user_id,
        stream_module_id,
        granted_at,
        expires_at
      ) VALUES (
        NEW.user_id,
        v_module.stream_module_id,
        NOW(),
        CASE
          WHEN v_module.access_duration_days IS NULL THEN NULL
          ELSE NOW() + (v_module.access_duration_days || ' days')::INTERVAL
        END
      )
      ON CONFLICT (user_id, stream_module_id) DO UPDATE
      SET
        granted_at = NOW(),
        expires_at = CASE
          WHEN v_module.access_duration_days IS NULL THEN NULL
          ELSE NOW() + (v_module.access_duration_days || ' days')::INTERVAL
        END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на вставку/обновление user_tariffs
DROP TRIGGER IF EXISTS trigger_grant_module_access ON public.user_tariffs;

CREATE TRIGGER trigger_grant_module_access
  AFTER INSERT OR UPDATE ON public.user_tariffs
  FOR EACH ROW
  EXECUTE FUNCTION grant_module_access_on_tariff_assignment();

COMMENT ON FUNCTION grant_module_access_on_tariff_assignment IS 'Автоматически создаёт доступ к модулям при назначении тарифа пользователю';
