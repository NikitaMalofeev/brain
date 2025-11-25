-- ============================================
-- Функция для получения деталей модуля потока
-- с уроками и прогрессом пользователя
-- ============================================

CREATE OR REPLACE FUNCTION public.get_stream_module_details(
  p_user_id UUID,
  p_module_id UUID
)
RETURNS TABLE (
  module_id UUID,
  module_name TEXT,
  module_description TEXT,
  module_color TEXT,
  module_order_num INT,
  stream_id UUID,
  stream_name TEXT,
  duration_days INT,
  -- Lesson data as JSONB array
  lessons JSONB
) AS $$
DECLARE
  v_stream_id UUID;
  v_stream_start_date DATE;
BEGIN
  -- Получаем stream_id модуля
  SELECT sm.stream_id INTO v_stream_id
  FROM public.stream_modules sm
  WHERE sm.id = p_module_id;

  IF v_stream_id IS NULL THEN
    RETURN;
  END IF;

  -- Получаем дату начала потока
  SELECT s.start_date INTO v_stream_start_date
  FROM public.streams s
  WHERE s.id = v_stream_id;

  RETURN QUERY
  SELECT
    sm.id as module_id,
    sm.name as module_name,
    COALESCE(sm.description, '') as module_description,
    sm.color as module_color,
    sm.order_num as module_order_num,
    sm.stream_id,
    s.name as stream_name,
    COALESCE(sm.duration_days, 21) as duration_days,
    -- Собираем уроки как JSONB массив
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'lesson_id', l.id,
            'lesson_title', l.title,
            'lesson_description', l.description,
            'lesson_type', l.type,
            'order_num', l.order_num,
            'points', l.points,
            'has_assignment', l.has_assignment,
            'open_at', ce.open_at,
            'is_unlocked', (ce.open_at IS NULL OR ce.open_at <= NOW()),
            'is_completed', COALESCE(lp.is_completed, false),
            'completed_at', lp.completed_at,
            'submission_status', sub.status
          ) ORDER BY l.order_num
        )
        FROM public.calendar_events ce
        JOIN public.lessons l ON l.id = ce.lesson_id
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id
          AND lp.user_id = p_user_id
          AND (lp.stream_id = v_stream_id OR lp.stream_id IS NULL)
        LEFT JOIN public.submissions sub ON sub.lesson_id = l.id
          AND sub.user_id = p_user_id
          AND (sub.stream_id = v_stream_id OR sub.stream_id IS NULL)
        WHERE ce.stream_id = v_stream_id
          AND ce.module_id = p_module_id
          AND ce.event_type = 'lesson_unlock'
          AND ce.lesson_id IS NOT NULL
      ),
      '[]'::jsonb
    ) as lessons
  FROM public.stream_modules sm
  JOIN public.streams s ON s.id = sm.stream_id
  WHERE sm.id = p_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_stream_module_details IS 'Получить детали модуля потока с уроками и прогрессом пользователя';

-- Информация
DO $$
BEGIN
  RAISE NOTICE 'Создана функция get_stream_module_details';
END $$;
