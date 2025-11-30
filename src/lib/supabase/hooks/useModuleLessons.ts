import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import { Lesson } from '../types';

/**
 * Хуки для управления уроками напрямую в модулях (без промежуточных ступеней)
 */

/**
 * Получить уроки модуля напрямую (без course_stages)
 */
export function useModuleLessons(streamModuleId: string | null) {
  return useQuery({
    queryKey: ['module-lessons', streamModuleId],
    queryFn: async (): Promise<Lesson[]> => {
      if (!streamModuleId || !supabase) return [];

      logger.debug('Fetching lessons for module', { streamModuleId });

      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('stream_module_id', streamModuleId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching module lessons', { streamModuleId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!streamModuleId,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
}

/**
 * Создать урок напрямую в модуле (без stage_id)
 */
export function useCreateLessonInModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stream_module_id: string;
      stream_id: string;
      name: string;
      description?: string;
      order_num: number;
      has_assignment?: boolean;
      open_day_offset?: number | null;
      deadline_day_offset?: number | null;
      open_at?: string;
      deadline_at?: string;
      cover_image_path?: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Creating lesson in module', params);

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          stream_module_id: params.stream_module_id,
          stream_id: params.stream_id,
          name: params.name,
          description: params.description || null,
          order_num: params.order_num,
          has_assignment: params.has_assignment || false,
          open_day_offset: params.open_day_offset ?? null,
          deadline_day_offset: params.deadline_day_offset ?? null,
          open_at: params.open_at || null,
          deadline_at: params.deadline_at || null,
          cover_image_path: params.cover_image_path || null,
          // stage_id не указываем - теперь nullable
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating lesson in module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-lessons', variables.stream_module_id],
        refetchType: 'active'
      });
      // Также инвалидируем старый ключ для обратной совместимости
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
export function useUpdateModuleLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: number;
      stream_module_id: string;
      name?: string;
      description?: string;
      order_num?: number;
      has_assignment?: boolean;
      open_day_offset?: number | null;
      deadline_day_offset?: number | null;
      open_at?: string | null;
      deadline_at?: string | null;
      cover_image_path?: string | null;
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
        queryKey: ['module-lessons', variables.stream_module_id],
        refetchType: 'active'
      });
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
export function useDeleteModuleLesson() {
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
        queryKey: ['module-lessons', variables.stream_module_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['module-stages', variables.stream_module_id],
        refetchType: 'active'
      });
    },
  });
}
