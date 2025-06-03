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

            if (!supabase) {
                throw new Error('Supabase клиент не инициализирован');
            }

            const { data, error: fetchError } = await supabase
                .from('lessons')
                .select(`
          id,
          stage_id,
          name,
          description,
          order_num,
          created_at,
          updated_at,
          has_assignment,
          open_at,
          deadline_at,
          cover_image_path,
          lesson_blocks!inner(count)
        `)
                .eq('stage_id', stageId)
                .order('order_num');

            if (fetchError) {
                console.error('❌ Ошибка загрузки уроков:', fetchError);
                throw new Error(fetchError.message);
            }

            if (!data) {
                throw new Error('Данные уроков отсутствуют');
            }

            setLessons(data);

        } catch (error: any) {
            console.error('❌ Критическая ошибка в fetchLessons:', error);
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    const createLesson = async (data: LessonInsert) => {
        try {
            if (!supabase) {
                throw new Error('Supabase клиент не инициализирован');
            }

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
            if (!supabase) {
                throw new Error('Supabase клиент не инициализирован');
            }

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
            if (!supabase) {
                throw new Error('Supabase клиент не инициализирован');
            }

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

    // Загружаем уроки при изменении stageId
    useEffect(() => {
        if (stageId && stageId > 0) {
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