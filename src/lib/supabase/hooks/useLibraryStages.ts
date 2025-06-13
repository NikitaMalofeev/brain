// Хук для получения данных о ступенях курса для страницы "Библиотека"
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// Интерфейс для данных ступени, которые мы ожидаем от RPC функции get_library_stages
// Важно, чтобы поля соответствовали тем, что возвращает функция
export interface LibraryStageData {
    stage_id: number; // ИСПРАВЛЕНО: теперь BIGINT из PostgreSQL
    stage_name: string;
    stage_order_num: number;
    stage_description: string | null;
    is_unlocked: boolean; // ИСПРАВЛЕНО: теперь всегда boolean, не null
    total_lessons: number;
    completed_lessons: number;
    overdue_lessons: number; // Добавлено для поддержки просроченных уроков
    unlocked_lessons: number; // НОВОЕ ПОЛЕ: количество неоткрытых уроков
    unlock_condition_type_val: string | null;
    unlock_condition_value_val: string | null;
    cover_image_path: string | null; // Добавлено для поддержки обложек ступеней
}



interface UseLibraryStagesResult {
    stages: LibraryStageData[];
    loading: boolean;
    error: Error | null;
    refresh: () => void; // Функция для принудительного обновления
}

/**
 * Хук для получения ступеней библиотеки
 */
const useLibraryStages = (userId: string | null, courseId: string | null): UseLibraryStagesResult => {
    const query = useQuery({
        queryKey: ['library-stages', userId, courseId],
        queryFn: async (): Promise<LibraryStageData[]> => {
            if (!userId || !courseId || !supabase) {
                logger.debug('Missing required parameters for library stages', { userId, courseId });
                return [];
            }

            logger.debug('Fetching library stages', { userId, courseId });

            // Вызываем RPC функцию get_library_stages из Supabase
            const { data, error } = await supabase.rpc('get_library_stages', {
                p_user_id: userId,
                p_course_id: courseId,
            });

            if (error) {
                logger.error('Error fetching library stages', { userId, courseId, error });
                throw error;
            }

            logger.debug('Library stages fetched successfully', {
                userId,
                courseId,
                stagesCount: data?.length || 0
            });

            return data || [];
        },
        enabled: !!userId && !!courseId, // Запрос выполняется только если есть userId и courseId
        retry: 2,
        staleTime: 2 * 60 * 1000, // 2 минуты - ступени могут обновляться при прохождении уроков
        gcTime: 5 * 60 * 1000, // 5 минут в кэше
    });

    return {
        stages: query.data || [],
        loading: query.isLoading,
        error: query.error,
        refresh: query.refetch,
    };
};

export default useLibraryStages; 