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

      // Получаем информацию о потоке, включая course_id
      const { data: streamData, error: streamError } = await supabase
        .from('streams')
        .select('course_id')
        .eq('id', params.streamId)
        .single();

      if (streamError) {
        logger.error('Error fetching stream data', { streamId: params.streamId, error: streamError });
        throw streamError;
      }

      // Проверяем, есть ли уже запись в user_stream_enrollments
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

      // Также создаем/обновляем запись в user_course_enrollments
      if (streamData?.course_id) {
        // Деактивируем все старые enrollments
        await supabase
          .from('user_course_enrollments')
          .update({ is_active: false })
          .eq('user_id', params.userId);

        // Проверяем, есть ли уже enrollment для этого курса
        const { data: existingEnrollment } = await supabase
          .from('user_course_enrollments')
          .select('id')
          .eq('user_id', params.userId)
          .eq('course_id', streamData.course_id)
          .single();

        if (existingEnrollment) {
          // Активируем существующий enrollment
          const { error: enrollError } = await supabase
            .from('user_course_enrollments')
            .update({ is_active: true })
            .eq('id', existingEnrollment.id);

          if (enrollError) {
            logger.error('Error activating course enrollment', { params, error: enrollError });
            throw enrollError;
          }
        } else {
          // Создаем новый enrollment
          const { error: enrollError } = await supabase
            .from('user_course_enrollments')
            .insert({
              user_id: params.userId,
              course_id: streamData.course_id,
              is_active: true,
            });

          if (enrollError) {
            logger.error('Error creating course enrollment', { params, error: enrollError });
            throw enrollError;
          }
        }

        logger.info('Course enrollment created/updated', { userId: params.userId, courseId: streamData.course_id });
      }

      // =============================================
      // КРИТИЧНО: Обновляем user_module_access для нового потока
      // Это нужно для корректной работы библиотеки техник
      // =============================================

      // Получаем ID модулей нового потока
      const { data: newStreamModules } = await supabase
        .from('stream_modules')
        .select('id')
        .eq('stream_id', params.streamId);

      const newModuleIds = newStreamModules?.map(m => m.id) || [];

      // Получаем текущие доступы к модулям этого потока
      const { data: existingAccess } = await supabase
        .from('user_module_access')
        .select('stream_module_id')
        .eq('user_id', params.userId)
        .in('stream_module_id', newModuleIds);

      const existingModuleIds = new Set(existingAccess?.map(a => a.stream_module_id) || []);

      // Получаем модули старых потоков (не нового) и удаляем к ним доступ
      const { data: oldModuleAccess } = await supabase
        .from('user_module_access')
        .select('id, stream_module_id, stream_modules!inner(stream_id)')
        .eq('user_id', params.userId)
        .neq('stream_modules.stream_id', params.streamId);

      if (oldModuleAccess && oldModuleAccess.length > 0) {
        const oldAccessIds = oldModuleAccess.map(a => a.id);
        const { error: deleteError } = await supabase
          .from('user_module_access')
          .delete()
          .in('id', oldAccessIds);

        if (deleteError) {
          logger.warn('Error deleting old module access', { params, error: deleteError });
        } else {
          logger.info('Deleted old module access', { count: oldAccessIds.length });
        }
      }

      // Добавляем доступ к модулям нового потока (только те, которых ещё нет)
      const modulesToAdd = newModuleIds.filter(id => !existingModuleIds.has(id));

      for (const moduleId of modulesToAdd) {
        const { error: insertError } = await supabase
          .from('user_module_access')
          .insert({
            user_id: params.userId,
            stream_module_id: moduleId,
            granted_at: new Date().toISOString(),
          });

        if (insertError) {
          logger.warn('Error creating module access', { moduleId, error: insertError });
        }
      }

      logger.info('Module access updated for new stream', {
        userId: params.userId,
        totalModules: newModuleIds.length,
        added: modulesToAdd.length,
        existing: existingModuleIds.size
      });
      logger.info('Student assigned to stream', params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-stream', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['active-course', variables.userId] });
      // Также инвалидируем кэш техник чтобы библиотека обновилась
      queryClient.invalidateQueries({ queryKey: ['techniques', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-modules', variables.userId] });
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
