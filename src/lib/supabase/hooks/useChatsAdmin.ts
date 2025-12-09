import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStreams } from './useTariffConfiguration';
import { useTariffsAdmin } from './useTariffsAdmin';
import type { Chat, CreateChatData, UpdateChatData } from '@/types';

interface ChatsAdminResult {
    // Данные чатов
    chats: Chat[];
    loading: boolean;
    error: Error | null;

    // Данные для селекторов
    streams: Array<{ id: string; name: string; course_id: string }>;
    streamsLoading: boolean;
    tariffs: Array<{ id: string; name: string; code: string }>;
    tariffsLoading: boolean;

    // CRUD операции
    loadChats: () => Promise<void>;
    createChat: (data: CreateChatData) => Promise<Chat>;
    updateChat: (data: UpdateChatData) => Promise<void>;
    deleteChat: (id: string) => Promise<void>;

    // Avatar операции
    updateChatAvatar: (chatId: string, avatarUrl: string) => Promise<void>;
    deleteChatAvatar: (chatId: string) => Promise<void>;
}

/**
 * Хук для административного управления чатами
 * Включает загрузку потоков и тарифов для селекторов
 */
export function useChatsAdmin(): ChatsAdminResult {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загружаем потоки и тарифы для селекторов
    const { data: streamsData, isLoading: streamsLoading } = useStreams();
    const { tariffs, loading: tariffsLoading } = useTariffsAdmin();

    // Мемоизируем преобразованные массивы для избежания ререндеров
    const memoizedStreams = useMemo(() =>
        (streamsData || []).map(stream => ({ id: stream.id, name: stream.name, course_id: stream.course_id })),
        [streamsData]
    );

    const memoizedTariffs = useMemo(() =>
        tariffs.map(tariff => ({ id: tariff.id, name: tariff.name, code: tariff.code })),
        [tariffs]
    );

    // Загрузка списка чатов с stream_name через JOIN
    const loadChats = async () => {
        if (!supabase) {
            setError(new Error('Supabase клиент не инициализирован'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: chatsData, error: chatsError } = await supabase
                .from('chats')
                .select(`
                    *,
                    streams:stream_id (
                        name
                    )
                `)
                .order('order_num', { ascending: true });

            if (chatsError) throw chatsError;

            // Преобразуем данные, добавляя stream_name
            const transformedChats = chatsData?.map(chat => ({
                ...chat,
                stream_name: chat.streams?.name || null
            })) || [];

            setChats(transformedChats);
        } catch (err) {
            console.error('Ошибка при загрузке чатов:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    // Создание нового чата
    const createChat = async (data: CreateChatData): Promise<Chat> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { data: insertedData, error: insertError } = await supabase
                .from('chats')
                .insert([data])
                .select(`
                    *,
                    streams:stream_id (
                        name
                    )
                `)
                .single();

            if (insertError) throw insertError;

            // Преобразуем данные
            const newChat = {
                ...insertedData,
                stream_name: insertedData.streams?.name || null
            } as Chat;

            // Обновляем локальное состояние без перезагрузки
            setChats(prev => [...prev, newChat].sort((a, b) => a.order_num - b.order_num));

            return newChat;
        } catch (err) {
            console.error('Ошибка при создании чата:', err);
            throw err instanceof Error ? err : new Error('Ошибка при создании чата');
        }
    };

    // Обновление чата
    const updateChat = async (data: UpdateChatData) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { id, ...updateData } = data;

            const { data: updatedData, error: updateError } = await supabase
                .from('chats')
                .update(updateData)
                .eq('id', id)
                .select(`
                    *,
                    streams:stream_id (
                        name
                    )
                `)
                .single();

            if (updateError) throw updateError;

            // Преобразуем данные
            const updatedChat = {
                ...updatedData,
                stream_name: updatedData.streams?.name || null
            };

            // Обновляем локальное состояние без перезагрузки
            setChats(prev => prev.map(chat =>
                chat.id === id ? updatedChat : chat
            ).sort((a, b) => a.order_num - b.order_num));
        } catch (err) {
            console.error('Ошибка при обновлении чата:', err);
            throw err instanceof Error ? err : new Error('Ошибка при обновлении чата');
        }
    };

    // Удаление чата
    const deleteChat = async (id: string) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: deleteError } = await supabase
                .from('chats')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Обновляем локальное состояние без перезагрузки
            setChats(prev => prev.filter(chat => chat.id !== id));
        } catch (err) {
            console.error('Ошибка при удалении чата:', err);
            throw err instanceof Error ? err : new Error('Ошибка при удалении чата');
        }
    };

    // Обновление аватара чата
    const updateChatAvatar = async (chatId: string, avatarUrl: string) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: updateError } = await supabase
                .from('chats')
                .update({ avatar_url: avatarUrl })
                .eq('id', chatId);

            if (updateError) throw updateError;

            // Обновляем локальное состояние
            setChats(prev => prev.map(chat =>
                chat.id === chatId ? { ...chat, avatar_url: avatarUrl } : chat
            ));
        } catch (err) {
            console.error('Ошибка при обновлении аватара чата:', err);
            throw err instanceof Error ? err : new Error('Ошибка при обновлении аватара чата');
        }
    };

    // Удаление аватара чата
    const deleteChatAvatar = async (chatId: string) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: updateError } = await supabase
                .from('chats')
                .update({ avatar_url: null })
                .eq('id', chatId);

            if (updateError) throw updateError;

            // Обновляем локальное состояние
            setChats(prev => prev.map(chat =>
                chat.id === chatId ? { ...chat, avatar_url: null } : chat
            ));
        } catch (err) {
            console.error('Ошибка при удалении аватара чата:', err);
            throw err instanceof Error ? err : new Error('Ошибка при удалении аватара чата');
        }
    };

    useEffect(() => {
        loadChats();
    }, []);

    return {
        // Данные чатов
        chats,
        loading,
        error,

        // Данные для селекторов
        streams: memoizedStreams,
        streamsLoading,
        tariffs: memoizedTariffs,
        tariffsLoading,

        // CRUD операции
        loadChats,
        createChat,
        updateChat,
        deleteChat,

        // Avatar операции
        updateChatAvatar,
        deleteChatAvatar,
    };
} 