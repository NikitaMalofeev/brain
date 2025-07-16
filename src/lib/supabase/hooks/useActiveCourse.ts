import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

export interface ActiveCourse {
    course_id: string;
    course_title: string;
    enrollment_date: string;
    is_active: boolean;
}

interface UseActiveCourseResult {
    activeCourse: ActiveCourse | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Хук для получения активного курса пользователя
 * Получает курс из user_course_enrollments где is_active = true
 */
export function useActiveCourse(userId: string | null | undefined): UseActiveCourseResult {
    const query = useQuery({
        queryKey: ['active-course', userId],
        queryFn: async (): Promise<ActiveCourse | null> => {
            if (!userId || !supabase) {
                logger.debug('Missing required parameters for active course', { userId });
                return null;
            }

            logger.debug('Fetching active course for user', { userId });

            const { data, error } = await supabase
                .from('user_course_enrollments')
                .select(`
                    course_id,
                    enrollment_date,
                    is_active,
                    courses (
                        id,
                        title
                    )
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (error) {
                // Если пользователь не найден (PGRST116), это нормально - у него просто нет активного курса
                if (error.code === 'PGRST116') {
                    logger.debug('No active course found for user', { userId });
                    return null;
                }

                logger.error('Error fetching active course', { userId, error });
                throw error;
            }

            if (!data) {
                logger.debug('No active course data for user', { userId });
                return null;
            }

            // Получаем информацию о курсе
            const courseInfo = Array.isArray(data.courses) ? data.courses[0] : data.courses;

            const activeCourse: ActiveCourse = {
                course_id: data.course_id,
                course_title: courseInfo?.title || 'Неизвестный курс',
                enrollment_date: data.enrollment_date,
                is_active: data.is_active,
            };

            logger.debug('Active course found', { userId, courseId: activeCourse.course_id, courseTitle: activeCourse.course_title });
            return activeCourse;
        },
        enabled: !!userId, // Запрос выполняется только если есть userId
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 минут - курсы меняются редко
        gcTime: 10 * 60 * 1000, // 10 минут в кэше
    });

    return {
        activeCourse: query.data || null,
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
} 