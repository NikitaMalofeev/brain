import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// Интерфейс для модуля потока пользователя
export interface UserStreamModule {
    module_id: string;
    module_name: string;
    module_order_num: number;
    module_color: string | null;
    module_cover_image: string | null; // Обложка модуля
    is_unlocked: boolean;
    total_lessons: number;
    completed_lessons: number;
    unlocked_lessons: number;
    overdue_lessons: number; // Просроченные уроки
    stream_id: string;
    stream_name: string;
    unlock_day: number; // С какого дня потока модуль доступен
    first_stage_id: number | null; // ID первой ступени для навигации
    // Поля для подсчёта заданий
    total_assignments: number;
    completed_assignments: number;
    overdue_assignments: number;
}

// Интерфейс совместимый с существующими компонентами (StageCard, RoadMap)
export interface StreamModuleAsStage {
    stage_id: number;
    stage_name: string;
    stage_order_num: number;
    is_unlocked: boolean;
    total_lessons: number;
    completed_lessons: number;
    unlocked_lessons: number;
    overdue_lessons: number; // Просроченные уроки
    cover_image_path?: string | null;
    // Дополнительные поля для stream_modules
    module_id: string;
    module_color: string | null;
    unlock_day: number; // С какого дня потока модуль доступен
    // Поля для подсчёта заданий
    total_assignments: number;
    completed_assignments: number;
    overdue_assignments: number;
}

interface UseUserStreamModulesResult {
    modules: UserStreamModule[];
    modulesAsStages: StreamModuleAsStage[];
    loading: boolean;
    error: Error | null;
    refresh: () => void;
}

/**
 * Хук для получения модулей потока пользователя
 * Заменяет useLibraryStages для работы с stream_modules вместо course_stages
 */
export function useUserStreamModules(userId: string | null | undefined): UseUserStreamModulesResult {
    const query = useQuery({
        queryKey: ['user-stream-modules', userId],
        queryFn: async (): Promise<UserStreamModule[]> => {
            if (!userId || !supabase) {
                logger.debug('Missing required parameters for user stream modules', { userId });
                return [];
            }

            logger.debug('Fetching user stream modules', { userId });

            const { data, error } = await supabase.rpc('get_user_stream_modules', {
                p_user_id: userId,
            });

            if (error) {
                logger.error('Error fetching user stream modules', { userId, error });
                throw error;
            }

            logger.debug('User stream modules fetched successfully', {
                userId,
                modulesCount: data?.length || 0
            });

            return data || [];
        },
        enabled: !!userId,
        retry: 2,
        staleTime: 2 * 60 * 1000, // 2 минуты
        gcTime: 5 * 60 * 1000, // 5 минут в кэше
    });

    // Конвертируем модули в формат совместимый со StageCard и RoadMap
    const modulesAsStages: StreamModuleAsStage[] = (query.data || []).map((module, index) => ({
        stage_id: module.first_stage_id || (index + 1), // Используем реальный ID ступени из БД
        stage_name: module.module_name,
        stage_order_num: module.module_order_num,
        is_unlocked: module.is_unlocked,
        total_lessons: module.total_lessons,
        completed_lessons: module.completed_lessons,
        unlocked_lessons: module.unlocked_lessons,
        overdue_lessons: module.overdue_lessons || 0,
        cover_image_path: module.module_cover_image || null, // Обложка модуля из БД
        // Дополнительные поля
        module_id: module.module_id,
        module_color: module.module_color,
        unlock_day: module.unlock_day,
        // Поля для заданий
        total_assignments: module.total_assignments || 0,
        completed_assignments: module.completed_assignments || 0,
        overdue_assignments: module.overdue_assignments || 0,
    }));

    return {
        modules: query.data || [],
        modulesAsStages,
        loading: query.isLoading,
        error: query.error,
        refresh: query.refetch,
    };
}
