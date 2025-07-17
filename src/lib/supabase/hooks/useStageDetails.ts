import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { User } from '@supabase/supabase-js';

// Тип данных урока
export interface LessonData {
    lesson_id: number;
    lesson_name: string;
    content_type: string;
    cover_image_path?: string; // Изменено: теперь хранится путь к файлу, а не полный URL
    order_num: number;
    has_assignment: boolean;
    is_completed: boolean;
    is_unlocked: boolean; // Добавляем поле для отслеживания разблокировки
    completion_date?: string;
    open_at?: string; // Добавляем время открытия урока
    deadline_at?: string; // Добавляем время дедлайна урока
    // Добавляем поля для submissions
    submission_status?: 'submitted' | 'pending_review' | 'approved' | 'rejected' | null;
    submission_id?: number;
    has_started?: boolean; // Новое поле - начал ли пользователь урок
}

// Тип данных ступени
export interface StageDetailsData {
    stage_id: number;
    stage_name: string;
    stage_description: string;
    total_lessons: number;
    completed_lessons: number;
    is_unlocked: boolean;
    lessons: LessonData[];
}

/**
 * Проверяет доступность урока с учетом временных ограничений и доступа по тарифам
 * @param lesson - данные урока
 * @param isAccessibleByTariff - доступен ли урок по тарифу
 * @returns true если урок доступен, false если заблокирован
 */
const isLessonAccessible = (
    lesson: any,
    isAccessibleByTariff: boolean
): boolean => {
    // Сначала проверяем временное ограничение
    const now = new Date();
    const openAt = lesson.open_at ? new Date(lesson.open_at) : null;

    if (openAt && now < openAt) {
        return false; // Урок еще не открыт по времени
    }

    // Затем проверяем доступ по тарифу
    return isAccessibleByTariff;
};

/**
 * Хук для получения деталей ступени и связанных уроков
 * @param user - пользователь Supabase
 * @param stageId - ID ступени
 */
const useStageDetails = (user: User | null, stageId: string | number) => {
    const [stageDetails, setStageDetails] = useState<StageDetailsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchStageDetails = async () => {
            if (!user || !stageId || !supabase) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Получаем данные ступени
                const { data: stageData, error: stageError } = await supabase
                    .from('course_stages')
                    .select('id, name, description')
                    .eq('id', stageId)
                    .single();

                if (stageError) {
                    throw new Error(`Ошибка загрузки ступени: ${stageError.message}`);
                }

                if (!stageData) {
                    throw new Error('Ступень не найдена');
                }

                // Получаем все уроки ступени с информацией о доступности (ОПТИМИЗИРОВАННО)
                const { data: lessonsWithAccess, error: lessonsError } = await supabase
                    .rpc('get_user_accessible_lessons_optimized', {
                        p_user_id: user.id,
                        p_stage_id: parseInt(stageId.toString())
                    });

                if (lessonsError) {
                    throw new Error(`Ошибка загрузки уроков: ${lessonsError.message}`);
                }

                // Получаем прогресс пользователя по урокам
                // ФИЛЬТРУЕМ: получаем прогресс только для доступных уроков
                const accessibleLessonIds = lessonsWithAccess?.filter(l => l.is_accessible)?.map(l => l.lesson_id) || [];
                const { data: progressData, error: progressError } = await supabase
                    .from('lesson_progress')
                    .select('lesson_id, completed_at, started_at, is_completed')
                    .eq('user_id', user.id)
                    .in('lesson_id', accessibleLessonIds);

                if (progressError) {
                    console.warn('Ошибка загрузки прогресса уроков:', progressError.message);
                }

                // Получаем submissions пользователя для уроков с заданиями
                // ФИЛЬТРУЕМ: получаем submissions только для доступных уроков с заданиями
                const accessibleLessonsWithAssignments = lessonsWithAccess?.filter(l => l.is_accessible && l.has_assignment) || [];
                const { data: submissionsData, error: submissionsError } = await supabase
                    .from('submissions')
                    .select('id, lesson_id, status')
                    .eq('user_id', user.id)
                    .in('lesson_id', accessibleLessonsWithAssignments.map(l => l.lesson_id));

                if (submissionsError) {
                    console.warn('Ошибка загрузки submissions:', submissionsError.message);
                }

                // Создаем мапы для быстрого доступа
                const progressMap = new Map();
                progressData?.forEach(progress => {
                    progressMap.set(progress.lesson_id, {
                        completed_at: progress.completed_at,
                        started_at: progress.started_at,
                        is_completed: progress.is_completed
                    });
                });

                const submissionsMap = new Map();
                submissionsData?.forEach(submission => {
                    submissionsMap.set(submission.lesson_id, {
                        id: submission.id,
                        status: submission.status
                    });
                });

                // Формируем данные уроков с улучшенной логикой статусов
                // ФИЛЬТРУЕМ: показываем только доступные уроки (is_accessible = true)
                const lessons: LessonData[] = lessonsWithAccess
                    ?.filter(lessonWithAccess => lessonWithAccess.is_accessible)
                    ?.map((lessonWithAccess) => {
                        const progress = progressMap.get(lessonWithAccess.lesson_id);
                        const submission = submissionsMap.get(lessonWithAccess.lesson_id);

                    // Определяем статус завершения
                    // ПРИОРИТЕТ 1: Флаг is_completed из lesson_progress (покрывает админское управление)
                    let isCompleted = !!progress?.is_completed;

                    // ПРИОРИТЕТ 2: Для уроков с заданием - также засчитываем approved submission
                        if (!isCompleted && lessonWithAccess.has_assignment) {
                        isCompleted = submission?.status === 'approved';
                    }

                    // ПРИОРИТЕТ 3: Для уроков без задания - также засчитываем completed_at
                        if (!isCompleted && !lessonWithAccess.has_assignment) {
                        isCompleted = !!progress?.completed_at;
                    }

                    // Используем централизованную функцию для проверки доступности
                        const isUnlocked = isLessonAccessible(lessonWithAccess, lessonWithAccess.is_accessible);

                    // Определяем, начал ли пользователь урок
                    const hasStarted = !!progress?.started_at || !!submission;

                    return {
                            lesson_id: lessonWithAccess.lesson_id,
                            lesson_name: lessonWithAccess.lesson_name,
                        content_type: 'mixed', // Теперь уроки могут содержать разные типы блоков
                            cover_image_path: lessonWithAccess.cover_image_path, // Используем путь к файлу из БД
                            order_num: lessonWithAccess.order_num,
                            has_assignment: lessonWithAccess.has_assignment || false,
                        is_completed: isCompleted,
                        is_unlocked: isUnlocked,
                        completion_date: progress?.completed_at,
                            open_at: lessonWithAccess.open_at,
                            deadline_at: lessonWithAccess.deadline_at,
                        submission_status: submission?.status || null,
                        submission_id: submission?.id,
                        has_started: hasStarted,
                    };
                }) || [];

                // Подсчитываем статистику
                const completedLessons = lessons.filter(l => l.is_completed).length;
                const totalLessons = lessons.length;

                // Формируем итоговые данные ступени
                const stageDetailsResult: StageDetailsData = {
                    stage_id: stageData.id,
                    stage_name: stageData.name,
                    stage_description: stageData.description || '',
                    total_lessons: totalLessons,
                    completed_lessons: completedLessons,
                    is_unlocked: true, // TODO: Логика разблокировки на основе условий
                    lessons,
                };

                setStageDetails(stageDetailsResult);
            } catch (err) {
                console.error('Ошибка в useStageDetails:', err);
                setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
            } finally {
                setLoading(false);
            }
        };

        fetchStageDetails();
    }, [user, stageId]);

    return { stageDetails, loading, error };
};

export default useStageDetails; 