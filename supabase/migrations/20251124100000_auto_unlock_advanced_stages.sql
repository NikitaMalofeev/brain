-- Миграция: Автоматическая разблокировка продвинутых модулей
-- Когда ученик сдал все ДЗ из "Исцеление" и "Психолог", открываются "Доктор наук" и "Спецслужбы"

-- Таблица для хранения разблокированных модулей пользователя
CREATE TABLE IF NOT EXISTS public.user_stage_unlocks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stage_id BIGINT NOT NULL REFERENCES public.course_stages(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    unlocked_by VARCHAR(50) DEFAULT 'auto', -- 'auto' или 'manual'
    UNIQUE(user_id, stage_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_stage_unlocks_user_id ON public.user_stage_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stage_unlocks_stage_id ON public.user_stage_unlocks(stage_id);

-- Комментарии
COMMENT ON TABLE public.user_stage_unlocks IS 'Хранит информацию о разблокированных модулях для каждого пользователя';
COMMENT ON COLUMN public.user_stage_unlocks.unlocked_by IS 'auto - автоматически по условию, manual - вручную админом';

-- Функция для проверки и разблокировки продвинутых модулей
CREATE OR REPLACE FUNCTION public.check_and_unlock_advanced_stages(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_tariff_id UUID;
    v_healing_stage_id BIGINT;
    v_psychologist_stage_id BIGINT;
    v_doctor_stage_id BIGINT;
    v_special_stage_id BIGINT;
    v_healing_total INT;
    v_healing_approved INT;
    v_psychologist_total INT;
    v_psychologist_approved INT;
    v_all_completed BOOLEAN;
BEGIN
    -- Получаем активный тариф пользователя
    SELECT tariff_id INTO v_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true;

    IF v_tariff_id IS NULL THEN
        RETURN; -- Нет активного тарифа
    END IF;

    -- Находим ID модулей по названиям (регистронезависимый поиск)
    SELECT id INTO v_healing_stage_id FROM public.course_stages WHERE LOWER(name) LIKE '%исцелени%' LIMIT 1;
    SELECT id INTO v_psychologist_stage_id FROM public.course_stages WHERE LOWER(name) LIKE '%психолог%' LIMIT 1;
    SELECT id INTO v_doctor_stage_id FROM public.course_stages WHERE LOWER(name) LIKE '%доктор%' OR LOWER(name) LIKE '%наук%' LIMIT 1;
    SELECT id INTO v_special_stage_id FROM public.course_stages WHERE LOWER(name) LIKE '%спецслужб%' LIMIT 1;

    -- Если модули не найдены, выходим
    IF v_healing_stage_id IS NULL OR v_psychologist_stage_id IS NULL THEN
        RETURN;
    END IF;

    IF v_doctor_stage_id IS NULL AND v_special_stage_id IS NULL THEN
        RETURN;
    END IF;

    -- Считаем задания в модуле "Исцеление" (только доступные по тарифу)
    SELECT
        COUNT(DISTINCT a.id),
        COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN a.id END)
    INTO v_healing_total, v_healing_approved
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    WHERE l.stage_id = v_healing_stage_id
    AND (
        NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access WHERE lesson_id = l.id)
        OR EXISTS (SELECT 1 FROM public.tariff_lesson_access WHERE lesson_id = l.id AND tariff_id = v_tariff_id)
    )
    AND EXISTS (
        SELECT 1 FROM public.submissions s2
        WHERE s2.assignment_id = a.id AND s2.user_id = p_user_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.submissions s3
        WHERE s3.assignment_id = a.id AND s3.user_id = p_user_id
    );

    -- Пересчитываем правильно
    SELECT COUNT(DISTINCT a.id)
    INTO v_healing_total
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    WHERE l.stage_id = v_healing_stage_id
    AND (
        NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id)
        OR EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = v_tariff_id)
    );

    SELECT COUNT(DISTINCT a.id)
    INTO v_healing_approved
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.submissions s ON s.assignment_id = a.id AND s.user_id = p_user_id AND s.status = 'approved'
    WHERE l.stage_id = v_healing_stage_id
    AND (
        NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id)
        OR EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = v_tariff_id)
    );

    -- Считаем задания в модуле "Психолог" (только доступные по тарифу)
    SELECT COUNT(DISTINCT a.id)
    INTO v_psychologist_total
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    WHERE l.stage_id = v_psychologist_stage_id
    AND (
        NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id)
        OR EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = v_tariff_id)
    );

    SELECT COUNT(DISTINCT a.id)
    INTO v_psychologist_approved
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.submissions s ON s.assignment_id = a.id AND s.user_id = p_user_id AND s.status = 'approved'
    WHERE l.stage_id = v_psychologist_stage_id
    AND (
        NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id)
        OR EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = v_tariff_id)
    );

    -- Проверяем, все ли задания выполнены
    v_all_completed := (v_healing_total > 0 AND v_healing_approved = v_healing_total)
                   AND (v_psychologist_total > 0 AND v_psychologist_approved = v_psychologist_total);

    -- Если все выполнено - разблокируем продвинутые модули
    IF v_all_completed THEN
        -- Разблокируем "Доктор наук"
        IF v_doctor_stage_id IS NOT NULL THEN
            INSERT INTO public.user_stage_unlocks (user_id, stage_id, unlocked_by)
            VALUES (p_user_id, v_doctor_stage_id, 'auto')
            ON CONFLICT (user_id, stage_id) DO NOTHING;
        END IF;

        -- Разблокируем "Спецслужбы"
        IF v_special_stage_id IS NOT NULL THEN
            INSERT INTO public.user_stage_unlocks (user_id, stage_id, unlocked_by)
            VALUES (p_user_id, v_special_stage_id, 'auto')
            ON CONFLICT (user_id, stage_id) DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_and_unlock_advanced_stages IS 'Проверяет выполнение условий и разблокирует продвинутые модули';

-- Триггерная функция, вызываемая при изменении submissions
CREATE OR REPLACE FUNCTION public.trigger_check_stage_unlock()
RETURNS TRIGGER AS $$
BEGIN
    -- Вызываем проверку только при approval
    IF NEW.status = 'approved' THEN
        PERFORM public.check_and_unlock_advanced_stages(NEW.user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на таблицу submissions
DROP TRIGGER IF EXISTS trg_check_stage_unlock ON public.submissions;
CREATE TRIGGER trg_check_stage_unlock
    AFTER UPDATE OF status ON public.submissions
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION public.trigger_check_stage_unlock();

COMMENT ON TRIGGER trg_check_stage_unlock ON public.submissions IS 'Проверяет условия разблокировки модулей при принятии задания';

-- Удаляем старую функцию перед созданием новой с изменённым типом возврата
DROP FUNCTION IF EXISTS public.get_library_stages_optimized(UUID, UUID);

-- Обновляем функцию get_library_stages_optimized чтобы учитывать user_stage_unlocks
CREATE OR REPLACE FUNCTION public.get_library_stages_optimized(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
    stage_id BIGINT,
    stage_name TEXT,
    stage_order_num INT,
    stage_description TEXT,
    is_unlocked BOOLEAN,
    total_lessons BIGINT,
    completed_lessons BIGINT,
    overdue_lessons BIGINT,
    unlocked_lessons BIGINT,
    unlock_condition_type_val TEXT,
    unlock_condition_value_val TEXT,
    cover_image_path TEXT
) AS $$
DECLARE
    user_tariff_id UUID;
    user_access_expires_at TIMESTAMPTZ;
BEGIN
    -- Проверяем общий доступ пользователя
    SELECT access_till INTO user_access_expires_at FROM public.users WHERE id = p_user_id;
    IF user_access_expires_at IS NOT NULL AND user_access_expires_at < now() THEN
        -- Доступ истек - все модули заблокированы
        RETURN QUERY
        SELECT
            cs.id AS stage_id,
            cs.name AS stage_name,
            cs.order_num AS stage_order_num,
            cs.description AS stage_description,
            FALSE AS is_unlocked,
            0::BIGINT AS total_lessons,
            0::BIGINT AS completed_lessons,
            0::BIGINT AS overdue_lessons,
            0::BIGINT AS unlocked_lessons,
            cs.unlock_condition_type::TEXT AS unlock_condition_type_val,
            cs.unlock_condition_value AS unlock_condition_value_val,
            cs.cover_image_path
        FROM public.course_stages cs
        WHERE cs.course_id = p_course_id
        ORDER BY cs.order_num;
        RETURN;
    END IF;

    -- Получаем активный тариф
    SELECT tariff_id INTO user_tariff_id
    FROM public.user_tariffs
    WHERE user_id = p_user_id AND is_active = true;

    RETURN QUERY
    WITH stage_lessons AS (
        SELECT
            l.stage_id,
            l.id AS lesson_id,
            CASE
                WHEN NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id) THEN TRUE
                ELSE EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = user_tariff_id)
            END AS is_accessible
        FROM public.lessons l
        JOIN public.course_stages cs ON cs.id = l.stage_id
        WHERE cs.course_id = p_course_id
    ),
    stage_stats AS (
        SELECT
            sl.stage_id,
            COUNT(*) FILTER (WHERE sl.is_accessible) AS total_lessons,
            COUNT(*) FILTER (WHERE sl.is_accessible AND lp.is_completed = true) AS completed_lessons,
            COUNT(*) FILTER (WHERE sl.is_accessible AND l.deadline_at < now() AND (lp.is_completed IS NULL OR lp.is_completed = false)) AS overdue_lessons,
            COUNT(*) FILTER (WHERE sl.is_accessible AND (l.open_at IS NULL OR l.open_at <= now())) AS unlocked_lessons
        FROM stage_lessons sl
        JOIN public.lessons l ON l.id = sl.lesson_id
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = sl.lesson_id AND lp.user_id = p_user_id
        GROUP BY sl.stage_id
    )
    SELECT
        cs.id AS stage_id,
        cs.name AS stage_name,
        cs.order_num AS stage_order_num,
        cs.description AS stage_description,
        -- Модуль разблокирован если:
        -- 1. У него нет ограничений по тарифам ИЛИ
        -- 2. Есть доступ по тарифу ИЛИ
        -- 3. Есть запись в user_stage_unlocks
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM public.tariff_stage_access tsa WHERE tsa.stage_id = cs.id) THEN TRUE
            WHEN EXISTS (SELECT 1 FROM public.tariff_stage_access tsa WHERE tsa.stage_id = cs.id AND tsa.tariff_id = user_tariff_id) THEN TRUE
            WHEN EXISTS (SELECT 1 FROM public.user_stage_unlocks usu WHERE usu.user_id = p_user_id AND usu.stage_id = cs.id) THEN TRUE
            ELSE FALSE
        END AS is_unlocked,
        COALESCE(ss.total_lessons, 0) AS total_lessons,
        COALESCE(ss.completed_lessons, 0) AS completed_lessons,
        COALESCE(ss.overdue_lessons, 0) AS overdue_lessons,
        COALESCE(ss.unlocked_lessons, 0) AS unlocked_lessons,
        cs.unlock_condition_type::TEXT AS unlock_condition_type_val,
        cs.unlock_condition_value AS unlock_condition_value_val,
        cs.cover_image_path
    FROM public.course_stages cs
    LEFT JOIN stage_stats ss ON ss.stage_id = cs.id
    WHERE cs.course_id = p_course_id
    ORDER BY cs.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_library_stages_optimized IS 'Возвращает список модулей с учетом автоматической разблокировки';

-- RLS политики для user_stage_unlocks
ALTER TABLE public.user_stage_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stage unlocks" ON public.user_stage_unlocks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert stage unlocks" ON public.user_stage_unlocks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage stage unlocks" ON public.user_stage_unlocks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'curator'))
    );
