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
 * Техника спец.пакета с рассчитанным днём открытия
 */
export interface SpecialBundleTechniqueWithDay {
  id: string;
  technique_id: string;
  technique_position: number;
  delay_days: number;
  calculated_day: number; // Рассчитанный день в модуле (0-indexed)
  special_bundle_id: string;
  special_bundle_name: string;
  placement_id: string;
  technique?: {
    id: string;
    name: string;
    cover_image: string | null;
    material_type: 'video' | 'audio';
  };
}

/**
 * Получение размещений с техниками и рассчитанными днями открытия
 */
export function useSpecialBundlePlacementsWithTechniques(tariffStreamModuleId: string | null) {
  return useQuery({
    queryKey: ['special-bundle-placements-with-techniques', tariffStreamModuleId],
    queryFn: async (): Promise<SpecialBundleTechniqueWithDay[]> => {
      if (!tariffStreamModuleId || !supabase) return [];

      // Получаем размещения
      const { data: placements, error: placementsError } = await supabase
        .from('special_bundle_placements')
        .select(`
          id,
          special_bundle_id,
          start_unlock_offset_days,
          special_bundle:special_bundles(id, name)
        `)
        .eq('tariff_stream_module_id', tariffStreamModuleId);

      if (placementsError) {
        logger.error('Error fetching placements', { tariffStreamModuleId, placementsError });
        throw placementsError;
      }

      if (!placements || placements.length === 0) return [];

      // Получаем техники для всех размещённых пакетов
      const bundleIds = placements.map(p => p.special_bundle_id);
      const { data: techniques, error: techniquesError } = await supabase
        .from('special_bundle_techniques')
        .select(`
          id,
          special_bundle_id,
          technique_id,
          technique_position,
          delay_days,
          technique:materials(id, name, cover_image_path, material_type)
        `)
        .in('special_bundle_id', bundleIds)
        .order('technique_position', { ascending: true });

      if (techniquesError) {
        logger.error('Error fetching techniques', { bundleIds, techniquesError });
        throw techniquesError;
      }

      // Группируем техники по пакетам
      const techniquesByBundle = new Map<string, typeof techniques>();
      for (const tech of techniques || []) {
        if (!techniquesByBundle.has(tech.special_bundle_id)) {
          techniquesByBundle.set(tech.special_bundle_id, []);
        }
        techniquesByBundle.get(tech.special_bundle_id)!.push(tech);
      }

      // Рассчитываем дни для каждой техники
      const result: SpecialBundleTechniqueWithDay[] = [];

      for (const placement of placements) {
        const bundleTechniques = techniquesByBundle.get(placement.special_bundle_id) || [];
        let cumulativeDelay = 0;

        for (const tech of bundleTechniques) {
          // Первая техника (position 1) открывается в start_unlock_offset_days
          // Последующие техники добавляют свои delay_days к накопленной задержке
          if (tech.technique_position === 1) {
            cumulativeDelay = 0;
          } else {
            cumulativeDelay += tech.delay_days;
          }

          const calculatedDay = placement.start_unlock_offset_days + cumulativeDelay;

          result.push({
            id: tech.id,
            technique_id: tech.technique_id,
            technique_position: tech.technique_position,
            delay_days: tech.delay_days,
            calculated_day: calculatedDay,
            special_bundle_id: tech.special_bundle_id,
            special_bundle_name: (placement.special_bundle as any)?.name || '',
            placement_id: placement.id,
            technique: tech.technique ? {
              id: (tech.technique as any).id,
              name: (tech.technique as any).name,
              cover_image: (tech.technique as any).cover_image_path,
              material_type: (tech.technique as any).material_type,
            } : undefined,
          });
        }
      }

      return result;
    },
    enabled: !!tariffStreamModuleId,
  });
}

/**
 * Информация о модуле для расчёта расположения техник
 */
export interface ModuleInfo {
  tariff_stream_module_id: string;
  order_num: number;
  access_duration_days: number | null;
  unlock_offset_days: number;
}

/**
 * Техника спец.пакета с рассчитанным целевым модулем и днём
 */
export interface SpecialBundleTechniqueAcrossModules extends SpecialBundleTechniqueWithDay {
  target_module_id: string; // ID модуля где техника должна отображаться
  day_in_target_module: number; // День в целевом модуле (0-indexed)
  source_module_id: string; // ID модуля где размещён пакет
}

/**
 * Получение техник спец.пакетов с расчётом целевого модуля
 * Учитывает что техника может выходить за пределы модуля и попадать в следующие
 */
export function useSpecialBundleTechniquesAcrossModules(modules: ModuleInfo[]) {
  return useQuery({
    queryKey: ['special-bundle-techniques-across-modules', modules.map(m => m.tariff_stream_module_id).join(',')],
    queryFn: async (): Promise<SpecialBundleTechniqueAcrossModules[]> => {
      if (!modules.length || !supabase) return [];

      const moduleIds = modules.map(m => m.tariff_stream_module_id);

      // Получаем все размещения по всем модулям
      const { data: placements, error: placementsError } = await supabase
        .from('special_bundle_placements')
        .select(`
          id,
          special_bundle_id,
          tariff_stream_module_id,
          start_unlock_offset_days,
          special_bundle:special_bundles(id, name)
        `)
        .in('tariff_stream_module_id', moduleIds);

      if (placementsError) {
        logger.error('Error fetching placements across modules', { moduleIds, placementsError });
        throw placementsError;
      }

      if (!placements || placements.length === 0) return [];

      // Получаем техники для всех размещённых пакетов
      const bundleIds = [...new Set(placements.map(p => p.special_bundle_id))];
      const { data: techniques, error: techniquesError } = await supabase
        .from('special_bundle_techniques')
        .select(`
          id,
          special_bundle_id,
          technique_id,
          technique_position,
          delay_days,
          technique:materials(id, name, cover_image_path, material_type)
        `)
        .in('special_bundle_id', bundleIds)
        .order('technique_position', { ascending: true });

      if (techniquesError) {
        logger.error('Error fetching techniques', { bundleIds, techniquesError });
        throw techniquesError;
      }

      // Группируем техники по пакетам
      const techniquesByBundle = new Map<string, typeof techniques>();
      for (const tech of techniques || []) {
        if (!techniquesByBundle.has(tech.special_bundle_id)) {
          techniquesByBundle.set(tech.special_bundle_id, []);
        }
        techniquesByBundle.get(tech.special_bundle_id)!.push(tech);
      }

      // Сортируем модули по order_num
      const sortedModules = [...modules].sort((a, b) => a.order_num - b.order_num);

      // Создаём карту модулей для быстрого доступа
      const moduleById = new Map(modules.map(m => [m.tariff_stream_module_id, m]));

      // Рассчитываем для каждой техники целевой модуль и день
      const result: SpecialBundleTechniqueAcrossModules[] = [];

      for (const placement of placements) {
        const sourceModule = moduleById.get(placement.tariff_stream_module_id);
        if (!sourceModule) continue;

        const bundleTechniques = techniquesByBundle.get(placement.special_bundle_id) || [];
        let cumulativeDelay = 0;

        for (const tech of bundleTechniques) {
          // Рассчитываем накопленную задержку
          if (tech.technique_position === 1) {
            cumulativeDelay = 0;
          } else {
            cumulativeDelay += tech.delay_days;
          }

          // Абсолютный день в исходном модуле (от начала модуля)
          const absoluteDayInSourceModule = placement.start_unlock_offset_days + cumulativeDelay;

          // Находим целевой модуль и день в нём
          let targetModule = sourceModule;
          let dayInTargetModule = absoluteDayInSourceModule;
          let remainingDays = absoluteDayInSourceModule;

          // Находим индекс исходного модуля
          const sourceModuleIndex = sortedModules.findIndex(m => m.tariff_stream_module_id === sourceModule.tariff_stream_module_id);

          // Проходим по модулям начиная с исходного
          for (let i = sourceModuleIndex; i < sortedModules.length; i++) {
            const currentModule = sortedModules[i];
            const moduleDays = currentModule.access_duration_days || 999; // Если не задано - считаем бесконечным

            if (remainingDays < moduleDays) {
              // Техника попадает в этот модуль
              targetModule = currentModule;
              dayInTargetModule = remainingDays;
              break;
            } else {
              // Переносим на следующий модуль
              remainingDays -= moduleDays;
            }
          }

          result.push({
            id: tech.id,
            technique_id: tech.technique_id,
            technique_position: tech.technique_position,
            delay_days: tech.delay_days,
            calculated_day: absoluteDayInSourceModule,
            special_bundle_id: tech.special_bundle_id,
            special_bundle_name: (placement.special_bundle as any)?.name || '',
            placement_id: placement.id,
            technique: tech.technique ? {
              id: (tech.technique as any).id,
              name: (tech.technique as any).name,
              cover_image: (tech.technique as any).cover_image_path,
              material_type: (tech.technique as any).material_type,
            } : undefined,
            target_module_id: targetModule.tariff_stream_module_id,
            day_in_target_module: dayInTargetModule,
            source_module_id: placement.tariff_stream_module_id,
          });
        }
      }

      return result;
    },
    enabled: modules.length > 0,
  });
}

/**
 * Получение всех размещений специальных пакетов для списка модулей тарифа
 * Используется для проверки, какие пакеты уже размещены в любом модуле тарифа
 */
export function useAllSpecialBundlePlacementsForTariff(tariffStreamModuleIds: string[]) {
  return useQuery({
    queryKey: ['special-bundle-placements-all', tariffStreamModuleIds],
    queryFn: async (): Promise<SpecialBundlePlacementWithDetails[]> => {
      if (!tariffStreamModuleIds.length || !supabase) return [];

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
        .in('tariff_stream_module_id', tariffStreamModuleIds);

      if (error) {
        logger.error('Error fetching all special bundle placements', { tariffStreamModuleIds, error });
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        special_bundle: item.special_bundle as any
      }));
    },
    enabled: tariffStreamModuleIds.length > 0,
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
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-techniques-across-modules'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-placements-all'], refetchType: 'active' });
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
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-techniques-across-modules'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['special-bundle-placements-all'], refetchType: 'active' });
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
