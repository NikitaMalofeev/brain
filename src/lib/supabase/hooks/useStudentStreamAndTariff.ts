import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Хуки для управления потоками и тарифами студентов
 */

// Получить поток студента
export function useStudentStream(userId: string | null) {
  return useQuery({
    queryKey: ['student-stream', userId],
    queryFn: async () => {
      if (!userId || !supabase) return null;

      const { data, error } = await supabase
        .from('user_stream_enrollments')
        .select('stream_id, streams(id, name)')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        logger.error('Error fetching student stream', { userId, error });
        throw error;
      }

      return data;
    },
    enabled: !!userId,
  });
}

// Получить тариф студента
export function useStudentTariff(userId: string | null) {
  return useQuery({
    queryKey: ['student-tariff', userId],
    queryFn: async () => {
      if (!userId || !supabase) return null;

      const { data, error } = await supabase
        .from('user_tariffs')
        .select('tariff_id, is_active, tariffs(id, name, code)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        logger.error('Error fetching student tariff', { userId, error });
        throw error;
      }

      return data;
    },
    enabled: !!userId,
  });
}

// Назначить студенту поток
export function useAssignStudentToStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; streamId: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Assigning student to stream', params);

      // Проверяем, есть ли уже запись
      const { data: existing } = await supabase
        .from('user_stream_enrollments')
        .select('id')
        .eq('user_id', params.userId)
        .single();

      if (existing) {
        // Обновляем существующую запись
        const { error } = await supabase
          .from('user_stream_enrollments')
          .update({ stream_id: params.streamId })
          .eq('user_id', params.userId);

        if (error) {
          logger.error('Error updating student stream', { params, error });
          throw error;
        }
      } else {
        // Создаем новую запись
        const { error } = await supabase
          .from('user_stream_enrollments')
          .insert({
            user_id: params.userId,
            stream_id: params.streamId,
          });

        if (error) {
          logger.error('Error assigning student to stream', { params, error });
          throw error;
        }
      }

      logger.info('Student assigned to stream', params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-stream', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
    },
  });
}

// Назначить студенту тариф
export function useAssignStudentTariff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; tariffId: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Assigning tariff to student', params);

      // Деактивируем все старые тарифы
      await supabase
        .from('user_tariffs')
        .update({ is_active: false })
        .eq('user_id', params.userId);

      // Проверяем, есть ли уже такой тариф
      const { data: existing } = await supabase
        .from('user_tariffs')
        .select('id')
        .eq('user_id', params.userId)
        .eq('tariff_id', params.tariffId)
        .single();

      if (existing) {
        // Активируем существующий тариф
        const { error } = await supabase
          .from('user_tariffs')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (error) {
          logger.error('Error activating student tariff', { params, error });
          throw error;
        }
      } else {
        // Создаем новый тариф
        const { error } = await supabase
          .from('user_tariffs')
          .insert({
            user_id: params.userId,
            tariff_id: params.tariffId,
            is_active: true,
          });

        if (error) {
          logger.error('Error assigning tariff to student', { params, error });
          throw error;
        }
      }

      logger.info('Tariff assigned to student', params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-tariff', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
    },
  });
}

// Удалить студента из потока
export function useRemoveStudentFromStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing student from stream', { userId });

      const { error } = await supabase
        .from('user_stream_enrollments')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Error removing student from stream', { userId, error });
        throw error;
      }

      logger.info('Student removed from stream', { userId });
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['student-stream', userId] });
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
    },
  });
}

// Удалить тариф студента
export function useRemoveStudentTariff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing student tariff', { userId });

      const { error } = await supabase
        .from('user_tariffs')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) {
        logger.error('Error removing student tariff', { userId, error });
        throw error;
      }

      logger.info('Student tariff removed', { userId });
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['student-tariff', userId] });
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
    },
  });
}
