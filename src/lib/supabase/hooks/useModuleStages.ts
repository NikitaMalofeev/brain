import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import { CourseStage, Lesson } from '../types';

/**
 * Хуки для управления ступенями (stages) и уроками внутри модулей потоков
 */

// Ступень с уроками
export interface StageWithLessons extends CourseStage {
  lessons: Lesson[];
}

/**
 * Получить ступени модуля с уроками (только привязанные к модулю)
 */
export function useModuleStages(streamModuleId: string | null) {
  return useQuery({
    queryKey: ['module-stages', streamModuleId],
    queryFn: async (): Promise<StageWithLessons[]> => {
      if (!streamModuleId || !supabase) return [];

      logger.debug('Fetching stages for module', { streamModuleId });

      const { data, error } = await supabase
        .from('course_stages')
        .select(`
          *,
          lessons (*)
        `)
        .eq('stream_module_id', streamModuleId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching module stages', { streamModuleId, error });
        throw error;
      }

      return (data || []).map(stage => ({
        ...stage,
        lessons: stage.lessons || []
      }));
    },
    enabled: !!streamModuleId,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
}

/**
 * Создать ступень в модуле
 */
export function useCreateStageInModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stream_module_id: string;
      course_id: string;
      name: string;
      description?: string;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Creating stage in module', params);

      const { data, error } = await supabase
        .from('course_stages')
        .insert({
          stream_module_id: params.stream_module_id,
          course_id: params.course_id,
          name: params.name,
          description: params.description || null,
          order_num: params.order_num,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating stage', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
    },
  });
}

/**
 * Обновить ступень
 */
export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: number;
      name?: string;
      description?: string;
      order_num?: number;
      stream_module_id?: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating stage', params);

      const { id, ...updateData } = params;

      const { data, error } = await supabase
        .from('course_stages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating stage', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.stream_module_id) {
        queryClient.invalidateQueries({
          queryKey: ['module-stages', data.stream_module_id],
          refetchType: 'active'
        });
      }
    },
  });
}

/**
 * Удалить ступень
 */
export function useDeleteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: number; stream_module_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Deleting stage', params);

      const { error } = await supabase
        .from('course_stages')
        .delete()
        .eq('id', params.id);

      if (error) {
        logger.error('Error deleting stage', { params, error });
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
    },
  });
}

/**
 * Создать урок в ступени
 */
export function useCreateLessonInStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stage_id: number;
      stream_id: string;
      stream_module_id: string;
      name: string;
      description?: string;
      order_num: number;
      has_assignment?: boolean;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Creating lesson in stage', params);

      const { stream_module_id, ...insertData } = params;

      const { data, error } = await supabase
        .from('lessons')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating lesson', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
    },
  });
}

/**
 * Обновить урок
 */
export function useUpdateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: number;
      name?: string;
      description?: string;
      order_num?: number;
      has_assignment?: boolean;
      stream_module_id: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating lesson', params);

      const { id, stream_module_id, ...updateData } = params;

      const { data, error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating lesson', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
    },
  });
}

/**
 * Удалить урок
 */
export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: number; stream_module_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Deleting lesson', params);

      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', params.id);

      if (error) {
        logger.error('Error deleting lesson', { params, error });
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
    },
  });
}

/**
 * Получить все ступени курса, не привязанные к модулю (для выбора и привязки)
 */
export function useUnassignedStages(courseId: string | null) {
  return useQuery({
    queryKey: ['unassigned-stages', courseId],
    queryFn: async (): Promise<StageWithLessons[]> => {
      if (!courseId || !supabase) return [];

      logger.debug('Fetching unassigned stages for course', { courseId });

      const { data, error } = await supabase
        .from('course_stages')
        .select(`
          *,
          lessons (*)
        `)
        .eq('course_id', courseId)
        .is('stream_module_id', null)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching unassigned stages', { courseId, error });
        throw error;
      }

      logger.debug('Fetched unassigned stages', {
        courseId,
        stagesCount: data?.length || 0,
      });

      return (data || []).map(stage => ({
        ...stage,
        lessons: stage.lessons || []
      }));
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Привязать существующую ступень к модулю потока
 */
export function useAssignStageToModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stage_id: number;
      stream_module_id: string;
      course_id: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Assigning stage to module', params);

      const { data, error } = await supabase
        .from('course_stages')
        .update({ stream_module_id: params.stream_module_id })
        .eq('id', params.stage_id)
        .select()
        .single();

      if (error) {
        logger.error('Error assigning stage to module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['unassigned-stages', variables.course_id],
        refetchType: 'active'
      });
    },
  });
}

/**
 * Отвязать ступень от модуля (вернуть в непривязанные)
 */
export function useUnassignStageFromModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stage_id: number;
      stream_module_id: string;
      course_id: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Unassigning stage from module', params);

      const { data, error } = await supabase
        .from('course_stages')
        .update({ stream_module_id: null })
        .eq('id', params.stage_id)
        .select()
        .single();

      if (error) {
        logger.error('Error unassigning stage from module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['unassigned-stages', variables.course_id],
        refetchType: 'active'
      });
    },
  });
}
