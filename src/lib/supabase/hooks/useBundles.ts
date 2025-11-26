import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Интерфейсы для работы с пакетами
 */

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  order_num: number;
  created_at: string;
  updated_at: string;
}

export interface BundleTechnique {
  id: string;
  bundle_id: string;
  technique_id: string;
  order_num: number;
  created_at: string;
}

export interface BundleTechniqueWithDetails extends BundleTechnique {
  technique?: {
    id: string;
    name: string;
    material_type: 'video' | 'audio';
  };
}

export interface UserBundle {
  id: string;
  user_id: string;
  bundle_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

/**
 * Хук для получения всех пакетов
 */
export function useBundles() {
  return useQuery({
    queryKey: ['bundles'],
    queryFn: async (): Promise<Bundle[]> => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching bundles', { error });
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для получения техник пакета
 */
export function useBundleTechniques(bundleId: string | null) {
  return useQuery({
    queryKey: ['bundle-techniques', bundleId],
    queryFn: async (): Promise<BundleTechniqueWithDetails[]> => {
      if (!bundleId || !supabase) return [];

      const { data, error } = await supabase
        .from('bundle_techniques')
        .select(`
          id,
          bundle_id,
          technique_id,
          order_num,
          created_at,
          technique:materials(id, name, material_type)
        `)
        .eq('bundle_id', bundleId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching bundle techniques', { bundleId, error });
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        technique: item.technique as any
      }));
    },
    enabled: !!bundleId,
  });
}

/**
 * Хук для получения пакетов пользователя
 */
export function useUserBundles(userId: string | null) {
  return useQuery({
    queryKey: ['user-bundles', userId],
    queryFn: async (): Promise<UserBundle[]> => {
      if (!userId || !supabase) return [];

      const { data, error } = await supabase
        .from('user_bundles')
        .select('*')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user bundles', { userId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
  });
}

/**
 * Хук для создания пакета
 */
export function useCreateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string | null;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Creating bundle', params);

      const { data, error } = await supabase
        .from('bundles')
        .insert({
          name: params.name,
          description: params.description || null,
          order_num: params.order_num,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Хук для обновления пакета
 */
export function useUpdateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      description?: string | null;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating bundle', params);

      const { data, error } = await supabase
        .from('bundles')
        .update({
          name: params.name,
          description: params.description || null,
          order_num: params.order_num,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Хук для удаления пакета
 */
export function useDeleteBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundleId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Deleting bundle', { bundleId });

      const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', bundleId);

      if (error) {
        logger.error('Error deleting bundle', { bundleId, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Хук для добавления техники в пакет
 */
export function useAddTechniqueToBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bundle_id: string;
      technique_id: string;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Adding technique to bundle', params);

      const { data, error } = await supabase
        .from('bundle_techniques')
        .insert({
          bundle_id: params.bundle_id,
          technique_id: params.technique_id,
          order_num: params.order_num,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding technique to bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bundle-techniques'], refetchType: 'active' });
    },
  });
}

/**
 * Хук для удаления техники из пакета
 */
export function useRemoveTechniqueFromBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundleTechniqueId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing technique from bundle', { bundleTechniqueId });

      const { error } = await supabase
        .from('bundle_techniques')
        .delete()
        .eq('id', bundleTechniqueId);

      if (error) {
        logger.error('Error removing technique from bundle', { bundleTechniqueId, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bundle-techniques'], refetchType: 'active' });
    },
  });
}

/**
 * Хук для назначения пакета пользователю
 */
export function useAssignBundleToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      bundle_id: string;
      assigned_by?: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Assigning bundle to user', params);

      const { data, error } = await supabase
        .from('user_bundles')
        .insert({
          user_id: params.user_id,
          bundle_id: params.bundle_id,
          assigned_by: params.assigned_by || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error assigning bundle to user', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Хук для удаления пакета у пользователя
 */
export function useRemoveBundleFromUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userBundleId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing bundle from user', { userBundleId });

      const { error } = await supabase
        .from('user_bundles')
        .delete()
        .eq('id', userBundleId);

      if (error) {
        logger.error('Error removing bundle from user', { userBundleId, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Интерфейс для техники из пакета
 */
export interface BundleTechniqueForUser {
  technique_id: string;
  technique_name: string;
  material_type: 'video' | 'audio';
  bundle_id: string;
  bundle_name: string;
}

/**
 * Хук для получения техник из пакетов пользователя (для клиента)
 */
export function useUserBundleTechniques(userId: string | null) {
  return useQuery({
    queryKey: ['user-bundle-techniques', userId],
    queryFn: async (): Promise<BundleTechniqueForUser[]> => {
      if (!userId || !supabase) return [];

      logger.debug('Fetching user bundle techniques', { userId });

      const { data, error } = await supabase
        .rpc('get_user_bundle_techniques', {
          p_user_id: userId
        });

      if (error) {
        logger.error('Error fetching user bundle techniques', { userId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
