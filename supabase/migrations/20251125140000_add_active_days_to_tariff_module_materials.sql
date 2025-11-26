-- Migration: Add active_days to tariff_module_materials
-- Date: 2025-11-25
-- Description: Добавляет поле active_days для хранения количества дней доступа к материалу

-- Добавляем поле active_days в tariff_module_materials
ALTER TABLE tariff_module_materials
ADD COLUMN IF NOT EXISTS active_days INTEGER DEFAULT NULL;

-- Комментарий
COMMENT ON COLUMN tariff_module_materials.active_days IS 'Количество дней, в течение которых материал будет доступен после открытия';

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Поле active_days добавлено в tariff_module_materials';
  RAISE NOTICE '   Это поле определяет, сколько дней будет доступен материал после открытия';
END $$;
