import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';

interface UserStreamInfo {
  streamId: string;
  streamName: string;
  startDate: string;
  currentWeek: number;
  totalWeeks: number;
}

/**
 * Хук для получения информации о потоке пользователя и расчёта текущей недели обучения
 */
export function useUserStreamInfo(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['user-stream-info', userId],
    queryFn: async (): Promise<UserStreamInfo | null> => {
      if (!userId || !supabase) {
        return null;
      }

      // Получаем информацию о потоке пользователя
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('user_stream_enrollments')
        .select(`
          stream_id,
          streams (
            id,
            name,
            start_date
          )
        `)
        .eq('user_id', userId)
        .single();

      if (enrollmentError) {
        if (enrollmentError.code === 'PGRST116') {
          // Нет записи о потоке
          return null;
        }
        throw enrollmentError;
      }

      if (!enrollmentData || !enrollmentData.streams) {
        return null;
      }

      const stream = enrollmentData.streams as any;
      const startDate = new Date(stream.start_date);
      const now = new Date();

      // Рассчитываем текущую неделю (начиная с 1)
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksPassed = Math.floor((now.getTime() - startDate.getTime()) / msPerWeek);
      const currentWeek = Math.max(1, weeksPassed + 1);

      // Получаем общее количество недель на основе тарифа или количества модулей
      // По умолчанию 9 недель (стандартный курс)
      const { data: tariffData, error: tariffError } = await supabase
        .from('user_tariffs')
        .select(`
          tariffs (
            code
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      // Определяем количество недель по тарифу
      let totalWeeks = 9; // По умолчанию

      if (!tariffError && tariffData?.tariffs) {
        const tariffCode = (tariffData.tariffs as any).code?.toLowerCase() || '';

        // Определяем недели по коду тарифа
        if (tariffCode.includes('vip') || tariffCode.includes('premium')) {
          totalWeeks = 12;
        } else if (tariffCode.includes('standard') || tariffCode.includes('base')) {
          totalWeeks = 9;
        } else if (tariffCode.includes('lite') || tariffCode.includes('mini')) {
          totalWeeks = 6;
        }
      }

      return {
        streamId: stream.id,
        streamName: stream.name,
        startDate: stream.start_date,
        currentWeek: Math.min(currentWeek, totalWeeks), // Не больше общего количества
        totalWeeks,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
