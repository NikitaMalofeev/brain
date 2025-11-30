import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// ============================================
// Типы
// ============================================

export interface SpecialBundle {
  id: string;
  name: string;
  description: string | null;
  order_num: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialBundleTechnique {
  id: string;
  special_bundle_id: string;
  technique_id: string;
  technique_position: number;
  delay_days: number;
  created_at: string;
}

export interface SpecialBundleTechniqueWithDetails extends SpecialBundleTechnique {
  technique?: {
    id: string;
    name: string;
    cover_image: string | null;
    material_type: 'video' | 'audio';
  };
}

export interface SpecialBundlePlacement {
  id: string;
  special_bundle_id: string;
  tariff_stream_module_id: string;
  start_unlock_offset_days: number;
  created_at: string;
}

export interface SpecialBundlePlacementWithDetails extends SpecialBundlePlacement {
  special_bundle?: SpecialBundle;
}

export interface UserSpecialBundlePayment {
  id: string;
  user_id: string;
  special_bundle_id: string;
  technique_position: number;
  paid_at: string;
  paid_by: string | null;
}

// Техника из спец.пакета для пользователя (результат RPC)
export interface UserSpecialBundleTechnique {
  technique_id: string;
  technique_name: string;
  technique_description: string | null;
  technique_cover: string | null;
  special_bundle_id: string;
  special_bundle_name: string;
  technique_position: number;
  delay_days: number;
  unlock_date: string;
  is_time_unlocked: boolean;
  is_paid: boolean;
  is_available: boolean;
  previous_technique_name: string | null;
}

// ============================================
// Хуки для управления специальными пакетами
// ============================================

/**
 * Получение всех специальных пакетов
 */
export function useSpecialBundles() {
  return useQuery({
    queryKey: ['special-bundles'],
    queryFn: async (): Promise<SpecialBundle[]> => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('special_bundles')
        .select('*')
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching special bundles', { error });
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Создание специального пакета
 */
export function useCreateSpecialBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string | null;
      order_num?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Creating special bundle', params);

      const { data, error } = await supabase
        .from('special_bundles')
        .insert({
          name: params.name,
          description: params.description || null,
          order_num: params.order_num || 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating special bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Обновление специального пакета
 */
export function useUpdateSpecialBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      description?: string | null;
      order_num?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating special bundle', params);

      const { data, error } = await supabase
        .from('special_bundles')
        .update({
          name: params.name,
          description: params.description || null,
          order_num: params.order_num,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating special bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundles'], refetchType: 'active' });
    },
  });
}

/**
 * Удаление специального пакета
 */
export function useDeleteSpecialBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundleId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Deleting special bundle', { bundleId });

      const { error } = await supabase
        .from('special_bundles')
        .delete()
        .eq('id', bundleId);

      if (error) {
        logger.error('Error deleting special bundle', { bundleId, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundles'], refetchType: 'active' });
    },
  });
}

// ============================================
// Хуки для техник в специальном пакете
// ============================================

/**
 * Получение техник специального пакета
 */
export function useSpecialBundleTechniques(bundleId: string | null) {
  return useQuery({
    queryKey: ['special-bundle-techniques', bundleId],
    queryFn: async (): Promise<SpecialBundleTechniqueWithDetails[]> => {
      if (!bundleId || !supabase) return [];

      const { data, error } = await supabase
        .from('special_bundle_techniques')
        .select(`
          id,
          special_bundle_id,
          technique_id,
          technique_position,
          delay_days,
          created_at,
          technique:materials(id, name, cover_image_path, material_type)
        `)
        .eq('special_bundle_id', bundleId)
        .order('technique_position', { ascending: true });

      if (error) {
        logger.error('Error fetching special bundle techniques', { bundleId, error });
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        technique: item.technique ? {
          ...item.technique,
          cover_image: (item.technique as any).cover_image_path
        } : undefined
      })) as SpecialBundleTechniqueWithDetails[];
    },
    enabled: !!bundleId,
  });
}

/**
 * Добавление техники в специальный пакет
 */
export function useAddTechniqueToSpecialBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      special_bundle_id: string;
      technique_id: string;
      delay_days?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Adding technique to special bundle', params);

      // Получаем максимальную позицию в пакете
      const { data: existingTechniques } = await supabase
        .from('special_bundle_techniques')
        .select('technique_position')
        .eq('special_bundle_id', params.special_bundle_id)
        .order('technique_position', { ascending: false })
        .limit(1);

      const maxPosition = existingTechniques?.[0]?.technique_position || 0;
      const newPosition = maxPosition + 1;

      const { data, error } = await supabase
        .from('special_bundle_techniques')
        .insert({
          special_bundle_id: params.special_bundle_id,
          technique_id: params.technique_id,
          technique_position: newPosition,
          delay_days: newPosition === 1 ? 0 : (params.delay_days || 30), // Первая техника без задержки
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding technique to special bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-techniques'], refetchType: 'active' });
    },
  });
}

/**
 * Удаление техники из специального пакета
 */
export function useRemoveTechniqueFromSpecialBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (techniqueId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing technique from special bundle', { techniqueId });

      const { error } = await supabase
        .from('special_bundle_techniques')
        .delete()
        .eq('id', techniqueId);

      if (error) {
        logger.error('Error removing technique from special bundle', { techniqueId, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-techniques'], refetchType: 'active' });
    },
  });
}

/**
 * Обновление позиции и задержки техники
 */
export function useUpdateSpecialBundleTechnique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      technique_position?: number;
      delay_days?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating special bundle technique', params);

      const updateData: any = {};
      if (params.technique_position !== undefined) updateData.technique_position = params.technique_position;
      if (params.delay_days !== undefined) updateData.delay_days = params.delay_days;

      const { data, error } = await supabase
        .from('special_bundle_techniques')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating special bundle technique', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-techniques'], refetchType: 'active' });
    },
  });
}

// ============================================
// Хуки для размещения в модулях
// ============================================

/**
 * Получение размещений специальных пакетов в модуле
 */
export function useSpecialBundlePlacements(tariffStreamModuleId: string | null) {
  return useQuery({
    queryKey: ['special-bundle-placements', tariffStreamModuleId],
    queryFn: async (): Promise<SpecialBundlePlacementWithDetails[]> => {
      if (!tariffStreamModuleId || !supabase) return [];

      const { data, error } = await supabase
        .from('special_bundle_placements')
        .select(`
          id,
          special_bundle_id,
          tariff_stream_module_id,
          start_unlock_offset_days,
          created_at,
          special_bundle:special_bundles(id, name, description, order_num)
        `)
        .eq('tariff_stream_module_id', tariffStreamModuleId);

      if (error) {
        logger.error('Error fetching special bundle placements', { tariffStreamModuleId, error });
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        special_bundle: item.special_bundle as any
      }));
    },
    enabled: !!tariffStreamModuleId,
  });
}

/**
 * Размещение специального пакета в модуле
 */
export function usePlaceSpecialBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      special_bundle_id: string;
      tariff_stream_module_id: string;
      start_unlock_offset_days: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Placing special bundle', params);

      const { data, error } = await supabase
        .from('special_bundle_placements')
        .insert({
          special_bundle_id: params.special_bundle_id,
          tariff_stream_module_id: params.tariff_stream_module_id,
          start_unlock_offset_days: params.start_unlock_offset_days,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error placing special bundle', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-placements'], refetchType: 'active' });
    },
  });
}

/**
 * Удаление размещения специального пакета
 */
export function useRemoveSpecialBundlePlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placementId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing special bundle placement', { placementId });

      const { error } = await supabase
        .from('special_bundle_placements')
        .delete()
        .eq('id', placementId);

      if (error) {
        logger.error('Error removing special bundle placement', { placementId, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-placements'], refetchType: 'active' });
    },
  });
}

/**
 * Обновление дня размещения
 */
export function useUpdateSpecialBundlePlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      start_unlock_offset_days: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating special bundle placement', params);

      const { data, error } = await supabase
        .from('special_bundle_placements')
        .update({
          start_unlock_offset_days: params.start_unlock_offset_days,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating special bundle placement', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-placements'], refetchType: 'active' });
    },
  });
}

// ============================================
// Хуки для оплаты пользователей
// ============================================

/**
 * Получение оплат специальных пакетов пользователя
 */
export function useUserSpecialBundlePayments(userId: string | null) {
  return useQuery({
    queryKey: ['user-special-bundle-payments', userId],
    queryFn: async (): Promise<UserSpecialBundlePayment[]> => {
      if (!userId || !supabase) return [];

      const { data, error } = await supabase
        .from('user_special_bundle_payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user special bundle payments', { userId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
  });
}

/**
 * Отметить технику как оплаченную
 */
export function useMarkSpecialTechniquePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      special_bundle_id: string;
      technique_position: number;
      paid_by?: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Marking special technique as paid', params);

      const { data, error } = await supabase
        .from('user_special_bundle_payments')
        .insert({
          user_id: params.user_id,
          special_bundle_id: params.special_bundle_id,
          technique_position: params.technique_position,
          paid_by: params.paid_by || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error marking special technique as paid', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-special-bundle-payments'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['user-special-bundle-techniques'], refetchType: 'active' });
    },
  });
}

/**
 * Отменить оплату техники
 */
export function useUnmarkSpecialTechniquePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      special_bundle_id: string;
      technique_position: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Unmarking special technique payment', params);

      const { error } = await supabase
        .from('user_special_bundle_payments')
        .delete()
        .eq('user_id', params.user_id)
        .eq('special_bundle_id', params.special_bundle_id)
        .eq('technique_position', params.technique_position);

      if (error) {
        logger.error('Error unmarking special technique payment', { params, error });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-special-bundle-payments'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['user-special-bundle-techniques'], refetchType: 'active' });
    },
  });
}

// ============================================
// Хук для клиента - получение техник из спец.пакетов
// ============================================

/**
 * Получение техник из специальных пакетов пользователя (через RPC)
 */
export function useUserSpecialBundleTechniques(userId: string | null) {
  return useQuery({
    queryKey: ['user-special-bundle-techniques', userId],
    queryFn: async (): Promise<UserSpecialBundleTechnique[]> => {
      if (!userId || !supabase) return [];

      logger.debug('Fetching user special bundle techniques', { userId });

      const { data, error } = await supabase
        .rpc('get_user_special_bundle_techniques', {
          p_user_id: userId
        });

      if (error) {
        logger.error('Error fetching user special bundle techniques', { userId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Группировка техник по специальным пакетам
 */
export function groupTechniquesBySpecialBundle(techniques: UserSpecialBundleTechnique[]) {
  const grouped = new Map<string, {
    bundleId: string;
    bundleName: string;
    techniques: UserSpecialBundleTechnique[];
  }>();

  techniques.forEach(tech => {
    if (!grouped.has(tech.special_bundle_id)) {
      grouped.set(tech.special_bundle_id, {
        bundleId: tech.special_bundle_id,
        bundleName: tech.special_bundle_name,
        techniques: [],
      });
    }
    grouped.get(tech.special_bundle_id)!.techniques.push(tech);
  });

  // Сортируем техники по позиции внутри каждого пакета
  grouped.forEach(group => {
    group.techniques.sort((a, b) => a.technique_position - b.technique_position);
  });

  return Array.from(grouped.values());
}
