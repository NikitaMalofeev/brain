// Хук для получения данных о ступенях курса для страницы "Библиотека"
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import { useQueryWithSupabaseFallback } from '@/hooks/useWithSupabaseFallback';

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
    unlock_condition_type_val: string | null;
    unlock_condition_value_val: string | null;
    cover_image_path: string | null; // Добавлено для поддержки обложек ступеней
}

// Мок-данные для offline/dev-режима
const mockLibraryStages: LibraryStageData[] = [
    {
        stage_id: 1,
        stage_name: 'Основы программирования мозга',
        stage_order_num: 1,
        stage_description: 'Изучение базовых принципов работы с сознанием',
        is_unlocked: true,
        total_lessons: 10,
        completed_lessons: 3,
        overdue_lessons: 1,
        unlock_condition_type_val: null,
        unlock_condition_value_val: null,
        cover_image_path: '/images/stage1.jpg',
    },
    {
        stage_id: 2,
        stage_name: 'Продвинутые техники',
        stage_order_num: 2,
        stage_description: 'Глубокое погружение в методики',
        is_unlocked: false,
        total_lessons: 15,
        completed_lessons: 0,
        overdue_lessons: 0,
        unlock_condition_type_val: 'lessons_completed',
        unlock_condition_value_val: '8',
        cover_image_path: '/images/stage2.jpg',
    },
    {
        stage_id: 3,
        stage_name: 'Мастерство',
        stage_order_num: 3,
        stage_description: 'Экспертный уровень владения техниками',
        is_unlocked: false,
        total_lessons: 20,
        completed_lessons: 0,
        overdue_lessons: 0,
        unlock_condition_type_val: 'stage_completed',
        unlock_condition_value_val: '2',
        cover_image_path: '/images/stage3.jpg',
    },
];

interface UseLibraryStagesResult {
    stages: LibraryStageData[];
    loading: boolean;
    error: Error | null;
    refresh: () => void; // Функция для принудительного обновления
}

/**
 * Хук для получения ступеней библиотеки с поддержкой fallback на мок-данные
 * Автоматически переключается на мок-данные когда Supabase недоступен
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

    const result = useQueryWithSupabaseFallback(query, mockLibraryStages);

    return {
        stages: result.data || [],
        loading: result.isLoading,
        error: result.error,
        refresh: result.refetch,
    };
};

export default useLibraryStages; 