import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import {
  Assignment,
  AssignmentDraft,
  Submission,
  LessonAssignmentProgress,
  LessonFeedback,
  AssignmentWithProgress,
} from '../types';

/**
 * Хук для получения заданий урока
 */
export function useAssignments(lessonId: number | null | undefined) {
  return useQuery({
    queryKey: ['assignments', lessonId],
    queryFn: async (): Promise<Assignment[]> => {
      if (!lessonId || !supabase) {
        return [];
      }

      logger.debug('Fetching assignments for lesson', { lessonId });

      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching assignments', { lessonId, error });
        throw error;
      }

      logger.debug('Assignments fetched', { lessonId, count: data?.length });
      return data || [];
    },
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для получения прогресса по заданиям урока
 */
export function useAssignmentProgress(
  userId: string | null | undefined,
  lessonId: number | null | undefined
) {
  return useQuery({
    queryKey: ['assignment-progress', userId, lessonId],
    queryFn: async (): Promise<LessonAssignmentProgress> => {
      if (!userId || !lessonId || !supabase) {
        return {
          total_assignments: 0,
          submitted_assignments: 0,
          approved_assignments: 0,
        };
      }

      logger.debug('Fetching assignment progress', { userId, lessonId });

      const { data, error } = await supabase.rpc('get_lesson_assignment_progress', {
        p_user_id: userId,
        p_lesson_id: lessonId,
      });

      if (error) {
        logger.error('Error fetching assignment progress', { userId, lessonId, error });
        throw error;
      }

      logger.debug('Assignment progress fetched', { userId, lessonId, data });
      return data?.[0] || {
        total_assignments: 0,
        submitted_assignments: 0,
        approved_assignments: 0,
      };
    },
    enabled: !!userId && !!lessonId,
    staleTime: 30 * 1000, // 30 секунд
  });
}

/**
 * Хук для получения заданий с прогрессом (submissions + drafts)
 */
export function useAssignmentsWithProgress(
  userId: string | null | undefined,
  lessonId: number | null | undefined
) {
  const { data: assignments, isLoading: assignmentsLoading } = useAssignments(lessonId);
  const { data: progress } = useAssignmentProgress(userId, lessonId);

  return useQuery({
    queryKey: ['assignments-with-progress', userId, lessonId, assignments],
    queryFn: async (): Promise<AssignmentWithProgress[]> => {
      if (!userId || !lessonId || !assignments || !supabase) {
        return [];
      }

      logger.debug('Fetching assignments with progress', { userId, lessonId });

      // Получить все submissions для этих заданий
      const assignmentIds = assignments.map((a) => a.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .in('assignment_id', assignmentIds)
        .eq('user_id', userId);

      if (submissionsError) {
        logger.error('Error fetching submissions', { userId, lessonId, error: submissionsError });
        throw submissionsError;
      }

      // Получить все черновики для этих заданий
      const { data: drafts, error: draftsError } = await supabase
        .from('assignment_drafts')
        .select('*')
        .in('assignment_id', assignmentIds)
        .eq('user_id', userId);

      if (draftsError) {
        logger.error('Error fetching drafts', { userId, lessonId, error: draftsError });
        throw draftsError;
      }

      // Собрать все вместе
      const result: AssignmentWithProgress[] = assignments.map((assignment) => {
        const submission = submissions?.find((s) => s.assignment_id === assignment.id);
        const draft = drafts?.find((d) => d.assignment_id === assignment.id);

        return {
          ...assignment,
          submission,
          draft,
          is_completed: submission?.status === 'approved',
          is_submitted: !!submission && submission.status !== 'rejected',
        };
      });

      logger.debug('Assignments with progress fetched', {
        userId,
        lessonId,
        count: result.length,
      });
      return result;
    },
    enabled: !!userId && !!lessonId && !assignmentsLoading && !!assignments,
    staleTime: 30 * 1000, // 30 секунд
  });
}

/**
 * Хук для получения черновика задания
 */
export function useAssignmentDraft(
  userId: string | null | undefined,
  assignmentId: number | null | undefined
) {
  return useQuery({
    queryKey: ['assignment-draft', userId, assignmentId],
    queryFn: async (): Promise<AssignmentDraft | null> => {
      if (!userId || !assignmentId || !supabase) {
        return null;
      }

      logger.debug('Fetching assignment draft', { userId, assignmentId });

      const { data, error } = await supabase
        .from('assignment_drafts')
        .select('*')
        .eq('user_id', userId)
        .eq('assignment_id', assignmentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = не найдено (это нормально)
        logger.error('Error fetching assignment draft', { userId, assignmentId, error });
        throw error;
      }

      logger.debug('Assignment draft fetched', { userId, assignmentId, exists: !!data });
      return data || null;
    },
    enabled: !!userId && !!assignmentId,
    staleTime: 30 * 1000, // 30 секунд
  });
}

/**
 * Хук для сохранения черновика задания (автосохранение)
 */
export function useSaveAssignmentDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      assignmentId,
      draftText,
    }: {
      userId: string;
      assignmentId: number;
      draftText: string;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Saving assignment draft', { userId, assignmentId, textLength: draftText.length });

      const { data, error } = await supabase
        .from('assignment_drafts')
        .upsert({
          user_id: userId,
          assignment_id: assignmentId,
          draft_text: draftText,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving assignment draft', { userId, assignmentId, error });
        throw error;
      }

      logger.debug('Assignment draft saved', { userId, assignmentId });
      return data;
    },
    onSuccess: (_, variables) => {
      // Инвалидировать кэш черновиков
      queryClient.invalidateQueries({
        queryKey: ['assignment-draft', variables.userId, variables.assignmentId],
      });
    },
  });
}

/**
 * Хук для сдачи задания
 */
export function useSubmitAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      assignmentId,
      lessonId,
      submissionText,
      fileUrl,
    }: {
      userId: string;
      assignmentId: number;
      lessonId: number;
      submissionText: string;
      fileUrl?: string;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Submitting assignment', { userId, assignmentId, lessonId });

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: userId,
          assignment_id: assignmentId,
          lesson_id: lessonId, // для обратной совместимости
          content_text: submissionText,
          file_url: fileUrl,
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          first_submitted_at: new Date().toISOString(),
          points_awarded: 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error submitting assignment', { userId, assignmentId, error });
        throw error;
      }

      logger.debug('Assignment submitted', { userId, assignmentId, submissionId: data.id });
      return data;
    },
    onSuccess: (_, variables) => {
      // Инвалидировать кэш заданий и прогресса
      queryClient.invalidateQueries({
        queryKey: ['assignments-with-progress', variables.userId, variables.lessonId],
      });
      queryClient.invalidateQueries({
        queryKey: ['assignment-progress', variables.userId, variables.lessonId],
      });
      // Удалить черновик после сдачи
      queryClient.invalidateQueries({
        queryKey: ['assignment-draft', variables.userId, variables.assignmentId],
      });
    },
  });
}

/**
 * Хук для получения обратной связи по уроку
 */
export function useLessonFeedback(
  userId: string | null | undefined,
  lessonId: number | null | undefined
) {
  return useQuery({
    queryKey: ['lesson-feedback', userId, lessonId],
    queryFn: async (): Promise<LessonFeedback | null> => {
      if (!userId || !lessonId || !supabase) {
        return null;
      }

      logger.debug('Fetching lesson feedback', { userId, lessonId });

      const { data, error } = await supabase
        .from('lesson_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = не найдено (это нормально)
        logger.error('Error fetching lesson feedback', { userId, lessonId, error });
        throw error;
      }

      logger.debug('Lesson feedback fetched', { userId, lessonId, exists: !!data });
      return data || null;
    },
    enabled: !!userId && !!lessonId,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
}

/**
 * Хук для создания/обновления обратной связи по уроку (только для кураторов)
 */
export function useCreateLessonFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      curatorId,
      userId,
      lessonId,
      feedbackText,
    }: {
      curatorId: string;
      userId: string;
      lessonId: number;
      feedbackText: string;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Creating lesson feedback', { curatorId, userId, lessonId });

      const { data, error } = await supabase
        .from('lesson_feedback')
        .upsert({
          curator_id: curatorId,
          user_id: userId,
          lesson_id: lessonId,
          feedback_text: feedbackText,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating lesson feedback', { curatorId, userId, lessonId, error });
        throw error;
      }

      logger.debug('Lesson feedback created', { curatorId, userId, lessonId });
      return data;
    },
    onSuccess: (_, variables) => {
      // Инвалидировать кэш обратной связи
      queryClient.invalidateQueries({
        queryKey: ['lesson-feedback', variables.userId, variables.lessonId],
      });
    },
  });
}
