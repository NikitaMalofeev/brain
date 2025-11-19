-- Migration: Update free techniques to have available_from_module
-- Date: 2025-11-18
-- Description: Добавляем названия модулей к бесплатным техникам

-- Обновляем все бесплатные техники, у которых нет available_from_module
UPDATE public.techniques
SET available_from_module = 'Вводный модуль'
WHERE status = 'free' AND available_from_module IS NULL;
