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

/**
 * Хук-хелпер для фильтрации техник по категориям
 * Разделяет техники на доступные, заблокированные и те, к которым есть доступ
 *
 * @param userId - ID пользователя
 * @returns Объект с отфильтрованными массивами техник
 */
export function useTechniquesFiltered(userId: string | null | undefined) {
  const { data: techniques, isLoading, error } = useTechniques(userId);

  // Фильтруем техники по категориям
  const availableTechniques = techniques?.filter(
    (t) => t.can_purchase && !t.has_access
  ) || [];

  const lockedTechniques = techniques?.filter(
    (t) => !t.can_purchase && !t.has_access
  ) || [];

  const myTechniques = techniques?.filter(
    (t) => t.has_access
  ) || [];

  // Бесплатные техники (доступны всем, включая гостей)
  const freeTechniques = techniques?.filter(
    (t) => t.status === 'free'
  ) || [];

  return {
    techniques: techniques || [],
    availableTechniques,
    lockedTechniques,
    myTechniques,
    freeTechniques,
    isLoading,
    error,
  };
}
