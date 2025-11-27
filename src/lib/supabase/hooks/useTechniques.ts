import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import { TechniqueWithAccess } from '../types';

/**
 * Хук для получения списка техник с информацией о доступе пользователя
 * Вызывает RPC функцию get_techniques_with_access
 *
 * @param userId - ID пользователя (null для гостей)
 * @returns Query с массивом техник и информацией о доступе
 */
export function useTechniques(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['techniques', userId],
    queryFn: async (): Promise<TechniqueWithAccess[]> => {
      if (!supabase) {
        logger.error('Supabase client not initialized');
        return [];
      }

      logger.debug('Fetching techniques with access and schedule', { userId });

      // Сначала пробуем новую функцию с расписанием модулей
      const { data: scheduleData, error: scheduleError } = await supabase.rpc(
        'get_user_techniques_with_schedule',
        { p_user_id: userId || null }
      );

      // Если новая функция работает - используем её
      if (!scheduleError && scheduleData) {
        logger.debug('Techniques with schedule fetched successfully', {
          userId,
          count: scheduleData?.length || 0
        });
        return (scheduleData as TechniqueWithAccess[]) || [];
      }

      // Fallback на старую функцию если новая не работает
      logger.warn('New function not found, falling back to get_techniques_with_access', {
        userId,
        error: scheduleError
      });

      const { data, error } = await supabase.rpc('get_techniques_with_access', {
        p_user_id: userId || null,
      });

      if (error) {
        logger.error('Error fetching techniques', { userId, error });
        throw error;
      }

      logger.debug('Techniques fetched successfully (fallback)', {
        userId,
        count: data?.length || 0
      });

      return (data as TechniqueWithAccess[]) || [];
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });

  return query;
}

// Интерфейс для группы техник по пакету
export interface BundleGroup {
  bundleId: string;
  bundleName: string;
  techniques: TechniqueWithAccess[];
}

/**
 * Хук-хелпер для фильтрации техник по категориям
 * Разделяет техники на доступные, заблокированные и те, к которым есть доступ
 *
 * Категории:
 * - myTechniques: техники с has_access = true (из пакетов, модулей, прямого доступа)
 * - availableTechniques: can_purchase = true И is_unlocked = true (можно купить прямо сейчас)
 * - lockedTechniques: is_unlocked = false ИЛИ (can_purchase = false И has_access = false)
 * - freeTechniques: status = 'free'
 * - bundleGroups: техники сгруппированные по пакетам
 *
 * @param userId - ID пользователя
 * @returns Объект с отфильтрованными массивами техник
 */
export function useTechniquesFiltered(userId: string | null | undefined) {
  const { data: techniques, isLoading, error } = useTechniques(userId);

  // Мои техники - те, к которым есть доступ (has_access = true), НЕ из пакетов
  const myTechniques = techniques?.filter(
    (t) => t.has_access && t.user_access_source !== 'bundle'
  ) || [];

  // Техники из пакетов с доступом - группируем по bundle_name
  const bundleTechniquesWithAccess = techniques?.filter(
    (t) => t.has_access && t.user_access_source === 'bundle' && t.bundle_id
  ) || [];

  // Группируем техники из пакетов по bundle_id
  const bundleGroupsMap = new Map<string, BundleGroup>();
  bundleTechniquesWithAccess.forEach((t) => {
    if (t.bundle_id && t.bundle_name) {
      if (!bundleGroupsMap.has(t.bundle_id)) {
        bundleGroupsMap.set(t.bundle_id, {
          bundleId: t.bundle_id,
          bundleName: t.bundle_name,
          techniques: [],
        });
      }
      bundleGroupsMap.get(t.bundle_id)!.techniques.push(t);
    }
  });
  const bundleGroups = Array.from(bundleGroupsMap.values());

  // Бесплатные техники - для таба "Мои техники" (все бесплатные доступны пользователю)
  const myFreeTechniques = techniques?.filter(
    (t) => t.status === 'free'
  ) || [];

  // Бесплатные техники - для таба "Все техники" в секции "Бесплатные" (те же самые)
  const freeTechniques = techniques?.filter(
    (t) => t.status === 'free'
  ) || [];

  // К покупке - можно купить, нет доступа, не бесплатная, разблокирована
  const availableTechniques = techniques?.filter(
    (t) => !t.has_access && t.can_purchase && t.status !== 'free' && t.is_unlocked !== false
  ) || [];

  // Заблокированные (не из модуля) - нет доступа, не разблокирована, НЕ из модуля
  const lockedTechniques = techniques?.filter(
    (t) => !t.has_access && t.is_unlocked === false && t.user_access_source !== 'module'
  ) || [];

  // Техники из модулей (заблокированные по времени) - из модуля И ещё НЕ разблокированы (is_unlocked = false)
  const moduleTechniques = techniques?.filter(
    (t) => !t.has_access && t.user_access_source === 'module' && t.is_unlocked === false
  ) || [];

  return {
    techniques: techniques || [],
    availableTechniques,
    lockedTechniques,
    myTechniques,
    freeTechniques,
    myFreeTechniques,
    moduleTechniques,
    bundleGroups,
    isLoading,
    error,
  };
}
