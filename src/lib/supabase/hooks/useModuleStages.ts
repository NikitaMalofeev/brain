import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import { CourseStage, Lesson } from '../types';

/**
 * Хуки для управления ступенями (stages) и уроками внутри модулей потоков
 *
 * ПРИМЕЧАНИЕ: Эти хуки теперь работают напрямую с уроками через stream_module_id,
 * обеспечивая обратную совместимость для существующих компонентов.
 * Ступени (course_stages) deprecated и будут удалены в будущем.
 */

// Ступень с уроками - теперь это виртуальная обёртка над уроком
export interface StageWithLessons extends Partial<CourseStage> {
  id: number;
  name: string;
  description?: string | null;
  order_num: number;
  cover_image_path?: string | null;
  lessons: Lesson[];
}

// Данные модуля
export interface ModuleInfo {
  name: string;
  description: string | null;
  order_num: number;
  cover_image: string | null;
}

// Результат хука с информацией о модуле
export interface ModuleStagesResult {
  stages: StageWithLessons[];
  moduleInfo: ModuleInfo | null;
}

/**
 * Получить уроки модуля как "ступени" (для обратной совместимости)
 * Теперь работает напрямую с lessons через stream_module_id
 * Также возвращает информацию о самом модуле
 */
export function useModuleStages(streamModuleId: string | null) {
  return useQuery({
    queryKey: ['module-stages', streamModuleId],
    queryFn: async (): Promise<ModuleStagesResult> => {
      if (!streamModuleId || !supabase) return { stages: [], moduleInfo: null };

      logger.debug('Fetching lessons for module (as stages)', { streamModuleId });

      // Получаем данные модуля
      const { data: moduleData, error: moduleError } = await supabase
        .from('stream_modules')
        .select('name, order_num, cover_image')
        .eq('id', streamModuleId)
        .single();

      if (moduleError) {
        logger.error('Error fetching module info', { streamModuleId, error: moduleError });
      }

      // Получаем уроки напрямую через stream_module_id
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('stream_module_id', streamModuleId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching module lessons', { streamModuleId, error });
        throw error;
      }

      // Преобразуем каждый урок в "ступень" с одним уроком для обратной совместимости
      // Это позволяет использовать существующие компоненты без изменений
      const stages = (lessons || []).map(lesson => ({
        id: lesson.stage_id || lesson.id, // Используем stage_id если есть, иначе lesson.id
        name: lesson.name,
        description: lesson.description,
        order_num: lesson.order_num,
        cover_image_path: lesson.cover_image_path || null,
        lessons: [lesson], // Каждая "ступень" содержит один урок
      }));

      return {
        stages,
        moduleInfo: moduleData ? {
          name: moduleData.name,
          description: null,
          order_num: moduleData.order_num,
          cover_image: moduleData.cover_image || null,
        } : null,
      };
    },
    enabled: !!streamModuleId,
    staleTime: 5 * 60 * 1000, // 5 минут - уроки модуля редко меняются
    gcTime: 15 * 60 * 1000, // 15 минут в кэше
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
      open_day_offset?: number;
      deadline_day_offset?: number | null;
      open_at?: string;
      deadline_at?: string;
      estimated_duration_minutes?: number;
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
      open_day_offset?: number | null;
      deadline_day_offset?: number | null;
      open_at?: string;
      deadline_at?: string;
      estimated_duration_minutes?: number;
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
