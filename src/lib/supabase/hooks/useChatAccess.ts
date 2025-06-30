/**
 * Объединенный хук для работы с доступами чата
 * Управляет курсом (один course_id) и тарифами (массив tariff_ids) для чата
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// Интерфейс для доступов чата
export interface ChatAccess {
    courseId: string | null;
    tariffIds: string[];
}

// Функция для получения текущего курса чата
async function fetchChatCourse(chatId: string): Promise<string | null> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    const { data, error } = await supabase
        .from('chats')
        .select('course_id')
        .eq('id', chatId)
        .single();

    if (error) {
        logger.error('Ошибка загрузки курса чата:', error);
        throw error;
    }

    return data?.course_id || null;
}

// Функция для получения тарифов чата
async function fetchChatTariffs(chatId: string): Promise<string[]> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariff_chat_access')
        .select('tariff_id')
        .eq('chat_id', chatId);

    if (error) {
        logger.error('Ошибка загрузки тарифов чата:', error);
        throw error;
    }

    return data?.map(item => item.tariff_id) || [];
}

// Функция для получения полных доступов чата
async function fetchChatAccess(chatId: string): Promise<ChatAccess> {
    const [courseId, tariffIds] = await Promise.all([
        fetchChatCourse(chatId),
        fetchChatTariffs(chatId)
    ]);

    return {
        courseId,
        tariffIds
    };
}

// Функция для сохранения доступов чата
async function saveChatAccess(chatId: string, access: ChatAccess): Promise<void> {
    if (!supabase) {
        throw new Error('Supabase не инициализирован');
    }

    // 1. Обновляем course_id в таблице chats
    const { error: courseError } = await supabase
        .from('chats')
        .update({ course_id: access.courseId })
        .eq('id', chatId);

    if (courseError) {
        logger.error('Ошибка обновления курса чата:', courseError);
        throw courseError;
    }

    // 2. Обновляем тарифы в tariff_chat_access
    // Сначала удаляем все существующие связи
    const { error: deleteError } = await supabase
        .from('tariff_chat_access')
        .delete()
        .eq('chat_id', chatId);

    if (deleteError) {
        logger.error('Ошибка удаления старых тарифов чата:', deleteError);
        throw deleteError;
    }

    // Если есть новые тарифы, создаем новые связи
    if (access.tariffIds.length > 0) {
        const accessRecords = access.tariffIds.map(tariffId => ({
            chat_id: chatId,
            tariff_id: tariffId,
        }));

        const { error: insertError } = await supabase
            .from('tariff_chat_access')
            .insert(accessRecords);

        if (insertError) {
            logger.error('Ошибка создания новых тарифов чата:', insertError);
            throw insertError;
        }
    }

    logger.info(`Доступы к чату ${chatId} обновлены:`, access);
}

/**
 * Объединенный хук для работы с доступами чата
 * Загружает и сохраняет курс + тарифы атомарно
 */
export function useChatAccess(chatId: string | null) {
    const queryClient = useQueryClient();

    // Получение доступов чата
    const {
        data: access,
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['chat-access', chatId],
        queryFn: () => fetchChatAccess(chatId!),
        enabled: !!chatId,
    });

    // Мутация для сохранения доступов
    const saveAccessMut = useMutation({
        mutationFn: ({ chatId, access }: { chatId: string; access: ChatAccess }) =>
            saveChatAccess(chatId, access),
        onSuccess: () => {
            // Инвалидируем кэш доступов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['chat-access', chatId] });
            // Также инвалидируем кэш чатов, чтобы обновился course_name
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        },
    });

    return {
        // Данные
        courseId: access?.courseId || null,
        tariffIds: access?.tariffIds || [],
        loading,
        error,
        refetch,

        // Операции сохранения
        saveAccess: (newAccess: ChatAccess) =>
            saveAccessMut.mutateAsync({ chatId: chatId!, access: newAccess }),
        saving: saveAccessMut.isPending,
        saveError: saveAccessMut.error,
    };
} 