-- Миграция: Обновление функции can_user_access_stage для предоставления полного доступа админам и кураторам
-- Дата: 27.06.2025
-- Описание: Добавляет проверку роли пользователя в начало функции. Если роль 'admin' или 'curator', доступ разрешается немедленно.
-- ВАЖНО: Сохраняет всю существующую логику для обычных пользователей

CREATE OR REPLACE FUNCTION public.can_user_access_stage(
    p_user_id UUID,
    p_stage_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stage_record RECORD;
    user_enrollment_date TIMESTAMP WITH TIME ZONE;
    requesting_user_role TEXT;
    user_tariff_id UUID;
    user_access_expires_at TIMESTAMPTZ;
    v_limit RECORD;
BEGIN
    -- Шаг 1: Проверка роли пользователя
    SELECT role INTO requesting_user_role
    FROM public.users
    WHERE id = p_user_id;

    -- Если пользователь админ или куратор, предоставляем доступ немедленно
    IF requesting_user_role IN ('admin', 'curator') THEN
        RETURN true;
    END IF;

    -- Шаг 2: Проверяем, не истек ли общий доступ пользователя (ВОССТАНОВЛЕНО)
    SELECT access_till INTO user_access_expires_at 
    FROM public.users 
    WHERE id = p_user_id;
    
    IF user_access_expires_at IS NOT NULL AND user_access_expires_at < NOW() THEN
        RETURN false;
    END IF;

    -- Шаг 3: Получаем информацию об этапе
    SELECT 
        is_unlocked,
        course_id
    INTO stage_record
    FROM public.course_stages
    WHERE id = p_stage_id;
    
    -- Если этап не найден, возвращаем false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Если этап заблокирован (is_unlocked = false), возвращаем false
    IF NOT stage_record.is_unlocked THEN
        RETURN false;
    END IF;
    
    -- Шаг 4: Получаем активный тариф пользователя (ВОССТАНОВЛЕНО - оригинальная логика)
    SELECT tariff_id INTO user_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Если у пользователя нет активного тарифа, доступа нет
    IF user_tariff_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Шаг 5: Проверяем зачисление на курс
    SELECT uce.enrollment_date
    INTO user_enrollment_date
    FROM public.user_course_enrollments uce
    WHERE uce.user_id = p_user_id 
    AND uce.course_id = stage_record.course_id
    AND uce.is_active = true;
    
    -- Если пользователь не зачислен на курс, возвращаем false
    IF user_enrollment_date IS NULL THEN
        RETURN false;
    END IF;
    
    -- Шаг 6: Получаем лимиты для этого тарифа и этапа
    SELECT * INTO v_limit
    FROM public.tariff_limits
    WHERE tariff_id = user_tariff_id AND stage_id = p_stage_id;
    
    -- ВАЖНО: Если для этапа нет записей в tariff_limits, 
    -- значит он доступен всем тарифам (например, первая ступень)
    IF v_limit IS NULL THEN
        -- Нет ограничений = полный доступ
        RETURN true;
    END IF;
    
    -- Шаг 7: Проверяем условный доступ (ВОССТАНОВЛЕНО)
    IF v_limit.requires_full_prereq THEN
        IF NOT public.check_all_previous_lessons_completed(p_user_id, p_stage_id) THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Все проверки пройдены - разрешаем доступ
    RETURN true;
END;
$$;

-- Обновляем комментарий к функции
COMMENT ON FUNCTION public.can_user_access_stage(UUID, BIGINT) IS 
'Проверяет имеет ли пользователь доступ к этапу курса. 
Админы и кураторы всегда имеют доступ. 
Для остальных: общий доступ не истек + этап разблокирован + у пользователя есть активный тариф + есть лимиты для этого тарифа + выполнены условия предварительного прохождения + зачислен на курс.'; 