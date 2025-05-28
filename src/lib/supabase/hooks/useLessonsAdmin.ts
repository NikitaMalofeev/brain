import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { Database } from '../types';

type Lesson = Database['public']['Tables']['lessons']['Row'];
type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type LessonUpdate = Database['public']['Tables']['lessons']['Update'];

interface UseLessonsAdminResult {
    lessons: Lesson[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createLesson: (data: LessonInsert) => Promise<void>;
    updateLesson: (id: number, data: LessonUpdate) => Promise<void>;
    deleteLesson: (id: number) => Promise<void>;
}

export const useLessonsAdmin = (stageId: number): UseLessonsAdminResult => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchLessons = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('lessons')
                .select(`
          *,
          lesson_blocks(count)
        `)
                .eq('stage_id', stageId)
                .order('order_num', { ascending: true });

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            setLessons(data || []);
        } catch (err) {
            console.error('Ошибка при загрузке уроков:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const createLesson = async (data: LessonInsert) => {
        try {
            const { error: createError } = await supabase
                .from('lessons')
                .insert(data);

            if (createError) {
                throw new Error(createError.message);
            }

            await fetchLessons(); // Перезагружаем данные
        } catch (err) {
            console.error('Ошибка при создании урока:', err);
            throw err;
        }
    };

    const updateLesson = async (id: number, data: LessonUpdate) => {
        try {
            const { error: updateError } = await supabase
                .from('lessons')
                .update(data)
                .eq('id', id);

            if (updateError) {
                throw new Error(updateError.message);
            }

            await fetchLessons(); // Перезагружаем данные
        } catch (err) {
            console.error('Ошибка при обновлении урока:', err);
            throw err;
        }
    };

    const deleteLesson = async (id: number) => {
        try {
            const { error: deleteError } = await supabase
                .from('lessons')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            await fetchLessons(); // Перезагружаем данные
        } catch (err) {
            console.error('Ошибка при удалении урока:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (stageId) {
            fetchLessons();
        }
    }, [stageId]);

    return {
        lessons,
        loading,
        error,
        refetch: fetchLessons,
        createLesson,
        updateLesson,
        deleteLesson,
    };
}; 