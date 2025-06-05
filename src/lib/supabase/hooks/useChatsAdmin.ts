import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Chat, CreateChatData, UpdateChatData } from '@/types';

interface ChatsAdminResult {
    chats: Chat[];
    loading: boolean;
    error: Error | null;
    loadChats: () => Promise<void>;
    createChat: (data: CreateChatData) => Promise<void>;
    updateChat: (data: UpdateChatData) => Promise<void>;
    deleteChat: (id: string) => Promise<void>;
}

/**
 * Хук для административного управления чатами
 * Только для админов - CRUD операции с Telegram чатами
 */
export function useChatsAdmin(): ChatsAdminResult {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загрузка списка чатов
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
                .select('*')
                .order('order_num', { ascending: true });

            if (chatsError) throw chatsError;

            setChats(chatsData || []);
        } catch (err) {
            console.error('Ошибка при загрузке чатов:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    // Создание нового чата
    const createChat = async (data: CreateChatData) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: insertError } = await supabase
                .from('chats')
                .insert([data]);

            if (insertError) throw insertError;

            // Перезагружаем список чатов
            await loadChats();
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

            const { error: updateError } = await supabase
                .from('chats')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;

            // Перезагружаем список чатов
            await loadChats();
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

            // Перезагружаем список чатов
            await loadChats();
        } catch (err) {
            console.error('Ошибка при удалении чата:', err);
            throw err instanceof Error ? err : new Error('Ошибка при удалении чата');
        }
    };

    useEffect(() => {
        loadChats();
    }, []);

    return {
        chats,
        loading,
        error,
        loadChats,
        createChat,
        updateChat,
        deleteChat,
    };
} 