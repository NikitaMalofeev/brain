/**
 * Хук для работы с доступами тарифов к материалам и чатам
 * Использует React Query для эффективного управления состоянием и кэшированием
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// Функции для работы с материалами
async function fetchMaterialTariffAccess(materialId: string): Promise<string[]> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariff_material_access')
        .select('tariff_id')
        .eq('material_id', materialId);

    if (error) {
        logger.error('Ошибка загрузки доступов тарифов к материалу:', error);
        throw error;
    }

    return data?.map(item => item.tariff_id) || [];
}

async function saveMaterialTariffAccess(materialId: string, tariffIds: string[]): Promise<void> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    // Сначала удаляем все существующие связи
    const { error: deleteError } = await supabase
        .from('tariff_material_access')
        .delete()
        .eq('material_id', materialId);

    if (deleteError) {
        logger.error('Ошибка удаления старых доступов к материалу:', deleteError);
        throw deleteError;
    }

    // Если есть новые тарифы, создаем новые связи
    if (tariffIds.length > 0) {
        const accessRecords = tariffIds.map(tariffId => ({
            material_id: materialId,
            tariff_id: tariffId,
        }));

        const { error: insertError } = await supabase
            .from('tariff_material_access')
            .insert(accessRecords);

        if (insertError) {
            logger.error('Ошибка создания новых доступов к материалу:', insertError);
            throw insertError;
        }
    }

    logger.info(`Доступы к материалу ${materialId} обновлены:`, tariffIds);
}

// Функции для работы с чатами
async function fetchChatTariffAccess(chatId: string): Promise<string[]> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariff_chat_access')
        .select('tariff_id')
        .eq('chat_id', chatId);

    if (error) {
        logger.error('Ошибка загрузки доступов тарифов к чату:', error);
        throw error;
    }

    return data?.map(item => item.tariff_id) || [];
}

async function saveChatTariffAccess(chatId: string, tariffIds: string[]): Promise<void> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    // Сначала удаляем все существующие связи
    const { error: deleteError } = await supabase
        .from('tariff_chat_access')
        .delete()
        .eq('chat_id', chatId);

    if (deleteError) {
        logger.error('Ошибка удаления старых доступов к чату:', deleteError);
        throw deleteError;
    }

    // Если есть новые тарифы, создаем новые связи
    if (tariffIds.length > 0) {
        const accessRecords = tariffIds.map(tariffId => ({
            chat_id: chatId,
            tariff_id: tariffId,
        }));

        const { error: insertError } = await supabase
            .from('tariff_chat_access')
            .insert(accessRecords);

        if (insertError) {
            logger.error('Ошибка создания новых доступов к чату:', insertError);
            throw insertError;
        }
    }

    logger.info(`Доступы к чату ${chatId} обновлены:`, tariffIds);
}

// Экспортируем функции для прямого использования
export { saveMaterialTariffAccess, saveChatTariffAccess };

/**
 * Хук для работы с доступами тарифов к материалу
 */
export function useMaterialTariffAccess(materialId: string | null) {
    const queryClient = useQueryClient();

    // Получение доступных тарифов для материала
    const {
        data: accessibleTariffIds = [],
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['material-tariff-access', materialId],
        queryFn: () => fetchMaterialTariffAccess(materialId!),
        enabled: !!materialId,
    });

    // Мутация для сохранения доступов
    const saveAccessMut = useMutation({
        mutationFn: ({ materialId, tariffIds }: { materialId: string; tariffIds: string[] }) =>
            saveMaterialTariffAccess(materialId, tariffIds),
        onSuccess: () => {
            // Инвалидируем кэш доступов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['material-tariff-access', materialId] });
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
            saveAccessMut.mutateAsync({ materialId: materialId!, tariffIds }),
        saving: saveAccessMut.isPending,
        saveError: saveAccessMut.error,
    };
}

/**
 * Хук для работы с доступами тарифов к чату
 */
export function useChatTariffAccess(chatId: string | null) {
    const queryClient = useQueryClient();

    // Получение доступных тарифов для чата
    const {
        data: accessibleTariffIds = [],
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['chat-tariff-access', chatId],
        queryFn: () => fetchChatTariffAccess(chatId!),
        enabled: !!chatId,
    });

    // Мутация для сохранения доступов
    const saveAccessMut = useMutation({
        mutationFn: ({ chatId, tariffIds }: { chatId: string; tariffIds: string[] }) =>
            saveChatTariffAccess(chatId, tariffIds),
        onSuccess: () => {
            // Инвалидируем кэш доступов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['chat-tariff-access', chatId] });
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
            saveAccessMut.mutateAsync({ chatId: chatId!, tariffIds }),
        saving: saveAccessMut.isPending,
        saveError: saveAccessMut.error,
    };
} 