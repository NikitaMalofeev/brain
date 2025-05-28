import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { Database } from '../types';

type LessonBlock = Database['public']['Tables']['lesson_blocks']['Row'];
type LessonBlockInsert = Database['public']['Tables']['lesson_blocks']['Insert'];
type LessonBlockUpdate = Database['public']['Tables']['lesson_blocks']['Update'];

interface UseBlocksAdminResult {
    blocks: LessonBlock[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createBlock: (data: LessonBlockInsert) => Promise<void>;
    updateBlock: (id: number, data: LessonBlockUpdate) => Promise<void>;
    deleteBlock: (id: number) => Promise<void>;
}

export const useBlocksAdmin = (lessonId: number): UseBlocksAdminResult => {
    const [blocks, setBlocks] = useState<LessonBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchBlocks = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('lesson_blocks')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order_num', { ascending: true });

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            setBlocks(data || []);
        } catch (err) {
            console.error('Ошибка при загрузке блоков:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const createBlock = async (data: LessonBlockInsert) => {
        try {
            const { error: createError } = await supabase
                .from('lesson_blocks')
                .insert(data);

            if (createError) {
                throw new Error(createError.message);
            }

            await fetchBlocks(); // Перезагружаем данные
        } catch (err) {
            console.error('Ошибка при создании блока:', err);
            throw err;
        }
    };

    const updateBlock = async (id: number, data: LessonBlockUpdate) => {
        try {
            const { error: updateError } = await supabase
                .from('lesson_blocks')
                .update(data)
                .eq('id', id);

            if (updateError) {
                throw new Error(updateError.message);
            }

            await fetchBlocks(); // Перезагружаем данные
        } catch (err) {
            console.error('Ошибка при обновлении блока:', err);
            throw err;
        }
    };

    const deleteBlock = async (id: number) => {
        try {
            const { error: deleteError } = await supabase
                .from('lesson_blocks')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            await fetchBlocks(); // Перезагружаем данные
        } catch (err) {
            console.error('Ошибка при удалении блока:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (lessonId) {
            fetchBlocks();
        }
    }, [lessonId]);

    return {
        blocks,
        loading,
        error,
        refetch: fetchBlocks,
        createBlock,
        updateBlock,
        deleteBlock,
    };
}; 