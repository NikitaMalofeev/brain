-- УПРОЩЕННАЯ функция can_user_access_stage
-- Дата: 13.06.2025
-- Просто проверяет флаг is_unlocked + тарифы + зачисление

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
    user_has_tariff_access BOOLEAN := false;
    user_has_any_active_tariff BOOLEAN := false;
BEGIN
    -- Получаем информацию об этапе
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
    
    -- Проверяем есть ли у пользователя хотя бы один активный тариф
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_tariffs ut
        WHERE ut.user_id = p_user_id 
        AND ut.is_active = true
    ) INTO user_has_any_active_tariff;
    
    -- Если у пользователя нет активного тарифа, возвращаем false
    IF NOT user_has_any_active_tariff THEN
        RETURN false;
    END IF;
    
    -- Проверяем есть ли у пользователя тариф с доступом к этому этапу
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_tariffs ut
        JOIN public.tariff_limits tl ON ut.tariff_id = tl.tariff_id
        WHERE ut.user_id = p_user_id 
        AND ut.is_active = true
        AND tl.stage_id = p_stage_id
    ) INTO user_has_tariff_access;
    
    -- ВАЖНО: Если для этапа нет записей в tariff_limits, 
    -- значит он доступен всем тарифам (например, первая ступень)
    IF NOT user_has_tariff_access THEN
        -- Проверяем есть ли ВООБЩЕ записи в tariff_limits для этого этапа
        IF NOT EXISTS (
            SELECT 1 
            FROM public.tariff_limits tl 
            WHERE tl.stage_id = p_stage_id
        ) THEN
            -- Если записей нет, этап доступен всем с активным тарифом
            user_has_tariff_access := true;
        ELSE
            -- Если записи есть, но у пользователя нет доступа - запрещаем
            RETURN false;
        END IF;
    END IF;
    
    -- Получаем дату зачисления пользователя на курс
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
    
    -- Все проверки пройдены - разрешаем доступ
    RETURN true;
END;
$$;

-- Обновляем комментарий к функции
COMMENT ON FUNCTION public.can_user_access_stage(UUID, BIGINT) IS 
'Проверяет имеет ли пользователь доступ к этапу курса. 
Логика: этап разблокирован (is_unlocked=true) + у пользователя есть активный тариф с доступом + зачислен на курс. 
Если для этапа нет записей в tariff_limits, он доступен всем активным тарифам.'; 