import { useState, useEffect } from 'react';
import { supabase } from '../client';

// Типы для хука учеников
export interface Student {
    user_id: string;
    full_name: string;
    telegram_id: string;
    role: 'user' | 'curator' | 'admin' | 'guest';  // Роль пользователя
    web_login?: string | null;  // Может быть null
    course_title?: string | null;  // Может быть null
    created_at: string;
    last_login?: string | null;  // Может быть null
    web_last_login?: string | null;  // Может быть null
    total_points: number;
    completed_lessons_percent: number;
    curator_name?: string | null;  // Может быть null
}

export interface StudentsFilter {
    sortBy?: 'points' | 'created_at' | 'last_login';
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    perPage?: number;
}

export interface StudentsAdminResult {
    students: Student[];
    loading: boolean;
    error: Error | null;
    pagination: {
        currentPage: number;
        perPage: number;
        hasMore: boolean;
    };
    loadStudents: (filter?: StudentsFilter) => Promise<void>;
}

/**
 * Хук для административного управления учениками
 * Только для админов и кураторов - просмотр списка учеников с сортировкой и пагинацией
 */
export function useStudentsAdmin(): StudentsAdminResult {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        perPage: 20,
        hasMore: false,
    });

    // Загрузка списка учеников через SQL функцию
    const loadStudents = async (filter: StudentsFilter = {}) => {
        if (!supabase) {
            setError(new Error('Supabase клиент не инициализирован'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const {
                sortBy = 'created_at',
                sortOrder = 'DESC',
                page = 1,
                perPage = 20,
            } = filter;

            // Вызываем SQL функцию get_students_list
            const { data: studentsData, error: studentsError } = await supabase
                .rpc('get_students_list', {
                    sort_by: sortBy,
                    sort_order: sortOrder,
                    limit_count: perPage,
                    offset_count: (page - 1) * perPage,
                });

            if (studentsError) throw studentsError;

            setStudents(studentsData || []);

            // Обновляем информацию о пагинации
            setPagination({
                currentPage: page,
                perPage,
                hasMore: (studentsData || []).length === perPage, // Если получили полную страницу, возможно есть еще
            });

        } catch (err) {
            console.error('Ошибка при загрузке учеников:', err);
            // Если это ошибка Supabase, используем текст сообщения, иначе сериализуем объект
            if (err instanceof Error) {
                setError(err);
            } else if ((err as any).message) {
                setError(new Error((err as any).message));
            } else {
                setError(new Error(JSON.stringify(err)));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, []);

    return {
        students,
        loading,
        error,
        pagination,
        loadStudents,
    };
} 