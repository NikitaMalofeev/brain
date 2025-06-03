import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { CourseStage } from '../types';

interface StagesAdminResult {
    stages: CourseStage[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
    createStage: (stage: { course_id: string; name: string; description?: string; order_num: number; is_unlocked?: boolean; cover_image_path?: string; }) => Promise<CourseStage>;
    updateStage: (id: number, updates: Partial<CourseStage>) => Promise<void>;
    deleteStage: (id: number) => Promise<void>;
}

/**
 * Хук для административного управления ступенями курса
 * Только для админов - CRUD операции со ступенями
 */
export function useStagesAdmin(courseId: string): StagesAdminResult {
    const [stages, setStages] = useState<CourseStage[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загрузка всех ступеней курса с подсчетом уроков
    const fetchStages = async () => {
        if (!supabase || !courseId) {
            setError(new Error('Supabase клиент не инициализирован или отсутствует ID курса'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Получаем ступени с подсчетом количества уроков
            const { data: stagesData, error: stagesError } = await supabase
                .from('course_stages')
                .select(`
          *,
          lessons (count)
        `)
                .eq('course_id', courseId)
                .order('order_num', { ascending: true });

            if (stagesError) throw stagesError;

            setStages(stagesData || []);
        } catch (err) {
            console.error('Ошибка при загрузке ступеней:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    // Создание новой ступени
    const createStage = async (stageData: { course_id: string; name: string; description?: string; order_num: number; is_unlocked?: boolean; cover_image_path?: string; }): Promise<CourseStage> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        const { data, error } = await supabase
            .from('course_stages')
            .insert([{
                ...stageData,
                is_unlocked: stageData.is_unlocked ?? false
            }])
            .select()
            .single();

        if (error) throw error;

        // Обновляем локальный список
        await fetchStages();

        return data;
    };

    // Обновление ступени
    const updateStage = async (id: number, updates: Partial<CourseStage>): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        const { error } = await supabase
            .from('course_stages')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // Обновляем локальный список
        await fetchStages();
    };

    // Удаление ступени
    const deleteStage = async (id: number): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        // Проверяем, есть ли уроки у ступени
        const { data: lessons, error: checkError } = await supabase
            .from('lessons')
            .select('id')
            .eq('stage_id', id)
            .limit(1);

        if (checkError) throw checkError;

        if (lessons && lessons.length > 0) {
            throw new Error('Невозможно удалить ступень: у неё есть уроки. Сначала удалите все уроки.');
        }

        const { error } = await supabase
            .from('course_stages')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Обновляем локальный список
        await fetchStages();
    };

    useEffect(() => {
        if (courseId) {
            fetchStages();
        }
    }, [courseId]);

    return {
        stages,
        loading,
        error,
        refetch: fetchStages,
        createStage,
        updateStage,
        deleteStage,
    };
} 