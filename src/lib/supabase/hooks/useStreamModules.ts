import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Хук для получения модулей потока
 */
export function useStreamModules(streamId: string | null) {
  return useQuery({
    queryKey: ['stream-modules', streamId],
    queryFn: async () => {
      if (!streamId || !supabase) {
        return [];
      }

      logger.debug('Fetching stream modules', { streamId });

      const { data, error } = await supabase
        .from('stream_modules')
        .select('*')
        .eq('stream_id', streamId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching stream modules', { streamId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
