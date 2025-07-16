/**
 * Хук для работы с доступами тарифов к урокам
 * Использует React Query для эффективного управления состоянием и кэшированием
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// Функции для работы с уроками
async function fetchLessonTariffAccess(lessonId: number): Promise<string[]> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariff_lesson_access')
        .select('tariff_id')
        .eq('lesson_id', lessonId);

    if (error) {
        logger.error('Ошибка загрузки доступов тарифов к уроку:', error);
        throw error;
    }

    return data?.map(item => item.tariff_id) || [];
}

async function saveLessonTariffAccess(lessonId: number, tariffIds: string[]): Promise<void> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    // Удаляем существующие доступы для этого урока
    const { error: deleteError } = await supabase
        .from('tariff_lesson_access')
        .delete()
        .eq('lesson_id', lessonId);

    if (deleteError) {
        logger.error('Ошибка удаления существующих доступов:', deleteError);
        throw deleteError;
    }

    // Добавляем новые доступы (только если есть тарифы для добавления)
    if (tariffIds.length > 0) {
        const accessRecords = tariffIds.map(tariffId => ({
            lesson_id: lessonId,
            tariff_id: tariffId,
        }));

        const { error: insertError } = await supabase
            .from('tariff_lesson_access')
            .insert(accessRecords);

        if (insertError) {
            logger.error('Ошибка добавления новых доступов:', insertError);
            throw insertError;
        }
    }
}

/**
 * Хук для работы с доступами тарифов к уроку
 */
export function useLessonTariffAccess(lessonId: number | null) {
    const queryClient = useQueryClient();

    // Получение доступных тарифов для урока
    const {
        data: accessibleTariffIds = [],
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['lesson-tariff-access', lessonId],
        queryFn: () => fetchLessonTariffAccess(lessonId!),
        enabled: !!lessonId,
    });

    // Мутация для сохранения доступов
    const saveAccessMut = useMutation({
        mutationFn: ({ lessonId, tariffIds }: { lessonId: number; tariffIds: string[] }) =>
            saveLessonTariffAccess(lessonId, tariffIds),
        onSuccess: () => {
            // Инвалидируем кэш доступов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['lesson-tariff-access', lessonId] });
        },
    });

    return {
        // Данные
        accessibleTariffIds,
        loading,
        error,
        refetch,

        // Операции сохранения
        saveTariffAccess: (tariffIds: string[]) =>
            saveAccessMut.mutateAsync({ lessonId: lessonId!, tariffIds }),
        saving: saveAccessMut.isPending,
        saveError: saveAccessMut.error,
    };
}

// Функция для получения всех тарифов
async function fetchAllTariffs(): Promise<Array<{ id: string; name: string; code: string }>> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariffs')
        .select('id, name, code')
        .order('code');

    if (error) {
        logger.error('Ошибка загрузки тарифов:', error);
        throw error;
    }

    return data || [];
}

/**
 * Хук для получения всех тарифов
 */
export function useAllTariffs() {
    const {
        data: tariffs = [],
        isLoading: loading,
        error,
    } = useQuery({
        queryKey: ['all-tariffs'],
        queryFn: fetchAllTariffs,
    });

    return {
        tariffs,
        loading,
        error,
    };
} 