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

                // Получаем все уроки ступени
                const { data: allLessonsData, error: allLessonsError } = await supabase
                    .from('lessons')
                    .select(`
                        id,
                        name,
                        description,
                        order_num,
                        has_assignment,
                        cover_image_path,
                        open_at,
                        deadline_at
                    `)
                    .eq('stage_id', stageId)
                    .order('order_num');

                if (allLessonsError) {
                    throw new Error(`Ошибка загрузки уроков: ${allLessonsError.message}`);
                }

                // Получаем прогресс пользователя по урокам
                const { data: progressData, error: progressError } = await supabase
                    .from('lesson_progress')
                    .select('lesson_id, completed_at, started_at')
                    .eq('user_id', user.id)
                    .in('lesson_id', allLessonsData?.map(l => l.id) || []);

                if (progressError) {
                    console.warn('Ошибка загрузки прогресса уроков:', progressError.message);
                }

                // Получаем submissions пользователя для уроков с заданиями
                const lessonsWithAssignments = allLessonsData?.filter(l => l.has_assignment) || [];
                const { data: submissionsData, error: submissionsError } = await supabase
                    .from('submissions')
                    .select('id, lesson_id, status')
                    .eq('user_id', user.id)
                    .in('lesson_id', lessonsWithAssignments.map(l => l.id));

                if (submissionsError) {
                    console.warn('Ошибка загрузки submissions:', submissionsError.message);
                }

                // Создаем мапы для быстрого доступа
                const progressMap = new Map();
                progressData?.forEach(progress => {
                    progressMap.set(progress.lesson_id, {
                        completed_at: progress.completed_at,
                        started_at: progress.started_at
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
                const lessons: LessonData[] = allLessonsData?.map((lesson, index) => {
                    const progress = progressMap.get(lesson.id);
                    const submission = submissionsMap.get(lesson.id);

                    // Определяем статус завершения
                    let isCompleted = false;
                    if (lesson.has_assignment) {
                        // Для урока с заданием - завершен только если задание одобрено
                        isCompleted = submission?.status === 'approved';
                    } else {
                        // Для урока без задания - завершен если есть completed_at
                        isCompleted = !!progress?.completed_at;
                    }

                    // Логика разблокировки: уроки открываются только по времени
                    const now = new Date();
                    const openAt = lesson.open_at ? new Date(lesson.open_at) : null;
                    const isUnlocked = !openAt || now >= openAt;

                    // Определяем, начал ли пользователь урок
                    const hasStarted = !!progress?.started_at || !!submission;

                    return {
                        lesson_id: lesson.id,
                        lesson_name: lesson.name,
                        content_type: 'mixed', // Теперь уроки могут содержать разные типы блоков
                        cover_image_path: lesson.cover_image_path, // Используем путь к файлу из БД
                        order_num: lesson.order_num,
                        has_assignment: lesson.has_assignment || false,
                        is_completed: isCompleted,
                        is_unlocked: isUnlocked,
                        completion_date: progress?.completed_at,
                        open_at: lesson.open_at,
                        deadline_at: lesson.deadline_at,
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