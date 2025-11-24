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
 * Если нет записи - пытается получить курс из потока пользователя (fallback)
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

            // Сначала пробуем получить из user_course_enrollments
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

            if (!error && data) {
                // Получаем информацию о курсе
                const courseInfo = Array.isArray(data.courses) ? data.courses[0] : data.courses;

                const activeCourse: ActiveCourse = {
                    course_id: data.course_id,
                    course_title: courseInfo?.title || 'Неизвестный курс',
                    enrollment_date: data.enrollment_date,
                    is_active: data.is_active,
                };

                logger.debug('Active course found from enrollments', { userId, courseId: activeCourse.course_id });
                return activeCourse;
            }

            // Fallback: получаем курс из потока пользователя
            logger.debug('No enrollment found, trying to get course from stream', { userId });

            const { data: streamData, error: streamError } = await supabase
                .from('user_stream_enrollments')
                .select(`
                    stream_id,
                    enrolled_at,
                    streams (
                        id,
                        course_id,
                        courses (
                            id,
                            title
                        )
                    )
                `)
                .eq('user_id', userId)
                .single();

            if (streamError) {
                if (streamError.code === 'PGRST116') {
                    logger.debug('No stream enrollment found for user', { userId });
                    return null;
                }
                logger.error('Error fetching stream for course', { userId, error: streamError });
                return null;
            }

            if (!streamData || !streamData.streams) {
                logger.debug('No stream data for user', { userId });
                return null;
            }

            const stream = streamData.streams as any;
            if (!stream.course_id) {
                logger.debug('Stream has no course_id', { userId, streamId: stream.id });
                return null;
            }

            const courseInfo = Array.isArray(stream.courses) ? stream.courses[0] : stream.courses;

            const activeCourse: ActiveCourse = {
                course_id: stream.course_id,
                course_title: courseInfo?.title || 'Неизвестный курс',
                enrollment_date: streamData.enrolled_at || new Date().toISOString(),
                is_active: true,
            };

            logger.debug('Active course found from stream', { userId, courseId: activeCourse.course_id });
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
