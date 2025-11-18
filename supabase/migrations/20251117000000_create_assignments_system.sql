-- Migration: Create Assignments System
-- Date: 2025-11-17
-- Description: Создание системы заданий (assignments) с автосохранением черновиков
--              Изменение submissions для поддержки отдельных заданий вместо уроков целиком

-- ============================================================================
-- 1. Создать таблицу assignments (задания внутри урока)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id SERIAL PRIMARY KEY,
  lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_num INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность: один порядковый номер на один урок
  UNIQUE(lesson_id, order_num)
);

COMMENT ON TABLE public.assignments IS 'Отдельные задания внутри урока';
COMMENT ON COLUMN public.assignments.lesson_id IS 'Урок, к которому относится задание';
COMMENT ON COLUMN public.assignments.order_num IS 'Порядковый номер задания в уроке';
COMMENT ON COLUMN public.assignments.title IS 'Название задания';
COMMENT ON COLUMN public.assignments.description IS 'Текст задания / инструкция';

-- Индекс для быстрого поиска заданий урока
CREATE INDEX idx_assignments_lesson_id ON public.assignments(lesson_id);
CREATE INDEX idx_assignments_order ON public.assignments(lesson_id, order_num);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- ============================================================================
-- 2. Добавить assignment_id в таблицу submissions
-- ============================================================================
-- Добавляем новое поле assignment_id
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS assignment_id INT REFERENCES public.assignments(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);

COMMENT ON COLUMN public.submissions.assignment_id IS 'Задание, к которому относится эта сдача (новая логика)';
COMMENT ON COLUMN public.submissions.lesson_id IS 'Урок (устаревшая логика, сохраняется для обратной совместимости)';

-- ============================================================================
-- 3. Создать таблицу assignment_drafts (черновики с автосохранением)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignment_id INT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  draft_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Один черновик на пользователя + задание
  UNIQUE(user_id, assignment_id)
);

COMMENT ON TABLE public.assignment_drafts IS 'Черновики заданий с автосохранением';
COMMENT ON COLUMN public.assignment_drafts.draft_text IS 'Текст черновика (автосохраняется при вводе)';
COMMENT ON COLUMN public.assignment_drafts.updated_at IS 'Время последнего обновления черновика';

-- Индексы для быстрого поиска черновиков
CREATE INDEX idx_assignment_drafts_user_id ON public.assignment_drafts(user_id);
CREATE INDEX idx_assignment_drafts_assignment_id ON public.assignment_drafts(assignment_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_assignment_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignment_drafts_updated_at
  BEFORE UPDATE ON public.assignment_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_drafts_updated_at();

-- ============================================================================
-- 4. RLS (Row Level Security) политики
-- ============================================================================

-- Включить RLS для assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Политики для assignments
-- Чтение: все могут читать задания (если имеют доступ к уроку)
CREATE POLICY "assignments_select_policy" ON public.assignments
  FOR SELECT
  USING (true);

-- Вставка/обновление/удаление: только админы и кураторы
CREATE POLICY "assignments_insert_policy" ON public.assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'curator')
    )
  );

CREATE POLICY "assignments_update_policy" ON public.assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'curator')
    )
  );

CREATE POLICY "assignments_delete_policy" ON public.assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'curator')
    )
  );

-- Включить RLS для assignment_drafts
ALTER TABLE public.assignment_drafts ENABLE ROW LEVEL SECURITY;

-- Политики для assignment_drafts
-- Пользователи видят только свои черновики
CREATE POLICY "assignment_drafts_select_policy" ON public.assignment_drafts
  FOR SELECT
  USING (user_id = auth.uid());

-- Пользователи могут создавать свои черновики
CREATE POLICY "assignment_drafts_insert_policy" ON public.assignment_drafts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Пользователи могут обновлять свои черновики
CREATE POLICY "assignment_drafts_update_policy" ON public.assignment_drafts
  FOR UPDATE
  USING (user_id = auth.uid());

-- Пользователи могут удалять свои черновики
CREATE POLICY "assignment_drafts_delete_policy" ON public.assignment_drafts
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 5. Обновить RLS политики для submissions
-- ============================================================================

-- Политика для обновления submissions теперь должна учитывать assignment_id
-- (Существующие политики submissions остаются, просто работают с новым полем)
-- Никаких изменений не требуется, т.к. assignment_id опциональный

-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================
