import { useState, useEffect } from 'react';
import { supabase } from '../client';

// Типы для детальной информации куратора
export interface CuratorBasicInfo {
    user_id: string;
    full_name: string;
    telegram_id: string;
    web_login?: string;
    role: string;
    created_at: string;
    last_login?: string;
    web_last_login?: string;
    assigned_students_count: number;
}

export interface CuratorStudent {
    user_id: string;
    full_name: string;
    telegram_id: string;
    course_title?: string;
    completed_lessons_percent: number;
    total_points: number;
    assigned_at: string; // Дата назначения куратору
}

export interface CuratorDetailsData {
    basicInfo: CuratorBasicInfo;
    students: CuratorStudent[];
}

export interface CuratorDetailsResult {
    curatorDetails: CuratorDetailsData | null;
    loading: boolean;
    error: Error | null;
    loadCuratorDetails: (curatorId: string) => Promise<void>;
}

/**
 * Хук для получения детальной информации по куратору
 * Только для админов - просмотр куратора и его учеников
 */
export function useCuratorDetails(): CuratorDetailsResult {
    const [curatorDetails, setCuratorDetails] = useState<CuratorDetailsData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const loadCuratorDetails = async (curatorId: string) => {
        if (!supabase || !curatorId) {
            setError(new Error('Supabase клиент не инициализирован или отсутствует ID куратора'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Загружаем основную информацию о кураторе
            const { data: curatorInfo, error: curatorError } = await supabase
                .from('users')
                .select(`
                    id,
                    first_name,
                    last_name,
                    telegram_id,
                    web_login,
                    role,
                    created_at,
                    last_login,
                    web_last_login
                `)
                .eq('id', curatorId)
                .in('role', ['curator', 'admin'])
                .single();

            if (curatorError) throw curatorError;
            if (!curatorInfo) throw new Error('Куратор не найден');

            // 2. Загружаем количество назначенных учеников
            const { data: studentsCountData, error: countError } = await supabase
                .from('user_curator')
                .select('*', { count: 'exact' })
                .eq('curator_id', curatorId);

            if (countError) throw countError;

            // 3. Загружаем детальную информацию об учениках куратора
            const { data: studentsData, error: studentsError } = await supabase
                .from('user_curator')
                .select(`
                    created_at,
                    users!user_curator_student_id_fkey (
                        id,
                        first_name,
                        last_name,
                        telegram_id,
                        total_points,
                        user_course_enrollments!inner (
                            courses (
                                id,
                                title
                            )
                        )
                    )
                `)
                .eq('curator_id', curatorId);

            if (studentsError) throw studentsError;

            // 4. Для каждого ученика рассчитываем процент выполненных уроков
            const studentsWithProgress = await Promise.all(
                (studentsData || []).map(async (studentRelation: any) => {
                    const student = studentRelation.users;
                    if (!student) return null;

                    // Получаем активный курс ученика
                    const activeCourse = student.user_course_enrollments?.[0]?.courses;
                    let completedPercent = 0;

                    if (activeCourse && supabase) {
                        // Получаем прогресс по урокам
                        const { data: progressData, error: progressError } = await supabase
                            .from('lesson_progress')
                            .select(`
                                is_completed,
                                lessons!inner (
                                    has_assignment,
                                    course_stages!inner (
                                        course_id
                                    )
                                )
                            `)
                            .eq('user_id', student.id)
                            .eq('lessons.course_stages.course_id', activeCourse.id);

                        if (!progressError && progressData) {
                            const totalLessonsWithAssignment = progressData.filter(
                                (p: any) => p.lessons?.has_assignment
                            ).length;
                            const completedLessons = progressData.filter(
                                (p: any) => p.is_completed && p.lessons?.has_assignment
                            ).length;

                            completedPercent = totalLessonsWithAssignment > 0
                                ? Math.round((completedLessons / totalLessonsWithAssignment) * 100)
                                : 0;
                        }
                    }

                    return {
                        user_id: student.id,
                        full_name: `${student.first_name} ${student.last_name || ''}`.trim(),
                        telegram_id: student.telegram_id,
                        course_title: activeCourse?.title || 'Курс не найден',
                        completed_lessons_percent: completedPercent,
                        total_points: student.total_points || 0,
                        assigned_at: studentRelation.created_at,
                    };
                })
            );

            // Фильтруем null значения
            const validStudents = studentsWithProgress.filter(s => s !== null) as CuratorStudent[];

            // Формируем результат
            const basicInfo: CuratorBasicInfo = {
                user_id: curatorInfo.id,
                full_name: `${curatorInfo.first_name} ${curatorInfo.last_name || ''}`.trim(),
                telegram_id: curatorInfo.telegram_id,
                web_login: curatorInfo.web_login,
                role: curatorInfo.role,
                created_at: curatorInfo.created_at,
                last_login: curatorInfo.last_login,
                web_last_login: curatorInfo.web_last_login,
                assigned_students_count: studentsCountData?.length || 0,
            };

            setCuratorDetails({
                basicInfo,
                students: validStudents,
            });

        } catch (err) {
            console.error('Ошибка при загрузке детальной информации куратора:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    return {
        curatorDetails,
        loading,
        error,
        loadCuratorDetails,
    };
} 