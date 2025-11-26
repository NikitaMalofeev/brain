-- Migration: Setup dependencies for Empress, Priestess, and Goddess techniques
-- Date: 2025-11-26
-- Description: Настройка зависимостей для техник Императрица, Жрица, Богиня

-- ВНИМАНИЕ: Этот файл содержит ПРИМЕР настройки
-- Нужно заменить UUID техник на реальные ID из вашей базы данных

-- Шаг 1: Найти ID нужных техник
-- Выполните в SQL Editor:
-- SELECT id, name FROM materials WHERE name IN ('Императрица', 'Жрица', 'Богиня');

-- Шаг 2: Замените UUID ниже на реальные

DO $$
DECLARE
  v_empress_id UUID;
  v_priestess_id UUID;
  v_goddess_id UUID;
BEGIN
  -- Ищем технику "Императрица"
  SELECT id INTO v_empress_id FROM materials WHERE name = 'Императрица' LIMIT 1;

  -- Ищем технику "Жрица"
  SELECT id INTO v_priestess_id FROM materials WHERE name = 'Жрица' LIMIT 1;

  -- Ищем технику "Богиня"
  SELECT id INTO v_goddess_id FROM materials WHERE name = 'Богиня' LIMIT 1;

  IF v_empress_id IS NULL THEN
    RAISE NOTICE '⚠️ Техника "Императрица" не найдена. Пропускаем настройку.';
    RETURN;
  END IF;

  IF v_priestess_id IS NULL THEN
    RAISE NOTICE '⚠️ Техника "Жрица" не найдена. Пропускаем настройку.';
    RETURN;
  END IF;

  IF v_goddess_id IS NULL THEN
    RAISE NOTICE '⚠️ Техника "Богиня" не найдена. Пропускаем настройку.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Найдены техники:';
  RAISE NOTICE '   - Императрица: %', v_empress_id;
  RAISE NOTICE '   - Жрица: %', v_priestess_id;
  RAISE NOTICE '   - Богиня: %', v_goddess_id;

  -- Настройка для ЖРИЦЫ
  -- Требует: Императрица + оплата 5000₽
  UPDATE materials
  SET
    unlock_condition_type = 'requires_purchase_and_material',
    unlock_condition_value = jsonb_build_object(
      'required_material_id', v_empress_id,
      'purchase_required', true,
      'purchase_price', 5000
    )
  WHERE id = v_priestess_id;

  RAISE NOTICE '✅ Жрица настроена: требует Императрицу + оплату 5000₽';

  -- Настройка для БОГИНИ
  -- Требует: Жрица + 30 дней ожидания
  UPDATE materials
  SET
    unlock_condition_type = 'requires_material_with_duration',
    unlock_condition_value = jsonb_build_object(
      'required_material_id', v_priestess_id,
      'duration_days', 30
    )
  WHERE id = v_goddess_id;

  RAISE NOTICE '✅ Богиня настроена: требует Жрицу + 30 дней ожидания';

  -- Императрица остается без изменений (открывается через модуль)
  RAISE NOTICE '✅ Настройка завершена успешно!';
  RAISE NOTICE '';
  RAISE NOTICE 'Логика работы:';
  RAISE NOTICE '1. Императрица - открывается в модуле 2 (стандартная логика)';
  RAISE NOTICE '2. Жрица - после получения Императрицы можно купить за 5000₽';
  RAISE NOTICE '3. Богиня - через 30 дней после получения Жрицы';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Ошибка при настройке: %', SQLERRM;
END $$;
