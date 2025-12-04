-- Migration: Fix material constraints to allow same material on multiple days
-- Date: 2025-12-04
-- Description: Удаляет старые уникальные constraints и создаёт новые с учётом дня

-- =============================================
-- 1. ИСПРАВЛЕНИЯ ДЛЯ tariff_module_materials
-- =============================================
-- Удаляем старый constraint (имя от старой таблицы tariff_module_techniques)
ALTER TABLE public.tariff_module_materials
DROP CONSTRAINT IF EXISTS tariff_module_techniques_tariff_stream_module_id_technique__key;

-- Удаляем constraint который мог создаться ранее
ALTER TABLE public.tariff_module_materials
DROP CONSTRAINT IF EXISTS tariff_module_materials_module_material_day_unique;

-- Создаём правильный constraint с учётом дня
ALTER TABLE public.tariff_module_materials
ADD CONSTRAINT tariff_module_materials_module_material_day_unique
UNIQUE(tariff_stream_module_id, material_id, unlock_offset_days);

-- =============================================
-- 2. ИСПРАВЛЕНИЯ ДЛЯ module_materials
-- =============================================
-- Удаляем все старые constraints
ALTER TABLE public.module_materials
DROP CONSTRAINT IF EXISTS module_materials_unique_stream_tariff_module_material;

ALTER TABLE public.module_materials
DROP CONSTRAINT IF EXISTS module_materials_module_material_day_unique;

ALTER TABLE public.module_materials
DROP CONSTRAINT IF EXISTS stream_module_techniques_stream_module_id_technique_id_key;

-- Создаём единственный правильный constraint с учётом дня
ALTER TABLE public.module_materials
ADD CONSTRAINT module_materials_module_material_day_unique
UNIQUE(module_id, material_id, stream_id, tariff_id, release_day);
