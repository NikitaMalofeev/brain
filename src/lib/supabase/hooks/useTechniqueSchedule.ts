import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '@/lib/logger';
import type {
  // Backwards compatibility
  StreamModuleTechnique,
  CreateStreamModuleTechnique,
  UpdateStreamModuleTechnique,
} from '../types';

/**
 * Хук для получения расписания техник в модуле
 */
export const useModuleTechniquesSchedule = (streamModuleId: string | null) => {
  return useQuery({
    queryKey: ['module-techniques-schedule', streamModuleId],
    queryFn: async () => {
      if (!streamModuleId || !supabase) {
        throw new Error('Module ID or Supabase client not provided');
      }

      logger.debug('Fetching module techniques schedule', { streamModuleId });

      // Используем RPC функцию для получения расписания с is_unlocked и days_until_unlock
      const { data, error } = await supabase.rpc('get_module_techniques_schedule', {
        p_stream_module_id: streamModuleId,
      });

      if (error) {
        logger.error('Error fetching module techniques schedule', { error });
        throw error;
      }

      return data;
    },
    enabled: !!streamModuleId,
  });
};

/**
 * Хук для добавления техники в модуль с датой открытия
 */
export const useAddTechniqueToModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStreamModuleTechnique) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Adding technique to module', { data });

      const { data: result, error } = await supabase
        .from('module_materials')
        .insert([data])
        .select()
        .single();

      if (error) {
        logger.error('Error adding technique to module', { error });
        throw error;
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-techniques-schedule', variables.stream_module_id],
      });
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
};

/**
 * Хук для обновления даты открытия техники в модуле
 */
export const useUpdateTechniqueInModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateStreamModuleTechnique) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Updating technique in module', { data });

      const { id, ...updateData } = data;

      const { data: result, error } = await supabase
        .from('module_materials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating technique in module', { error });
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-techniques-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
};

/**
 * Хук для удаления техники из модуля
 */
export const useRemoveTechniqueFromModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Removing technique from module', { id });

      const { error } = await supabase.from('module_materials').delete().eq('id', id);

      if (error) {
        logger.error('Error removing technique from module', { error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-techniques-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
};

/**
 * Хук для выдачи доступа к технике пользователю
 */
export const useGrantTechniqueAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      techniqueId: string;
      accessSource?: 'purchase' | 'tariff' | 'gift' | 'free';
      expiresAt?: string | null;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Granting technique access', params);

      const { data, error } = await supabase.rpc('grant_technique_access', {
        p_user_id: params.userId,
        p_technique_id: params.techniqueId,
        p_access_source: params.accessSource || 'gift',
        p_expires_at: params.expiresAt || null,
      });

      if (error) {
        logger.error('Error granting technique access', { error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-technique-access'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
};

/**
 * Хук для отзыва доступа к технике
 */
export const useRevokeTechniqueAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; techniqueId: string }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Revoking technique access', params);

      const { data, error } = await supabase.rpc('revoke_technique_access', {
        p_user_id: params.userId,
        p_technique_id: params.techniqueId,
      });

      if (error) {
        logger.error('Error revoking technique access', { error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-technique-access'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
};

/**
 * Хук для получения доступов пользователя к техникам
 */
export const useUserTechniqueAccess = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-technique-access', userId],
    queryFn: async () => {
      if (!userId || !supabase) {
        return [];
      }

      logger.debug('Fetching user technique access', { userId });

      const { data, error } = await supabase
        .from('user_material_access')
        .select(`
          *,
          material:materials(*)
        `)
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user technique access', { error });
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
  });
};

/**
 * Хук для получения техники по модулю и дню (release_day)
 * Используется на странице урока для показа связанной техники
 * Требует stream_id и tariff_id для корректной фильтрации
 */
export const useTechniqueByModuleAndDay = (
  moduleId: string | null,
  day: number | null,
  streamId?: string | null,
  tariffId?: string | null
) => {
  return useQuery({
    queryKey: ['technique-by-module-day', moduleId, day, streamId, tariffId],
    queryFn: async () => {
      console.log('useTechniqueByModuleAndDay called with:', { moduleId, day, streamId, tariffId });

      if (!moduleId || !day || !supabase) {
        console.log('useTechniqueByModuleAndDay skipped - missing params:', { moduleId, day, hasSupabase: !!supabase });
        return null;
      }

      logger.debug('Fetching technique by module and day', { moduleId, day, streamId, tariffId });

      // Строим запрос с учётом stream_id и tariff_id (если переданы)
      let query = supabase
        .from('module_materials')
        .select(`
          *,
          material:materials(
            id,
            name,
            description,
            cover_image_path,
            material_type,
            duration_seconds
          )
        `)
        .eq('module_id', moduleId)
        .eq('release_day', day);

      // Добавляем фильтры по stream_id и tariff_id если переданы
      if (streamId) {
        query = query.eq('stream_id', streamId);
      }
      if (tariffId) {
        query = query.eq('tariff_id', tariffId);
      }

      const { data, error } = await query.maybeSingle();

      console.log('module_materials query result:', { data, error });

      if (error) {
        logger.error('Error fetching technique by module and day', { error });
        throw error;
      }

      return data;
    },
    enabled: !!moduleId && !!day,
  });
};

// ============================================================================
// ХУКИ ДЛЯ ПЛАТНЫХ ТЕХНИК (status = 'paid')
// ============================================================================

/**
 * Интерфейс для платной техники с информацией об оплате
 */
export interface PaidTechniqueWithPayment {
  technique_id: string;
  technique_name: string;
  technique_description: string | null;
  technique_cover: string | null;
  technique_audio_url: string | null;
  is_paid: boolean;
  paid_at: string | null;
  paid_by: string | null;
  order_num: number;
}

/**
 * Хук для получения списка платных техник с информацией об оплате для пользователя
 */
export const useUserPaidTechniques = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-paid-techniques', userId],
    queryFn: async (): Promise<PaidTechniqueWithPayment[]> => {
      if (!userId || !supabase) {
        return [];
      }

      logger.debug('Fetching user paid techniques', { userId });

      const { data, error } = await supabase.rpc('get_user_paid_techniques', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('Error fetching user paid techniques', { error });
        throw error;
      }

      return (data as PaidTechniqueWithPayment[]) || [];
    },
    enabled: !!userId,
  });
};

/**
 * Хук для отметки платной техники как оплаченной
 */
export const useMarkPaidTechniquePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      technique_id: string;
      paid_by?: string;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Marking paid technique as paid', params);

      // Upsert запись в user_paid_technique_access
      const { data, error } = await supabase
        .from('user_paid_technique_access')
        .upsert({
          user_id: params.user_id,
          technique_id: params.technique_id,
          is_paid: true,
          paid_at: new Date().toISOString(),
          paid_by: params.paid_by || null,
        }, {
          onConflict: 'user_id,technique_id',
        })
        .select()
        .single();

      if (error) {
        logger.error('Error marking paid technique as paid', { error });
        throw error;
      }

      // Также выдаём доступ к технике
      const { error: accessError } = await supabase.rpc('grant_technique_access', {
        p_user_id: params.user_id,
        p_technique_id: params.technique_id,
        p_access_source: 'purchase',
        p_expires_at: null,
      });

      if (accessError) {
        logger.warn('Error granting technique access after payment', { error: accessError });
        // Не бросаем ошибку, т.к. оплата уже зафиксирована
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-paid-techniques', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user-technique-access', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['techniques', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
};

/**
 * Хук для отмены оплаты платной техники
 */
export const useUnmarkPaidTechniquePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      technique_id: string;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Unmarking paid technique', params);

      // Обновляем запись - ставим is_paid = false
      const { data, error } = await supabase
        .from('user_paid_technique_access')
        .update({
          is_paid: false,
          paid_at: null,
          paid_by: null,
        })
        .eq('user_id', params.user_id)
        .eq('technique_id', params.technique_id)
        .select()
        .single();

      if (error) {
        logger.error('Error unmarking paid technique', { error });
        throw error;
      }

      // Отзываем доступ к технике
      const { error: revokeError } = await supabase.rpc('revoke_technique_access', {
        p_user_id: params.user_id,
        p_technique_id: params.technique_id,
      });

      if (revokeError) {
        logger.warn('Error revoking technique access after unmark', { error: revokeError });
        // Не бросаем ошибку
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-paid-techniques', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user-technique-access', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['techniques', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
};
