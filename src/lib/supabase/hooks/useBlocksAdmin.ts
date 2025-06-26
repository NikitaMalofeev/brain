import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { Database } from '../types';
import { deleteFile } from '../supabaseStorageService';

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

            if (!supabase) {
                throw new Error('Supabase client не инициализирован');
            }

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
            if (!supabase) {
                throw new Error('Supabase client не инициализирован');
            }

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
            if (!supabase) {
                throw new Error('Supabase client не инициализирован');
            }

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
            if (!supabase) {
                throw new Error('Supabase client не инициализирован');
            }

            // 1. Сначала получаем данные блока для извлечения пути к файлу
            const { data: blockData, error: fetchError } = await supabase
                .from('lesson_blocks')
                .select('content_url')
                .eq('id', id)
                .single();

            if (fetchError) {
                throw new Error(`Ошибка при получении данных блока: ${fetchError.message}`);
            }

            // 2. Если у блока есть файл, удаляем его из Storage
            if (blockData?.content_url) {
                try {
                    // Извлекаем путь файла из URL (убираем базовый URL Supabase Storage)
                    const storageUrl = blockData.content_url;

                    // Если это URL Supabase Storage, извлекаем путь файла
                    if (storageUrl.includes('/storage/v1/object/public/media/')) {
                        const filePath = storageUrl.split('/storage/v1/object/public/media/')[1];
                        if (filePath) {
                            console.log(`Удаляем файл из Storage: ${filePath}`);
                            await deleteFile(filePath);
                        }
                    } else {
                        // Если это прямой путь к файлу (относительный), удаляем как есть
                        console.log(`Удаляем файл из Storage: ${storageUrl}`);
                        await deleteFile(storageUrl);
                    }
                } catch (storageError) {
                    console.warn('Не удалось удалить файл из Storage, продолжаем удаление блока:', storageError);
                    // Не прерываем процесс - возможно файл уже удален или недоступен
                }
            }

            // 3. Удаляем запись из базы данных
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