import { useState, useEffect } from 'react';
import { supabase } from '../client';

// Типы для детальной информации ученика
export interface StudentBasicInfo {
    user_id: string;
    full_name: string;
    telegram_id: string;
    web_login?: string | null;
    role: string;
    created_at: string;
    last_login?: string | null;
    web_last_login?: string | null;
    total_points: number;
    // Информация о текущем тарифе
    current_tariff_id?: string | null;
    current_tariff_name?: string | null;
    current_tariff_code?: string | null;
}

export interface StudentCourse {
    course_id: string;
    course_title: string;
    enrollment_date: string;
    is_active: boolean;
}

export interface StudentLessonProgress {
    stage_id: number;
    stage_name: string;
    lesson_id: number;
    lesson_name: string;
    open_at?: string | null;
    deadline_at?: string | null;
    is_completed: boolean;
    completed_at?: string | null;
    has_assignment: boolean;
}

export interface StudentMaterialView {
    material_id: string;
    material_name: string;
    material_type: string;
    first_viewed_at?: string | null;
    is_completed: boolean;
    last_viewed_at?: string | null;
}

export interface StudentDetailsData {
    basicInfo: StudentBasicInfo;
    courses: StudentCourse[];
    lessonProgress: StudentLessonProgress[];
    materialViews: StudentMaterialView[];
    progressStats: {
        totalLessonsInCourse: number;
        completedLessons: number;
        completedLessonsPercent: number;
    };
}

export interface StudentDetailsResult {
    studentDetails: StudentDetailsData | null;
    loading: boolean;
    error: Error | null;
    loadStudentDetails: (studentId: string) => Promise<void>;
    // Добавляем функцию для назначения тарифа
    assignStudentTariff: (studentId: string, tariffId: string) => Promise<void>;
    assigningTariff: boolean;
}

/**
 * Хук для получения детальной информации по ученику
 * Только для админов и кураторов
 */
export function useStudentDetails(): StudentDetailsResult {
    const [studentDetails, setStudentDetails] = useState<StudentDetailsData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [assigningTariff, setAssigningTariff] = useState<boolean>(false);

    const loadStudentDetails = async (studentId: string) => {
        if (!supabase || !studentId) {
            setError(new Error('Supabase клиент не инициализирован или отсутствует ID ученика'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Загружаем основную информацию о пользователе
            const { data: userInfo, error: userError } = await supabase
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
                    web_last_login,
                    total_points
                `)
                .eq('id', studentId)
                .eq('role', 'user')
                .single();

            if (userError) throw userError;
            if (!userInfo) throw new Error('Ученик не найден');

            // 1.1. Загружаем информацию о текущем тарифе пользователя
            const { data: currentTariffData, error: tariffError } = await supabase
                .from('user_tariffs')
                .select(`
                    tariff_id,
                    tariffs (
                        id,
                        name,
                        code
                    )
                `)
                .eq('user_id', studentId)
                .eq('is_active', true)
                .single();

            // Игнорируем ошибку если тариф не найден (пользователь может не иметь тарифа)
            let tariffInfo = null;
            if (!tariffError && currentTariffData && currentTariffData.tariffs) {
                tariffInfo = currentTariffData.tariffs as any;
            }

            // 2. Загружаем курсы ученика
            const { data: coursesData, error: coursesError } = await supabase
                .from('user_course_enrollments')
                .select(`
                    course_id,
                    enrollment_date,
                    is_active,
                    courses (
                        title
                    )
                `)
                .eq('user_id', studentId);

            if (coursesError) throw coursesError;

            // 3. Загружаем прогресс по урокам активного курса
            const activeCourse = coursesData?.find(c => c.is_active);
            let lessonProgressData: StudentLessonProgress[] = [];
            let progressStats = {
                totalLessonsInCourse: 0,
                completedLessons: 0,
                completedLessonsPercent: 0,
            };

            console.log('Active course:', activeCourse);

            if (activeCourse) {
                // 1. Получаем ВЕСЬ прогресс ученика по урокам
                const { data: progressData, error: progressError } = await supabase
                    .from('lesson_progress')
                    .select('lesson_id, is_completed, completed_at')
                    .eq('user_id', studentId);

                if (progressError) throw progressError;
                console.log('All progress data for student:', progressData);

                // 3. Загружаем все стадии, принадлежащие АКТИВНОМУ курсу
                const { data: stagesOfActiveCourse, error: stagesError } = await supabase
                    .from('course_stages')
                    .select('id, name')
                    .eq('course_id', activeCourse.course_id);

                if (stagesError) throw stagesError;
                console.log('Stages of active course:', stagesOfActiveCourse);
                const activeCourseStageIds = stagesOfActiveCourse?.map(s => s.id) || [];

                // NEW: Получаем общее количество ВСЕХ уроков в активном курсе
                let totalLessonsInCourse = 0;
                if (activeCourseStageIds.length > 0) {
                    const { count, error: countError } = await supabase
                        .from('lessons')
                        .select('id', { count: 'exact', head: true }) // Только количество
                        .in('stage_id', activeCourseStageIds);

                    if (countError) throw countError;
                    totalLessonsInCourse = count || 0;
                }
                console.log('Total lessons in active course:', totalLessonsInCourse);

                if (progressData && progressData.length > 0) {
                    const lessonIdsWithProgress = progressData.map(p => p.lesson_id);

                    // 2. Загружаем детали уроков, по которым есть прогресс (включая их stage_id)
                    const { data: lessonsDetails, error: lessonsDetailsError } = await supabase
                        .from('lessons')
                        .select('id, name, open_at, deadline_at, has_assignment, stage_id')
                        .in('id', lessonIdsWithProgress);

                    if (lessonsDetailsError) throw lessonsDetailsError;
                    console.log('Details for lessons with progress:', lessonsDetails);

                    // 4. Фильтруем уроки: оставляем только те, что принадлежат стадиям активного курса
                    const relevantLessons = (lessonsDetails || []).filter(lesson =>
                        lesson.stage_id && activeCourseStageIds.includes(lesson.stage_id)
                    );
                    console.log('Relevant lessons for active course:', relevantLessons);

                    // 5. Формируем lessonProgressData
                    const mappedLessonProgressItems = relevantLessons.map(lesson => {
                        const progress = progressData.find(p => p.lesson_id === lesson.id);
                        const stageInfo = stagesOfActiveCourse?.find(s => s.id === lesson.stage_id);

                        if (!progress) return null; // На всякий случай, хотя не должно произойти

                        return {
                            stage_id: lesson.stage_id!,
                            stage_name: stageInfo?.name || 'Стадия не найдена в активном курсе',
                            lesson_id: lesson.id,
                            lesson_name: lesson.name,
                            open_at: lesson.open_at,
                            deadline_at: lesson.deadline_at,
                            is_completed: progress.is_completed || false,
                            completed_at: progress.completed_at,
                            has_assignment: lesson.has_assignment || false,
                        };
                    });
                    lessonProgressData = mappedLessonProgressItems.filter(lp => lp !== null) as StudentLessonProgress[];
                } else {
                    console.log('No lesson progress found for user');
                    lessonProgressData = [];
                }

                console.log('Final lesson progress data for student:', lessonProgressData);

                // Подсчитываем статистику уроков
                progressStats.totalLessonsInCourse = totalLessonsInCourse;
                const completedLessons = lessonProgressData.filter(l => l.is_completed).length;
                progressStats.completedLessons = completedLessons;
                progressStats.completedLessonsPercent = totalLessonsInCourse > 0
                    ? Math.round((completedLessons / totalLessonsInCourse) * 100)
                    : 0;
                console.log('Lessons stats:', { totalLessons: progressStats.totalLessonsInCourse, completedLessons, percent: progressStats.completedLessonsPercent });
            }

            // Загрузка данных для списка материалов (остается, т.к. materialViews нужен)
            const { data: allMaterialsData, error: allMaterialsError } = await supabase
                .from('materials')
                .select(`
                    id,
                    name,
                    material_type
                `);

            if (allMaterialsError) throw allMaterialsError;
            console.log('All materials:', allMaterialsData);

            const { data: userViewsData, error: userViewsError } = await supabase
                .from('user_material_views')
                .select('material_id, first_viewed_at, last_viewed_at, is_completed')
                .eq('user_id', studentId);

            if (userViewsError) throw userViewsError;
            console.log('User material views:', userViewsData);

            const materialViews = (userViewsData || [])
                .map(userView => {
                    const material = allMaterialsData?.find(m => m.id === userView.material_id);
                    if (!material) return null;

                    return {
                        material_id: material.id,
                        material_name: material.name,
                        material_type: material.material_type,
                        first_viewed_at: userView.first_viewed_at || undefined,
                        last_viewed_at: userView.last_viewed_at || undefined,
                        is_completed: userView.is_completed || false,
                    };
                })
                .filter(view => view !== null) as StudentMaterialView[];
            console.log('Final material views:', materialViews);

            // Формируем результат
            const basicInfo: StudentBasicInfo = {
                user_id: userInfo.id,
                full_name: `${userInfo.first_name} ${userInfo.last_name || ''}`.trim(),
                telegram_id: userInfo.telegram_id,
                web_login: userInfo.web_login,
                role: userInfo.role,
                created_at: userInfo.created_at,
                last_login: userInfo.last_login,
                web_last_login: userInfo.web_last_login,
                total_points: userInfo.total_points,
                current_tariff_id: tariffInfo?.id || null,
                current_tariff_name: tariffInfo?.name || null,
                current_tariff_code: tariffInfo?.code || null,
            };

            const courses: StudentCourse[] = (coursesData || []).map(course => ({
                course_id: course.course_id,
                course_title: course.courses?.[0]?.title || 'Неизвестный курс',
                enrollment_date: course.enrollment_date,
                is_active: course.is_active,
            }));

            setStudentDetails({
                basicInfo,
                courses,
                lessonProgress: lessonProgressData,
                materialViews,
                progressStats,
            });

        } catch (err) {
            console.error('Ошибка при загрузке детальной информации ученика:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Функция для назначения тарифа пользователю
     */
    const assignStudentTariff = async (studentId: string, tariffId: string) => {
        if (!supabase || !studentId || !tariffId) {
            throw new Error('Supabase клиент не инициализирован или отсутствуют параметры');
        }

        try {
            setAssigningTariff(true);
            setError(null);

            // 1. Деактивируем все старые тарифы пользователя
            const { error: deactivateError } = await supabase
                .from('user_tariffs')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('user_id', studentId)
                .eq('is_active', true);

            if (deactivateError) throw deactivateError;

            // 2. Создаем новую запись с активным тарифом
            const { error: insertError } = await supabase
                .from('user_tariffs')
                .insert([{
                    user_id: studentId,
                    tariff_id: tariffId,
                    is_active: true,
                }]);

            if (insertError) throw insertError;

            // 3. Перезагружаем детали ученика для обновления информации о тарифе
            await loadStudentDetails(studentId);

        } catch (err) {
            console.error('Ошибка при назначении тарифа:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка при назначении тарифа'));
        } finally {
            setAssigningTariff(false);
        }
    };

    return {
        studentDetails,
        loading,
        error,
        loadStudentDetails,
        assignStudentTariff,
        assigningTariff,
    };
} 