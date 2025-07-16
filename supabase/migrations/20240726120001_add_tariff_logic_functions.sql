-- Этап 1: Вспомогательная функция для проверки завершения всех предыдущих уроков
CREATE OR REPLACE FUNCTION public.check_all_previous_lessons_completed(p_user_id UUID, p_current_stage_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  previous_stages_total_lessons BIGINT;
  previous_stages_completed_lessons BIGINT;
  target_course_id UUID;
  user_tariff_id UUID;
BEGIN
  -- Находим курс, к которому относится текущий этап
  SELECT course_id INTO target_course_id FROM public.course_stages WHERE id = p_current_stage_id;
  
  -- Если курс не найден, возвращаем false
  IF target_course_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Получаем активный тариф пользователя
  SELECT tariff_id INTO user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, возвращаем false
  IF user_tariff_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Считаем общее количество ДОСТУПНЫХ уроков на всех ПРЕДЫДУЩИХ этапах этого курса
  SELECT COALESCE(COUNT(l.id), 0)
  INTO previous_stages_total_lessons
  FROM public.lessons l
  JOIN public.course_stages s ON l.stage_id = s.id
  WHERE s.course_id = target_course_id
    AND s.order_num < (SELECT order_num FROM public.course_stages WHERE id = p_current_stage_id)
    -- Проверяем доступ к уроку по тарифу
    AND (
      -- Если для урока нет ограничений в tariff_lesson_access - он доступен всем
      NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id)
      OR
      -- Если есть ограничения - проверяем доступ пользователя
      EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = user_tariff_id)
    );

  -- Если на предыдущих этапах нет доступных уроков, считаем условие выполненным
  IF previous_stages_total_lessons = 0 THEN
    RETURN TRUE;
  END IF;

  -- Считаем количество ЗАВЕРШЕННЫХ доступных уроков на предыдущих этапах
  SELECT COALESCE(COUNT(lp.lesson_id), 0)
  INTO previous_stages_completed_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON lp.lesson_id = l.id
  JOIN public.course_stages s ON l.stage_id = s.id
  WHERE lp.user_id = p_user_id
    AND lp.is_completed = TRUE
    AND s.course_id = target_course_id
    AND s.order_num < (SELECT order_num FROM public.course_stages WHERE id = p_current_stage_id)
    -- Проверяем доступ к уроку по тарифу
    AND (
      -- Если для урока нет ограничений в tariff_lesson_access - он доступен всем
      NOT EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id)
      OR
      -- Если есть ограничения - проверяем доступ пользователя
      EXISTS (SELECT 1 FROM public.tariff_lesson_access tla WHERE tla.lesson_id = l.id AND tla.tariff_id = user_tariff_id)
    );

  -- СТРОГАЯ ПРОВЕРКА: ВСЕ доступные уроки должны быть завершены
  RETURN previous_stages_total_lessons = previous_stages_completed_lessons;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_all_previous_lessons_completed IS 'Проверяет, завершил ли пользователь все доступные ему уроки (просмотр и ДЗ) на этапах, предшествующих текущему. Учитывает доступ к урокам по тарифам.';

-- Этап 2: Основная функция для проверки доступа к этапу
CREATE OR REPLACE FUNCTION public.can_user_access_stage(p_user_id UUID, p_stage_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tariff_id UUID;
  user_access_expires_at TIMESTAMPTZ;
  v_limit RECORD;
BEGIN
  -- 1. Проверяем, не истек ли общий доступ пользователя
  SELECT access_till INTO user_access_expires_at FROM public.users WHERE id = p_user_id;
  IF user_access_expires_at IS NOT NULL AND user_access_expires_at < now() THEN
    RETURN FALSE;
  END IF;

  -- 2. Получаем активный тариф пользователя
  SELECT tariff_id INTO user_tariff_id
  FROM public.user_tariffs
  WHERE user_id = p_user_id AND is_active = true;

  -- Если у пользователя нет активного тарифа, доступа нет
  IF user_tariff_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Получаем лимиты для этого тарифа и этапа
  SELECT * INTO v_limit
  FROM public.tariff_limits
  WHERE tariff_id = user_tariff_id AND stage_id = p_stage_id;

  -- Если для тарифа нет никаких правил по этому этапу, доступа нет
  IF v_limit IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 4. Проверяем условный доступ (требуется прохождение всех предыдущих уроков)
  IF v_limit.requires_full_prereq THEN
    IF NOT public.check_all_previous_lessons_completed(p_user_id, p_stage_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- 5. Если все проверки пройдены, доступ есть
  -- (Логику по max_days_access будем применять в get_library_stages, т.к. она влияет на уроки, а не на сам этап)
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_access_stage IS 'Проверяет, имеет ли пользователь доступ к конкретному этапу курса с учетом его тарифа и прогресса.';

-- Этап 3: Обновляем функцию get_library_stages, чтобы она использовала новую логику
-- и также фильтровала уроки по max_days_access
DROP FUNCTION IF EXISTS public.get_library_stages(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_library_stages(p_user_id UUID, p_course_id UUID)
RETURNS TABLE(
    stage_id BIGINT,
    stage_name TEXT,
    stage_order_num INT,
    stage_description TEXT,
    is_unlocked BOOLEAN,
    total_lessons BIGINT,
    completed_lessons BIGINT,
    unlock_condition_type_val TEXT,
    unlock_condition_value_val TEXT,
    cover_image_path TEXT,
    lessons_available_by_tariff INT
)
AS $$
BEGIN
    RETURN QUERY
    WITH UserTariff AS (
        -- Получаем активный тариф пользователя
        SELECT ut.tariff_id
        FROM public.user_tariffs ut
        WHERE ut.user_id = p_user_id AND ut.is_active = true
        LIMIT 1
    ),
    StageLimits AS (
        -- Получаем лимиты по дням для каждого этапа в зависимости от тарифа
        SELECT
            tl.stage_id,
            tl.max_days_access
        FROM public.tariff_limits tl
        JOIN UserTariff ut ON tl.tariff_id = ut.tariff_id
    )
    SELECT
        s.id AS stage_id,
        s.name AS stage_name,
        s.order_num AS stage_order_num,
        s.description AS stage_description,
        -- Используем новую функцию для определения доступа к этапу
        public.can_user_access_stage(p_user_id, s.id) AS is_unlocked,
        (SELECT COUNT(*) FROM public.lessons l WHERE l.stage_id = s.id) AS total_lessons,
        (SELECT COUNT(*) FROM public.lesson_progress lp JOIN public.lessons l ON lp.lesson_id = l.id WHERE l.stage_id = s.id AND lp.user_id = p_user_id AND lp.is_completed = true) AS completed_lessons,
        s.unlock_condition_type AS unlock_condition_type_val,
        s.unlock_condition_value AS unlock_condition_value_val,
        s.cover_image_path,
        sl.max_days_access AS lessons_available_by_tariff
    FROM
        public.course_stages s
    LEFT JOIN StageLimits sl ON s.id = sl.stage_id
    WHERE
        s.course_id = p_course_id
    ORDER BY
        s.order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_library_stages IS 'Возвращает этапы курса для пользователя с учетом его тарифа, прогресса и лимитов на доступные уроки.'; 