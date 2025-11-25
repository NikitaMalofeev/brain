import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '@/lib/logger';
import type {
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
        .from('stream_module_techniques')
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
        .from('stream_module_techniques')
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

      const { error } = await supabase.from('stream_module_techniques').delete().eq('id', id);

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
        .from('user_technique_access')
        .select(`
          *,
          technique:techniques(*)
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
