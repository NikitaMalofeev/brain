import { useState } from 'react';
import { supabase } from '../client';

export interface AvailableStudent {
    id: string;
    full_name: string;
    telegram_id: string;
    course_title?: string;
    created_at: string;
}

export interface CuratorActionsResult {
    loading: boolean;
    error: Error | null;
    assignStudent: (curatorId: string, studentId: string) => Promise<void>;
    unassignStudent: (curatorId: string, studentId: string) => Promise<void>;
    getAvailableStudents: (curatorId: string) => Promise<AvailableStudent[]>;
}

/**
 * Хук для управления связями куратор-ученик
 * Только для админов - назначение и отвязка учеников от кураторов
 */
export function useCuratorActions(): CuratorActionsResult {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    // Назначить ученика куратору
    const assignStudent = async (curatorId: string, studentId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Проверяем, что куратор существует и имеет правильную роль
            const { data: curatorData, error: curatorError } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', curatorId)
                .in('role', ['curator', 'admin'])
                .single();

            if (curatorError || !curatorData) {
                throw new Error('Куратор не найден или не имеет соответствующей роли');
            }

            // Проверяем, что ученик существует и имеет роль user
            const { data: studentData, error: studentError } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', studentId)
                .eq('role', 'user')
                .single();

            if (studentError || !studentData) {
                throw new Error('Ученик не найден или не имеет роли пользователя');
            }

            // Проверяем, не назначен ли уже ученик другому куратору
            const { data: existingAssignment, error: checkError } = await supabase
                .from('user_curator')
                .select('curator_id')
                .eq('student_id', studentId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw checkError;
            }

            if (existingAssignment) {
                throw new Error('Ученик уже назначен другому куратору');
            }

            // Создаем новую связь куратор-ученик
            const { error: assignError } = await supabase
                .from('user_curator')
                .insert({
                    curator_id: curatorId,
                    student_id: studentId,
                    created_at: new Date().toISOString(),
                });

            if (assignError) throw assignError;

        } catch (err) {
            console.error('Ошибка при назначении ученика куратору:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при назначении ученика куратору'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Отвязать ученика от куратора
    const unassignStudent = async (curatorId: string, studentId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Удаляем связь куратор-ученик
            const { error: unassignError } = await supabase
                .from('user_curator')
                .delete()
                .eq('curator_id', curatorId)
                .eq('student_id', studentId);

            if (unassignError) throw unassignError;

        } catch (err) {
            console.error('Ошибка при отвязке ученика от куратора:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при отвязке ученика от куратора'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Получить список доступных для назначения учеников (не назначенных никому)
    const getAvailableStudents = async (curatorId: string): Promise<AvailableStudent[]> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            setLoading(true);
            setError(null);

            // Получаем всех пользователей с ролью 'user'
            const { data: allStudents, error: studentsError } = await supabase
                .from('users')
                .select(`
                    id,
                    first_name,
                    last_name,
                    telegram_id,
                    created_at,
                    user_course_enrollments!inner (
                        is_active,
                        courses (
                            title
                        )
                    )
                `)
                .eq('role', 'user');

            if (studentsError) throw studentsError;

            // Получаем список ВСЕХ учеников, уже назначенных любому куратору
            const { data: allAssignedStudents, error: assignedError } = await supabase
                .from('user_curator')
                .select('student_id');

            if (assignedError) throw assignedError;

            const assignedStudentIds = new Set(
                (allAssignedStudents || []).map(assignment => assignment.student_id)
            );

            // Фильтруем доступных учеников (не назначенных никому)
            const availableStudents: AvailableStudent[] = (allStudents || [])
                .filter(student => !assignedStudentIds.has(student.id))
                .map(student => {
                    const activeCourse = student.user_course_enrollments?.find(
                        (enrollment: any) => enrollment.is_active
                    );

                    return {
                        id: student.id,
                        full_name: `${student.first_name} ${student.last_name || ''}`.trim(),
                        telegram_id: student.telegram_id,
                        course_title: (activeCourse?.courses as any)?.title || 'Курс не найден',
                        created_at: student.created_at,
                    };
                });

            return availableStudents;

        } catch (err) {
            console.error('Ошибка при получении доступных учеников:', err);
            setError(err instanceof Error ? err : new Error('Ошибка при получении доступных учеников'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        assignStudent,
        unassignStudent,
        getAvailableStudents,
    };
} 