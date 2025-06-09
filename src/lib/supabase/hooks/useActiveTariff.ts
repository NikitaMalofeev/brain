import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

export interface ActiveTariff {
    id: string;
    tariff_id: string;
    tariff_name: string;
    tariff_code: string;
    tariff_description: string | null;
    is_active: boolean;
    created_at: string;
}

/**
 * Хук для получения активного тарифа текущего пользователя
 * Используется для проверки доступа к приложению
 */
export function useActiveTariff(userId: string | null | undefined) {
    return useQuery({
        queryKey: ['active-tariff', userId],
        queryFn: async (): Promise<ActiveTariff | null> => {
            if (!userId || !supabase) {
                return null;
            }

            logger.debug('Fetching active tariff for user', { userId });

            const { data, error } = await supabase
                .from('user_tariffs')
                .select(`
          id,
          tariff_id,
          is_active,
          created_at,
          tariffs!inner (
            name,
            code,
            description
          )
        `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (error) {
                // Если пользователь не найден (PGRST116), это нормально - у него просто нет тарифа
                if (error.code === 'PGRST116') {
                    logger.debug('No active tariff found for user', { userId });
                    return null;
                }

                logger.error('Error fetching active tariff', { userId, error });
                throw error;
            }

            if (!data) {
                logger.debug('No active tariff data for user', { userId });
                return null;
            }

            const activeTariff: ActiveTariff = {
                id: data.id,
                tariff_id: data.tariff_id,
                tariff_name: data.tariffs.name,
                tariff_code: data.tariffs.code,
                tariff_description: data.tariffs.description,
                is_active: data.is_active,
                created_at: data.created_at,
            };

            logger.debug('Active tariff found', { userId, tariff: activeTariff.tariff_code });
            return activeTariff;
        },
        enabled: !!userId, // Запрос выполняется только если есть userId
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 минут - тарифы меняются редко
        gcTime: 10 * 60 * 1000, // 10 минут в кэше
    });
}

/**
 * Хук-помощник для быстрой проверки наличия активного тарифа
 * Возвращает простой boolean
 */
export function useHasActiveTariff(userId: string | null | undefined): boolean {
    const { data: activeTariff, isLoading } = useActiveTariff(userId);

    // Пока загружается - считаем что тариф есть (чтобы не показывать ошибку преждевременно)
    if (isLoading) {
        return true;
    }

    return !!activeTariff;
} 