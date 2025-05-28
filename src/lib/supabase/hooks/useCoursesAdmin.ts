import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { Course } from '../types';

interface CoursesAdminResult {
    courses: Course[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
    createCourse: (course: { title: string; subtitle?: string }) => Promise<Course>;
    updateCourse: (id: string, updates: Partial<Course>) => Promise<void>;
    deleteCourse: (id: string) => Promise<void>;
}

/**
 * Хук для административного управления курсами
 * Только для админов - CRUD операции с курсами
 */
export function useCoursesAdmin(): CoursesAdminResult {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загрузка всех курсов с подсчетом ступеней
    const fetchCourses = async () => {
        if (!supabase) {
            setError(new Error('Supabase клиент не инициализирован'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Получаем курсы с подсчетом количества ступеней
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
          *,
          course_stages (count)
        `)
                .order('created_at', { ascending: false });

            if (coursesError) throw coursesError;

            setCourses(coursesData || []);
        } catch (err) {
            console.error('Ошибка при загрузке курсов:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    // Создание нового курса
    const createCourse = async (courseData: { title: string; subtitle?: string }): Promise<Course> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        const { data, error } = await supabase
            .from('courses')
            .insert([courseData])
            .select()
            .single();

        if (error) throw error;

        // Обновляем локальный список
        await fetchCourses();

        return data;
    };

    // Обновление курса
    const updateCourse = async (id: string, updates: Partial<Course>): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        const { error } = await supabase
            .from('courses')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // Обновляем локальный список
        await fetchCourses();
    };

    // Удаление курса
    const deleteCourse = async (id: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        // Проверяем, есть ли ступени у курса
        const { data: stages, error: checkError } = await supabase
            .from('course_stages')
            .select('id')
            .eq('course_id', id)
            .limit(1);

        if (checkError) throw checkError;

        if (stages && stages.length > 0) {
            throw new Error('Невозможно удалить курс: у него есть ступени. Сначала удалите все ступени.');
        }

        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Обновляем локальный список
        await fetchCourses();
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    return {
        courses,
        loading,
        error,
        refetch: fetchCourses,
        createCourse,
        updateCourse,
        deleteCourse,
    };
} 