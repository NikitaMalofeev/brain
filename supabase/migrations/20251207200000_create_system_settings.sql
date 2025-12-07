-- Migration: Create system_settings table
-- Date: 2025-12-07
-- Description: Таблица для хранения системных настроек (ссылки, конфигурации и т.д.)

-- =============================================
-- 1. СОЗДАТЬ ТАБЛИЦУ system_settings
-- =============================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Индекс для быстрого поиска по ключу
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Политики: читать могут все, редактировать только админы
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

CREATE POLICY "Anyone can read system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.system_settings IS
'Системные настройки приложения (ссылки, конфигурации и т.д.)';

-- =============================================
-- 2. ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON public.system_settings;

CREATE TRIGGER trigger_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_settings_updated_at();

-- =============================================
-- 3. ВСТАВИТЬ НАЧАЛЬНЫЕ НАСТРОЙКИ ДЛЯ ССЫЛОК
-- =============================================

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'library_buttons',
  '{
    "library_button": {
      "label": "Библиотека",
      "url": "",
      "enabled": true
    },
    "bioregulation_button": {
      "label": "Запустить биорегулирование",
      "url": "",
      "enabled": true
    }
  }'::jsonb,
  'Настройки кнопок внизу страницы библиотеки техник'
)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- ГОТОВО
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration: system_settings table created successfully';
END $$;
