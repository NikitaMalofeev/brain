import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Chat, CreateChatData, UpdateChatData } from '@/types';

interface ChatsAdminResult {
    chats: Chat[];
    loading: boolean;
    error: Error | null;
    loadChats: () => Promise<void>;
    createChat: (data: CreateChatData) => Promise<Chat>;
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
    const createChat = async (data: CreateChatData): Promise<Chat> => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { data: insertedData, error: insertError } = await supabase
                .from('chats')
                .insert([data])
                .select()
                .single();

            if (insertError) throw insertError;

            // Обновляем локальное состояние без перезагрузки
            const newChat = insertedData as Chat;
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

            const { error: updateError } = await supabase
                .from('chats')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;

            // Обновляем локальное состояние без перезагрузки
            setChats(prev => prev.map(chat =>
                chat.id === id
                    ? { ...chat, ...updateData }
                    : chat
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