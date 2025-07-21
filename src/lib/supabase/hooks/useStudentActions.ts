import { useState } from 'react';
import { supabase } from '../client';

export interface StudentActionsResult {
    loading: boolean;
    error: Error | null;
    resetLessonProgress: (studentId: string, lessonId: number) => Promise<void>;
    markMaterialViewed: (studentId: string, materialId: string) => Promise<void>;
    resetMaterialView: (studentId: string, materialId: string) => Promise<void>;
    updateStudentPoints: (studentId: string, newPoints: number) => Promise<void>;
    updatePersonalChatLink: (studentId: string, chatLink: string | null) => Promise<void>;
    assignCourseToStudent: (studentId: string, courseId: string) => Promise<void>;
    // Новые функции для ручного управления прогрессом уроков
    setLessonProgress: (studentId: string, lessonId: number, isCompleted: boolean) => Promise<void>;
    markLessonAsCompleted: (studentId: string, lessonId: number) => Promise<void>;
    markLessonAsIncomplete: (studentId: string, lessonId: number) => Promise<void>;
}

/**
 * Хук для выполнения действий с учениками
 * Только для админов - управление прогрессом и баллами учеников
 */
export function useStudentActions(): StudentActionsResult {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    // Сброс прогресса урока для ученика
    const resetLessonProgress = async (studentId: string, lessonId: number): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            console.log('Сброс прогресса урока:', { studentId, lessonId });

            // Сначала получаем информацию о начисленных баллах за этот урок
            const { data: submissionsToDelete, error: submissionsQueryError } = await supabase
                .from('submissions')
                .select('points_awarded')
                .eq('user_id', studentId)
                .eq('lesson_id', lessonId);

            if (submissionsQueryError) {
                console.error('Ошибка при получении информации о баллах:', submissionsQueryError);
                throw submissionsQueryError;
            }

            // Подсчитываем общее количество баллов для списания
            const totalPointsToDeduct = submissionsToDelete?.reduce((sum, submission) => sum + (submission.points_awarded || 0), 0) || 0;
            console.log('Баллов к списанию:', totalPointsToDeduct);

            // Удаляем запись прогресса по уроку
            const { data: progressData, error: progressError } = await supabase
                .from('lesson_progress')
                .delete()
                .eq('user_id', studentId)
                .eq('lesson_id', lessonId)
                .select();

            if (progressError) {
                console.error('Ошибка при удалении lesson_progress:', progressError);
                throw progressError;
            }

            console.log('Удалены записи lesson_progress:', progressData);

            // Удаляем связанные сдачи
            const { data: submissionData, error: submissionError } = await supabase
                .from('submissions')
                .delete()
                .eq('user_id', studentId)
                .eq('lesson_id', lessonId)
                .select();

            if (submissionError) {
                console.error('Ошибка при удалении submissions:', submissionError);
                throw submissionError;
            }

            console.log('Удалены записи submissions:', submissionData);

            // Списываем баллы у пользователя, если они были начислены
            if (totalPointsToDeduct > 0) {
                const { data: userData, error: userQueryError } = await supabase
                    .from('users')
                    .select('total_points')
                    .eq('id', studentId)
                    .single();

                if (userQueryError) {
                    console.error('Ошибка при получении баллов пользователя:', userQueryError);
                    throw userQueryError;
                }

                const newTotalPoints = Math.max(0, (userData.total_points || 0) - totalPointsToDeduct);

                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        total_points: newTotalPoints,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', studentId);

                if (updateError) {
                    console.error('Ошибка при обновлении баллов пользователя:', updateError);
                    throw updateError;
                }

                console.log(`Списано баллов: ${totalPointsToDeduct}, новый баланс: ${newTotalPoints}`);
            }

            console.log('Прогресс урока успешно сброшен');

        } catch (err) {
            console.error('Ошибка при сбросе прогресса урока:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при сбросе прогресса урока'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Отметить материал как просмотренный
    const markMaterialViewed = async (studentId: string, materialId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Вставляем или обновляем запись о просмотре материала
            const { error: viewError } = await supabase
                .from('user_material_views')
                .upsert({
                    user_id: studentId,
                    material_id: materialId,
                    is_completed: true,
                    last_viewed_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,material_id'
                });

            if (viewError) throw viewError;

        } catch (err) {
            console.error('Ошибка при отметке материала просмотренным:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при отметке материала просмотренным'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Сбросить отметку просмотра материала
    const resetMaterialView = async (studentId: string, materialId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Удаляем запись о просмотре материала
            const { error: viewError } = await supabase
                .from('user_material_views')
                .delete()
                .eq('user_id', studentId)
                .eq('material_id', materialId);

            if (viewError) throw viewError;

        } catch (err) {
            console.error('Ошибка при сбросе просмотра материала:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при сбросе просмотра материала'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Обновить баллы ученика
    const updateStudentPoints = async (studentId: string, newPoints: number): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Обновляем поле total_points у пользователя
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    total_points: newPoints,
                    updated_at: new Date().toISOString()
                })
                .eq('id', studentId)
                .eq('role', 'user'); // Дополнительная проверка, что это ученик

            if (updateError) throw updateError;

        } catch (err) {
            console.error('Ошибка при обновлении баллов ученика:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при обновлении баллов ученика'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Обновить ссылку на личный чат ученика
    const updatePersonalChatLink = async (studentId: string, chatLink: string | null): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Обновляем поле personal_chat_link у пользователя
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    personal_chat_link: chatLink,
                    updated_at: new Date().toISOString()
                })
                .eq('id', studentId);

            if (updateError) throw updateError;

        } catch (err) {
            console.error('Ошибка при обновлении ссылки на личный чат:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при обновлении ссылки на личный чат'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Универсальная функция для установки прогресса урока
    const setLessonProgress = async (studentId: string, lessonId: number, isCompleted: boolean): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            const now = new Date().toISOString();

            console.log('Устанавливаем прогресс урока:', { studentId, lessonId, isCompleted });

            // Вставляем или обновляем запись прогресса урока
            const { error: progressError } = await supabase
                .from('lesson_progress')
                .upsert({
                    user_id: studentId,
                    lesson_id: lessonId,
                    is_completed: isCompleted,
                    completed_at: isCompleted ? now : null,
                    started_at: now, // Устанавливаем started_at если записи не было
                    submission_id: null // Ручное управление не связано с submissions
                }, {
                    onConflict: 'user_id,lesson_id',
                    ignoreDuplicates: false // Обновляем существующие записи
                });

            if (progressError) throw progressError;

            console.log('Прогресс урока успешно установлен');

        } catch (err) {
            console.error('Ошибка при установке прогресса урока:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при установке прогресса урока'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Обертка для отметки урока как завершенного
    const markLessonAsCompleted = async (studentId: string, lessonId: number): Promise<void> => {
        return setLessonProgress(studentId, lessonId, true);
    };

    // Обертка для отметки урока как незавершенного
    const markLessonAsIncomplete = async (studentId: string, lessonId: number): Promise<void> => {
        return setLessonProgress(studentId, lessonId, false);
    };

    // Назначить курс пользователю
    const assignCourseToStudent = async (studentId: string, courseId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Деактивируем все старые записи курсов пользователя
            const { error: deactivateError } = await supabase
                .from('user_course_enrollments')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('user_id', studentId)
                .eq('is_active', true);

            if (deactivateError) throw deactivateError;

            // 2. Проверяем, есть ли уже неактивная запись для этого курса
            const { data: existingEnrollment, error: checkError } = await supabase
                .from('user_course_enrollments')
                .select('id')
                .eq('user_id', studentId)
                .eq('course_id', courseId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw checkError;
            }

            if (existingEnrollment) {
                // 3a. Если запись уже существует, просто активируем её
                const { error: activateError } = await supabase
                    .from('user_course_enrollments')
                    .update({ 
                        is_active: true, 
                        enrollment_date: new Date().toISOString(),
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', existingEnrollment.id);

                if (activateError) throw activateError;
            } else {
                // 3b. Если записи нет, создаем новую
                const { error: insertError } = await supabase
                    .from('user_course_enrollments')
                    .insert([{
                        user_id: studentId,
                        course_id: courseId,
                        enrollment_date: new Date().toISOString(),
                        is_active: true,
                    }]);

                if (insertError) throw insertError;
            }

        } catch (err) {
            console.error('Ошибка при назначении курса:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при назначении курса'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        resetLessonProgress,
        markMaterialViewed,
        resetMaterialView,
        updateStudentPoints,
        updatePersonalChatLink,
        assignCourseToStudent,
        setLessonProgress,
        markLessonAsCompleted,
        markLessonAsIncomplete,
    };
} 