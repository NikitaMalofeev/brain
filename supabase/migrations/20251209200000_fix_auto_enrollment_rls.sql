-- ============================================================================
-- Миграция: Исправление RLS для автоматической записи новых пользователей
-- ============================================================================

-- 1. Добавляем политику для service role INSERT в user_stream_enrollments
-- (для случаев когда RPC функция вызывается от анонимного пользователя)

-- Сначала удаляем старую политику если есть
DROP POLICY IF EXISTS "Service can insert enrollments" ON public.user_stream_enrollments;

-- Создаём политику которая позволяет INSERT для service role или через триггер
CREATE POLICY "Service can insert enrollments"
  ON public.user_stream_enrollments
  FOR INSERT
  WITH CHECK (
    -- Разрешаем INSERT если это триггер (current_user = функция)
    -- или если пользователь записывает сам себя
    user_id = auth.uid()
    OR
    -- Или разрешаем для любых вставок через service role/trigger
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Fallback: разрешаем если нет JWT (вызов из триггера)
    current_setting('request.jwt.claims', true) IS NULL
  );

-- 2. Проверяем и пересоздаём триггер для user_tariffs
-- (на случай если он не был создан)

-- Убеждаемся что user_tariffs НЕ имеет RLS (должен быть отключен)
ALTER TABLE public.user_tariffs DISABLE ROW LEVEL SECURITY;

-- 3. Проверяем существование функции и пересоздаём если нужно
CREATE OR REPLACE FUNCTION public.auto_assign_tariff_and_stream()
RETURNS TRIGGER AS $$
DECLARE
    v_max_tariff_id UUID;
    v_latest_stream_id UUID;
BEGIN
    -- Получаем максимальный тариф (T4 = 10млн+)
    SELECT id INTO v_max_tariff_id
    FROM public.tariffs
    WHERE code = 'T4'
    LIMIT 1;

    -- Если T4 не найден, берём тариф с максимальным кодом
    IF v_max_tariff_id IS NULL THEN
        SELECT id INTO v_max_tariff_id
        FROM public.tariffs
        ORDER BY code DESC
        LIMIT 1;
    END IF;

    -- Получаем последний поток (по дате начала)
    SELECT id INTO v_latest_stream_id
    FROM public.streams
    ORDER BY start_date DESC
    LIMIT 1;

    -- Логируем для отладки
    RAISE NOTICE 'Auto-assigning for user %: tariff=%, stream=%', NEW.id, v_max_tariff_id, v_latest_stream_id;

    -- Если нашли тариф - назначаем его пользователю
    IF v_max_tariff_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_tariffs (user_id, tariff_id, is_active)
            VALUES (NEW.id, v_max_tariff_id, true);
            RAISE NOTICE 'Assigned tariff % to user %', v_max_tariff_id, NEW.id;
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'User % already has active tariff, skipping', NEW.id;
        END;
    ELSE
        RAISE WARNING 'No tariff found to assign to user %', NEW.id;
    END IF;

    -- Если нашли поток - записываем пользователя на него
    IF v_latest_stream_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_stream_enrollments (user_id, stream_id, enrolled_at)
            VALUES (NEW.id, v_latest_stream_id, NOW());
            RAISE NOTICE 'Enrolled user % to stream %', NEW.id, v_latest_stream_id;
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'User % already enrolled to a stream, skipping', NEW.id;
        END;
    ELSE
        RAISE WARNING 'No stream found to enroll user %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Убеждаемся что триггер создан
DROP TRIGGER IF EXISTS trigger_auto_assign_tariff_and_stream ON public.users;

CREATE TRIGGER trigger_auto_assign_tariff_and_stream
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_tariff_and_stream();

-- 5. Обновляем RPC функцию чтобы она точно работала
CREATE OR REPLACE FUNCTION public.assign_tariff_and_stream_to_user(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_max_tariff_id UUID;
    v_latest_stream_id UUID;
    v_result JSONB;
    v_has_tariff BOOLEAN;
    v_has_stream BOOLEAN;
BEGIN
    -- Инициализируем результат
    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'tariff_assigned', false,
        'stream_assigned', false,
        'error', NULL
    );

    -- Проверяем существует ли пользователь
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        v_result := jsonb_set(v_result, '{error}', '"User not found"');
        RETURN v_result;
    END IF;

    -- Получаем максимальный тариф (T4)
    SELECT id INTO v_max_tariff_id
    FROM public.tariffs
    WHERE code = 'T4'
    LIMIT 1;

    IF v_max_tariff_id IS NULL THEN
        SELECT id INTO v_max_tariff_id
        FROM public.tariffs
        ORDER BY code DESC
        LIMIT 1;
    END IF;

    -- Получаем последний поток
    SELECT id INTO v_latest_stream_id
    FROM public.streams
    ORDER BY start_date DESC
    LIMIT 1;

    -- Проверяем, есть ли уже активный тариф
    SELECT EXISTS (
        SELECT 1 FROM public.user_tariffs
        WHERE user_id = p_user_id AND is_active = true
    ) INTO v_has_tariff;

    IF NOT v_has_tariff AND v_max_tariff_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_tariffs (user_id, tariff_id, is_active)
            VALUES (p_user_id, v_max_tariff_id, true);

            v_result := jsonb_set(v_result, '{tariff_assigned}', 'true');
            v_result := jsonb_set(v_result, '{tariff_id}', to_jsonb(v_max_tariff_id::text));
        EXCEPTION WHEN unique_violation THEN
            -- Уже есть тариф, это OK
            NULL;
        END;
    END IF;

    -- Проверяем, записан ли пользователь на поток
    SELECT EXISTS (
        SELECT 1 FROM public.user_stream_enrollments
        WHERE user_id = p_user_id
    ) INTO v_has_stream;

    IF NOT v_has_stream AND v_latest_stream_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_stream_enrollments (user_id, stream_id, enrolled_at)
            VALUES (p_user_id, v_latest_stream_id, NOW());

            v_result := jsonb_set(v_result, '{stream_assigned}', 'true');
            v_result := jsonb_set(v_result, '{stream_id}', to_jsonb(v_latest_stream_id::text));
        EXCEPTION WHEN unique_violation THEN
            -- Уже записан на поток, это OK
            NULL;
        END;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Проходим по всем пользователям без тарифа/потока и назначаем им
DO $$
DECLARE
    v_user RECORD;
    v_result JSONB;
    v_count INT := 0;
BEGIN
    FOR v_user IN
        SELECT u.id, u.telegram_id
        FROM public.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_tariffs ut
            WHERE ut.user_id = u.id AND ut.is_active = true
        )
        OR NOT EXISTS (
            SELECT 1 FROM public.user_stream_enrollments use
            WHERE use.user_id = u.id
        )
    LOOP
        v_result := public.assign_tariff_and_stream_to_user(v_user.id);
        v_count := v_count + 1;
        RAISE NOTICE 'Processed user % (telegram_id: %): %', v_user.id, v_user.telegram_id, v_result;
    END LOOP;

    RAISE NOTICE 'Total users processed: %', v_count;
END;
$$;

-- 7. Вывод информации
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Миграция для исправления auto-enrollment завершена';
  RAISE NOTICE '- RLS политика для INSERT в user_stream_enrollments добавлена';
  RAISE NOTICE '- Триггер auto_assign_tariff_and_stream пересоздан';
  RAISE NOTICE '- RPC функция assign_tariff_and_stream_to_user обновлена';
  RAISE NOTICE '- Все существующие пользователи без тарифа/потока обработаны';
  RAISE NOTICE '============================================';
END $$;
