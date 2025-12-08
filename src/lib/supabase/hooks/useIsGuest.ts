import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Хук для определения, является ли пользователь гостем
 * Гость = пользователь без активного тарифа или с истекшим access_till
 */
export function useIsGuest(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['is-guest', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId || !supabase) {
        // Если нет userId - считаем гостем
        return true;
      }

      logger.debug('Checking if user is guest', { userId });

      // Вызываем RPC функцию is_user_guest
      const { data, error } = await supabase.rpc('is_user_guest', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('Error checking guest status', { userId, error });
        // В случае ошибки, считаем пользователя гостем для безопасности
        return true;
      }

      logger.debug('Guest status checked', { userId, isGuest: data });
      return data ?? true;
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 3 * 60 * 1000, // 3 минуты - статус гостя меняется редко
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });

  return query;
}

/**
 * Хук-помощник для быстрой проверки гостевого статуса
 * Возвращает boolean
 *
 * @returns true если пользователь гость, false если ученик/админ/куратор
 */
export function useGuestStatus(userId: string | null | undefined): {
  isGuest: boolean;
  isLoading: boolean;
} {
  const { data: isGuest, isLoading } = useIsGuest(userId);

  return {
    isGuest: isGuest ?? true, // По умолчанию считаем гостем
    isLoading,
  };
}
