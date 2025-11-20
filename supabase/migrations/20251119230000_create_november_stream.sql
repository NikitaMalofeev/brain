  -- Migration: Create November 2025 Stream (starts tomorrow 20.11.2025)
  -- Date: 2025-11-19
  -- Description: Создание потока с датой старта 20.11.2025 для тестирования открытия техник

  -- =============================================
  -- 1. СОЗДАНИЕ ПОТОКА НОЯБРЬ 2025
  -- =============================================
  DO $$
  DECLARE
    v_course_id UUID;
  BEGIN
    -- Получаем первый курс
    SELECT id INTO v_course_id FROM courses LIMIT 1;

    IF v_course_id IS NULL THEN
      -- Если нет курсов, создаем тестовый
      INSERT INTO courses (name, description, is_active)
      VALUES ('Тестовый курс', 'Курс для тестирования тарифов', TRUE)
      RETURNING id INTO v_course_id;
    END IF;

    INSERT INTO streams (id, name, course_id, start_date, is_active)
    VALUES (
      'aaaabbbb-cccc-dddd-eeee-ffff00001120',
      'Поток Ноябрь 20.11.2025',
      v_course_id,
      '2025-11-20',
      TRUE
    )
    ON CONFLICT (id) DO NOTHING;
  END $$;

  -- =============================================
  -- 2. СОЗДАНИЕ МОДУЛЕЙ ДЛЯ ПОТОКА
  -- =============================================
  INSERT INTO stream_modules (id, stream_id, name, order_num, color)
  VALUES
    -- Модуль 1: Основы
    (
      'a1111111-1111-1111-1111-111111111120',
      'aaaabbbb-cccc-dddd-eeee-ffff00001120',
      'Модуль 1: Основы',
      1,
      '#4CAF50'
    ),
    -- Модуль 2: Продвинутый
    (
      'a2222222-2222-2222-2222-222222222220',
      'aaaabbbb-cccc-dddd-eeee-ffff00001120',
      'Модуль 2: Продвинутый уровень',
      2,
      '#2196F3'
    ),
    -- Модуль 3: Мастерство
    (
      'a3333333-3333-3333-3333-333333333320',
      'aaaabbbb-cccc-dddd-eeee-ffff00001120',
      'Модуль 3: Мастерство',
      3,
      '#9C27B0'
    ),
    -- Модуль 4: Женские архетипы (доступен для всех тарифов)
    (
      'a4444444-4444-4444-4444-444444444420',
      'aaaabbbb-cccc-dddd-eeee-ffff00001120',
      'Модуль 4: Женские архетипы',
      4,
      '#E91E63'
    )
  ON CONFLICT (id) DO NOTHING;

  -- =============================================
  -- 3. НАСТРОЙКА ТАРИФА T1 для нового потока
  -- =============================================
  DO $$
  DECLARE
    v_stream_tariff_id UUID;
    v_tariff_stream_module_id UUID;
    v_tariff_id UUID;
  BEGIN
    SELECT id INTO v_tariff_id FROM tariffs WHERE code = 'T1' LIMIT 1;

    IF v_tariff_id IS NOT NULL THEN
      SELECT id INTO v_stream_tariff_id
      FROM stream_tariffs
      WHERE stream_id = 'aaaabbbb-cccc-dddd-eeee-ffff00001120'
        AND tariff_id = v_tariff_id;

      IF v_stream_tariff_id IS NULL THEN
        INSERT INTO stream_tariffs (stream_id, tariff_id)
        VALUES ('aaaabbbb-cccc-dddd-eeee-ffff00001120', v_tariff_id)
        RETURNING id INTO v_stream_tariff_id;
      END IF;

      -- Модуль 1 (30 дней)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a1111111-1111-1111-1111-111111111120', 30, 1)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_tariff_stream_module_id;

      IF v_tariff_stream_module_id IS NULL THEN
        SELECT id INTO v_tariff_stream_module_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a1111111-1111-1111-1111-111111111120';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_tariff_stream_module_id, '11111111-1111-1111-1111-111111111111', 0, 1),  -- Дыхание - сразу
        (v_tariff_stream_module_id, '22222222-2222-2222-2222-222222222222', 0, 2)   -- Сканирование - сразу
      ON CONFLICT DO NOTHING;

      -- Модуль 4 Женские архетипы (бессрочно)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a4444444-4444-4444-4444-444444444420', NULL, 2)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_tariff_stream_module_id;

      IF v_tariff_stream_module_id IS NULL THEN
        SELECT id INTO v_tariff_stream_module_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a4444444-4444-4444-4444-444444444420';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_tariff_stream_module_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 0, 1),   -- Императрица - сразу (20.11)
        (v_tariff_stream_module_id, 'aaaaffff-ffff-ffff-ffff-ffffffffffff', 30, 2),  -- Жрица - 20.12
        (v_tariff_stream_module_id, 'bbbbffff-ffff-ffff-ffff-ffffffffffff', 60, 3)   -- Богиня - 19.01.2026
      ON CONFLICT DO NOTHING;
    END IF;
  END $$;

  -- =============================================
  -- 4. НАСТРОЙКА ТАРИФА T2 для нового потока
  -- =============================================
  DO $$
  DECLARE
    v_stream_tariff_id UUID;
    v_module1_id UUID;
    v_module2_id UUID;
    v_module4_id UUID;
    v_tariff_id UUID;
  BEGIN
    SELECT id INTO v_tariff_id FROM tariffs WHERE code = 'T2' LIMIT 1;

    IF v_tariff_id IS NOT NULL THEN
      SELECT id INTO v_stream_tariff_id
      FROM stream_tariffs
      WHERE stream_id = 'aaaabbbb-cccc-dddd-eeee-ffff00001120'
        AND tariff_id = v_tariff_id;

      IF v_stream_tariff_id IS NULL THEN
        INSERT INTO stream_tariffs (stream_id, tariff_id)
        VALUES ('aaaabbbb-cccc-dddd-eeee-ffff00001120', v_tariff_id)
        RETURNING id INTO v_stream_tariff_id;
      END IF;

      -- Модуль 1 (бессрочно)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a1111111-1111-1111-1111-111111111120', NULL, 1)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module1_id;

      IF v_module1_id IS NULL THEN
        SELECT id INTO v_module1_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a1111111-1111-1111-1111-111111111120';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module1_id, '11111111-1111-1111-1111-111111111111', 0, 1),   -- 20.11 сразу
        (v_module1_id, '22222222-2222-2222-2222-222222222222', 0, 2),   -- 20.11 сразу
        (v_module1_id, '33333333-3333-3333-3333-333333333333', 7, 3),   -- 27.11
        (v_module1_id, '44444444-4444-4444-4444-444444444444', 14, 4)   -- 04.12
      ON CONFLICT DO NOTHING;

      -- Модуль 2 (60 дней)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a2222222-2222-2222-2222-222222222220', 60, 2)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module2_id;

      IF v_module2_id IS NULL THEN
        SELECT id INTO v_module2_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a2222222-2222-2222-2222-222222222220';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module2_id, '55555555-5555-5555-5555-555555555555', 0, 1),  -- 20.11 сразу
        (v_module2_id, '66666666-6666-6666-6666-666666666666', 7, 2)   -- 27.11
      ON CONFLICT DO NOTHING;

      -- Модуль 4 Женские архетипы (бессрочно)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a4444444-4444-4444-4444-444444444420', NULL, 3)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module4_id;

      IF v_module4_id IS NULL THEN
        SELECT id INTO v_module4_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a4444444-4444-4444-4444-444444444420';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module4_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 0, 1),   -- Императрица - 20.11
        (v_module4_id, 'aaaaffff-ffff-ffff-ffff-ffffffffffff', 30, 2),  -- Жрица - 20.12
        (v_module4_id, 'bbbbffff-ffff-ffff-ffff-ffffffffffff', 60, 3)   -- Богиня - 19.01.2026
      ON CONFLICT DO NOTHING;
    END IF;
  END $$;

  -- =============================================
  -- 5. НАСТРОЙКА ТАРИФА T3 для нового потока
  -- =============================================
  DO $$
  DECLARE
    v_stream_tariff_id UUID;
    v_module1_id UUID;
    v_module2_id UUID;
    v_module3_id UUID;
    v_module4_id UUID;
    v_tariff_id UUID;
  BEGIN
    SELECT id INTO v_tariff_id FROM tariffs WHERE code = 'T3' LIMIT 1;

    IF v_tariff_id IS NOT NULL THEN
      SELECT id INTO v_stream_tariff_id
      FROM stream_tariffs
      WHERE stream_id = 'aaaabbbb-cccc-dddd-eeee-ffff00001120'
        AND tariff_id = v_tariff_id;

      IF v_stream_tariff_id IS NULL THEN
        INSERT INTO stream_tariffs (stream_id, tariff_id)
        VALUES ('aaaabbbb-cccc-dddd-eeee-ffff00001120', v_tariff_id)
        RETURNING id INTO v_stream_tariff_id;
      END IF;

      -- Модуль 1 (бессрочно)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a1111111-1111-1111-1111-111111111120', NULL, 1)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module1_id;

      IF v_module1_id IS NULL THEN
        SELECT id INTO v_module1_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a1111111-1111-1111-1111-111111111120';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module1_id, '11111111-1111-1111-1111-111111111111', 0, 1),   -- 20.11 сразу
        (v_module1_id, '22222222-2222-2222-2222-222222222222', 0, 2),   -- 20.11 сразу
        (v_module1_id, '33333333-3333-3333-3333-333333333333', 0, 3),   -- 20.11 сразу
        (v_module1_id, '44444444-4444-4444-4444-444444444444', 7, 4)    -- 27.11
      ON CONFLICT DO NOTHING;

      -- Модуль 2 (бессрочно)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a2222222-2222-2222-2222-222222222220', NULL, 2)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module2_id;

      IF v_module2_id IS NULL THEN
        SELECT id INTO v_module2_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a2222222-2222-2222-2222-222222222220';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module2_id, '55555555-5555-5555-5555-555555555555', 0, 1),   -- 20.11 сразу
        (v_module2_id, '66666666-6666-6666-6666-666666666666', 0, 2),   -- 20.11 сразу
        (v_module2_id, '77777777-7777-7777-7777-777777777777', 7, 3),   -- 27.11
        (v_module2_id, '88888888-8888-8888-8888-888888888888', 14, 4)   -- 04.12
      ON CONFLICT DO NOTHING;

      -- Модуль 3 (90 дней)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a3333333-3333-3333-3333-333333333320', 90, 3)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module3_id;

      IF v_module3_id IS NULL THEN
        SELECT id INTO v_module3_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a3333333-3333-3333-3333-333333333320';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module3_id, '99999999-9999-9999-9999-999999999999', 0, 1),  -- 20.11 сразу
        (v_module3_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 7, 2)   -- 27.11
      ON CONFLICT DO NOTHING;

      -- Модуль 4 Женские архетипы (бессрочно)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a4444444-4444-4444-4444-444444444420', NULL, 4)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module4_id;

      IF v_module4_id IS NULL THEN
        SELECT id INTO v_module4_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a4444444-4444-4444-4444-444444444420';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module4_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 0, 1),   -- Императрица - 20.11
        (v_module4_id, 'aaaaffff-ffff-ffff-ffff-ffffffffffff', 30, 2),  -- Жрица - 20.12
        (v_module4_id, 'bbbbffff-ffff-ffff-ffff-ffffffffffff', 60, 3)   -- Богиня - 19.01.2026
      ON CONFLICT DO NOTHING;
    END IF;
  END $$;

  -- =============================================
  -- 6. НАСТРОЙКА ТАРИФА T4 для нового потока
  -- =============================================
  DO $$
  DECLARE
    v_stream_tariff_id UUID;
    v_module1_id UUID;
    v_module2_id UUID;
    v_module3_id UUID;
    v_module4_id UUID;
    v_tariff_id UUID;
  BEGIN
    SELECT id INTO v_tariff_id FROM tariffs WHERE code = 'T4' LIMIT 1;

    IF v_tariff_id IS NOT NULL THEN
      SELECT id INTO v_stream_tariff_id
      FROM stream_tariffs
      WHERE stream_id = 'aaaabbbb-cccc-dddd-eeee-ffff00001120'
        AND tariff_id = v_tariff_id;

      IF v_stream_tariff_id IS NULL THEN
        INSERT INTO stream_tariffs (stream_id, tariff_id)
        VALUES ('aaaabbbb-cccc-dddd-eeee-ffff00001120', v_tariff_id)
        RETURNING id INTO v_stream_tariff_id;
      END IF;

      -- Модуль 1 (бессрочно, все сразу)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a1111111-1111-1111-1111-111111111120', NULL, 1)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module1_id;

      IF v_module1_id IS NULL THEN
        SELECT id INTO v_module1_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a1111111-1111-1111-1111-111111111120';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module1_id, '11111111-1111-1111-1111-111111111111', 0, 1),  -- Все сразу 20.11
        (v_module1_id, '22222222-2222-2222-2222-222222222222', 0, 2),
        (v_module1_id, '33333333-3333-3333-3333-333333333333', 0, 3),
        (v_module1_id, '44444444-4444-4444-4444-444444444444', 0, 4)
      ON CONFLICT DO NOTHING;

      -- Модуль 2 (бессрочно, все сразу)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a2222222-2222-2222-2222-222222222220', NULL, 2)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module2_id;

      IF v_module2_id IS NULL THEN
        SELECT id INTO v_module2_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a2222222-2222-2222-2222-222222222220';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module2_id, '55555555-5555-5555-5555-555555555555', 0, 1),  -- Все сразу 20.11
        (v_module2_id, '66666666-6666-6666-6666-666666666666', 0, 2),
        (v_module2_id, '77777777-7777-7777-7777-777777777777', 0, 3),
        (v_module2_id, '88888888-8888-8888-8888-888888888888', 0, 4)
      ON CONFLICT DO NOTHING;

      -- Модуль 3 (бессрочно, все сразу)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a3333333-3333-3333-3333-333333333320', NULL, 3)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module3_id;

      IF v_module3_id IS NULL THEN
        SELECT id INTO v_module3_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a3333333-3333-3333-3333-333333333320';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module3_id, '99999999-9999-9999-9999-999999999999', 0, 1),  -- Все сразу 20.11
        (v_module3_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, 2),
        (v_module3_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0, 3),
        (v_module3_id, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 0, 4)
      ON CONFLICT DO NOTHING;

      -- Модуль 4 Женские архетипы (бессрочно, все сразу для VIP)
      INSERT INTO tariff_stream_modules (stream_tariff_id, stream_module_id, access_duration_days, order_num)
      VALUES (v_stream_tariff_id, 'a4444444-4444-4444-4444-444444444420', NULL, 4)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_module4_id;

      IF v_module4_id IS NULL THEN
        SELECT id INTO v_module4_id
        FROM tariff_stream_modules
        WHERE stream_tariff_id = v_stream_tariff_id
          AND stream_module_id = 'a4444444-4444-4444-4444-444444444420';
      END IF;

      INSERT INTO tariff_module_techniques (tariff_stream_module_id, technique_id, unlock_offset_days, order_num)
      VALUES
        (v_module4_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 0, 1),  -- Все сразу 20.11
        (v_module4_id, 'aaaaffff-ffff-ffff-ffff-ffffffffffff', 0, 2),
        (v_module4_id, 'bbbbffff-ffff-ffff-ffff-ffffffffffff', 0, 3)
      ON CONFLICT DO NOTHING;
    END IF;
  END $$;

  -- =============================================
  -- ИТОГОВАЯ КОНФИГУРАЦИЯ:
  -- =============================================
  --
  -- ПОТОК: "Поток Ноябрь 20.11.2025"
  -- ДАТА СТАРТА: 20.11.2025 (ЗАВТРА)
  --
  -- При назначении студента на этот поток с тарифом T2:
  --   20.11.2025 - откроются:
  --     • Дыхательная практика
  --     • Сканирование тела
  --     • Императрица (женские архетипы)
  --     • Медитация на дыхании
  --   27.11.2025 (через 7 дней) - откроются:
  --     • Заземление
  --     • Визуализация
  --   04.12.2025 (через 14 дней) - откроется:
  --     • Базовая осознанность
  --   20.12.2025 (через 30 дней) - откроется:
  --     • Верховная жрица
  --   19.01.2026 (через 60 дней) - откроется:
  --     • Богиня
  -- =============================================
