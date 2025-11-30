-- ============================================================================
-- Миграция: Автоматическое присвоение максимального тарифа и последнего потока
-- При создании нового пользователя
-- ============================================================================

-- ============================================================================
-- 1. Функция для автоматического назначения тарифа и потока новому пользователю
-- ============================================================================
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

    -- Если нашли тариф - назначаем его пользователю
    IF v_max_tariff_id IS NOT NULL THEN
        INSERT INTO public.user_tariffs (user_id, tariff_id, is_active)
        VALUES (NEW.id, v_max_tariff_id, true)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Assigned tariff % to user %', v_max_tariff_id, NEW.id;
    END IF;

    -- Если нашли поток - записываем пользователя на него
    IF v_latest_stream_id IS NOT NULL THEN
        INSERT INTO public.user_stream_enrollments (user_id, stream_id, enrolled_at)
        VALUES (NEW.id, v_latest_stream_id, NOW())
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Enrolled user % to stream %', NEW.id, v_latest_stream_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_assign_tariff_and_stream() IS
'Автоматически назначает максимальный тариф (T4) и последний поток новому пользователю при регистрации';

-- ============================================================================
-- 2. Создаём триггер на таблицу users
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_auto_assign_tariff_and_stream ON public.users;

CREATE TRIGGER trigger_auto_assign_tariff_and_stream
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_tariff_and_stream();

COMMENT ON TRIGGER trigger_auto_assign_tariff_and_stream ON public.users IS
'Триггер для автоматического назначения тарифа и потока при создании пользователя';

-- ============================================================================
-- 3. Функция для ручного назначения тарифа и потока существующим пользователям
--    (для пользователей, которые уже существуют но не имеют тарифа/потока)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_tariff_and_stream_to_user(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_max_tariff_id UUID;
    v_latest_stream_id UUID;
    v_result JSONB;
BEGIN
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

    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'tariff_assigned', false,
        'stream_assigned', false
    );

    -- Проверяем, есть ли уже активный тариф
    IF NOT EXISTS (
        SELECT 1 FROM public.user_tariffs
        WHERE user_id = p_user_id AND is_active = true
    ) THEN
        IF v_max_tariff_id IS NOT NULL THEN
            INSERT INTO public.user_tariffs (user_id, tariff_id, is_active)
            VALUES (p_user_id, v_max_tariff_id, true);

            v_result := jsonb_set(v_result, '{tariff_assigned}', 'true');
            v_result := jsonb_set(v_result, '{tariff_id}', to_jsonb(v_max_tariff_id::text));
        END IF;
    END IF;

    -- Проверяем, записан ли пользователь на поток
    IF NOT EXISTS (
        SELECT 1 FROM public.user_stream_enrollments
        WHERE user_id = p_user_id
    ) THEN
        IF v_latest_stream_id IS NOT NULL THEN
            INSERT INTO public.user_stream_enrollments (user_id, stream_id, enrolled_at)
            VALUES (p_user_id, v_latest_stream_id, NOW());

            v_result := jsonb_set(v_result, '{stream_assigned}', 'true');
            v_result := jsonb_set(v_result, '{stream_id}', to_jsonb(v_latest_stream_id::text));
        END IF;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.assign_tariff_and_stream_to_user(UUID) IS
'Назначает максимальный тариф и последний поток пользователю, если они ещё не назначены';

-- ============================================================================
-- 4. Назначаем тариф и поток всем существующим пользователям без тарифа/потока
-- ============================================================================
DO $$
DECLARE
    v_user RECORD;
    v_result JSONB;
    v_count INT := 0;
BEGIN
    FOR v_user IN
        SELECT u.id
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
        RAISE NOTICE 'Processed user %: %', v_user.id, v_result;
    END LOOP;

    RAISE NOTICE 'Total users processed: %', v_count;
END;
$$;
