-- Migration: Create Assignment Progress Functions
-- Date: 2025-11-17
-- Description: Функции для работы с прогрессом по заданиям и автоматическое открытие модулей

-- ============================================================================
-- 1. Функция: получить прогресс по заданиям урока
-- ============================================================================
-- Возвращает:
-- - total_assignments: всего заданий в уроке
-- - submitted_assignments: сколько заданий сдано (status IN ('pending_review', 'approved', 'rejected'))
-- - approved_assignments: сколько заданий принято (status = 'approved')
CREATE OR REPLACE FUNCTION get_lesson_assignment_progress(
  p_user_id UUID,
  p_lesson_id INT
)
RETURNS TABLE (
  total_assignments INT,
  submitted_assignments INT,
  approved_assignments INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(a.id)::INT AS total_assignments,
    COUNT(s.id) FILTER (
      WHERE s.status IN ('pending_review', 'approved', 'rejected')
    )::INT AS submitted_assignments,
    COUNT(s.id) FILTER (
      WHERE s.status = 'approved'
    )::INT AS approved_assignments
  FROM public.assignments a
  LEFT JOIN public.submissions s
    ON s.assignment_id = a.id
    AND s.user_id = p_user_id
  WHERE a.lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_lesson_assignment_progress IS 'Возвращает прогресс пользователя по заданиям урока';

-- ============================================================================
-- 2. Функция: проверить сдал ли пользователь все ДЗ из модулей "Исцеление" и "Психолог"
-- ============================================================================
CREATE OR REPLACE FUNCTION has_user_completed_healing_and_psychologist(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_assignments INT;
  v_approved_assignments INT;
BEGIN
  -- Получить все задания из модулей "Исцеление" и "Психолог"
  -- Эти модули находятся в course_stages с name IN ('Исцеление', 'Психолог')
  SELECT
    COUNT(a.id),
    COUNT(s.id) FILTER (WHERE s.status = 'approved')
  INTO v_total_assignments, v_approved_assignments
  FROM public.assignments a
  JOIN public.lessons l ON l.id = a.lesson_id
  JOIN public.course_stages cs ON cs.id = l.stage_id
  LEFT JOIN public.submissions s
    ON s.assignment_id = a.id
    AND s.user_id = p_user_id
  WHERE cs.name IN ('Исцеление', 'Психолог');

  -- Если нет заданий - возвращаем false
  IF v_total_assignments = 0 THEN
    RETURN FALSE;
  END IF;

  -- Проверяем что все задания приняты
  RETURN v_approved_assignments = v_total_assignments;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION has_user_completed_healing_and_psychologist IS 'Проверяет сдал ли пользователь все ДЗ из модулей "Исцеление" и "Психолог"';

-- ============================================================================
-- 3. Функция: открыть доступ к модулю для пользователя
-- ============================================================================
-- Создает или обновляет запись в user_stage_progress
CREATE OR REPLACE FUNCTION unlock_stage_for_user(
  p_user_id UUID,
  p_stage_name TEXT
)
RETURNS VOID AS $$
DECLARE
  v_stage_id INT;
BEGIN
  -- Найти ID модуля по имени
  SELECT id INTO v_stage_id
  FROM public.course_stages
  WHERE name = p_stage_name;

  -- Если модуль не найден - ничего не делаем
  IF v_stage_id IS NULL THEN
    RAISE NOTICE 'Stage % not found', p_stage_name;
    RETURN;
  END IF;

  -- Создать или обновить запись в user_stage_progress
  INSERT INTO public.user_stage_progress (user_id, stage_id, status, started_at)
  VALUES (p_user_id, v_stage_id, 'not_started', NOW())
  ON CONFLICT (user_id, stage_id) DO NOTHING; -- Если уже есть - не трогаем

  RAISE NOTICE 'Unlocked stage % for user %', p_stage_name, p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION unlock_stage_for_user IS 'Открывает доступ к модулю для пользователя';

-- ============================================================================
-- 4. Триггерная функция: проверить и открыть продвинутые модули
-- ============================================================================
-- Вызывается после одобрения задания (status = 'approved')
-- Проверяет, сдал ли пользователь все ДЗ из "Исцеления" и "Психолога"
-- Если да - открывает модули "Доктор наук" и "Спецслужбы"
CREATE OR REPLACE FUNCTION check_and_unlock_advanced_modules()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем только если задание было одобрено
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    -- Проверяем, сдал ли пользователь все ДЗ
    IF has_user_completed_healing_and_psychologist(NEW.user_id) THEN
      -- Открываем модули "Доктор наук" и "Спецслужбы"
      PERFORM unlock_stage_for_user(NEW.user_id, 'Доктор наук');
      PERFORM unlock_stage_for_user(NEW.user_id, 'Спецслужбы');

      RAISE NOTICE 'User % completed all assignments from Healing and Psychologist. Unlocked advanced modules.', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_unlock_advanced_modules IS 'Автоматически открывает продвинутые модули после завершения базовых';

-- ============================================================================
-- 5. Создать триггер на таблице submissions
-- ============================================================================
-- Триггер срабатывает AFTER UPDATE на submissions
-- Когда задание переходит в статус 'approved', проверяется возможность открытия новых модулей
DROP TRIGGER IF EXISTS trigger_unlock_advanced_modules ON public.submissions;

CREATE TRIGGER trigger_unlock_advanced_modules
  AFTER UPDATE OF status ON public.submissions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION check_and_unlock_advanced_modules();

COMMENT ON TRIGGER trigger_unlock_advanced_modules ON public.submissions IS 'Автоматически открывает продвинутые модули при выполнении условий';

-- ============================================================================
-- 6. Функция: получить обратную связь по уроку (от куратора по дню в целом)
-- ============================================================================
-- Куратор дает обратную связь по всему дню, а не по отдельным заданиям
-- Храним обратную связь в отдельной таблице lesson_feedback
CREATE TABLE IF NOT EXISTS public.lesson_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  curator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Одна обратная связь на пользователя + урок
  UNIQUE(user_id, lesson_id)
);

COMMENT ON TABLE public.lesson_feedback IS 'Обратная связь куратора по уроку в целом (не по отдельным заданиям)';

CREATE INDEX idx_lesson_feedback_user_id ON public.lesson_feedback(user_id);
CREATE INDEX idx_lesson_feedback_lesson_id ON public.lesson_feedback(lesson_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_lesson_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lesson_feedback_updated_at
  BEFORE UPDATE ON public.lesson_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_feedback_updated_at();

-- RLS для lesson_feedback
ALTER TABLE public.lesson_feedback ENABLE ROW LEVEL SECURITY;

-- Пользователи видят свою обратную связь
CREATE POLICY "lesson_feedback_select_policy" ON public.lesson_feedback
  FOR SELECT
  USING (user_id = auth.uid());

-- Только кураторы и админы могут создавать/обновлять обратную связь
CREATE POLICY "lesson_feedback_insert_policy" ON public.lesson_feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'curator')
    )
  );

CREATE POLICY "lesson_feedback_update_policy" ON public.lesson_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'curator')
    )
  );

CREATE POLICY "lesson_feedback_delete_policy" ON public.lesson_feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'curator')
    )
  );

-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================
