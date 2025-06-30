import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCoursesAdmin } from './useCoursesAdmin';
import { useTariffsAdmin } from './useTariffsAdmin';
import type { Chat, CreateChatData, UpdateChatData } from '@/types';

interface ChatsAdminResult {
    // Данные чатов
    chats: Chat[];
    loading: boolean;
    error: Error | null;

    // Данные для селекторов
    courses: Array<{ id: string; title: string }>;
    coursesLoading: boolean;
    tariffs: Array<{ id: string; name: string; code: string }>;
    tariffsLoading: boolean;

    // CRUD операции
    loadChats: () => Promise<void>;
    createChat: (data: CreateChatData) => Promise<Chat>;
    updateChat: (data: UpdateChatData) => Promise<void>;
    deleteChat: (id: string) => Promise<void>;
}

/**
 * Хук для административного управления чатами
 * Включает загрузку курсов и тарифов для селекторов
 */
export function useChatsAdmin(): ChatsAdminResult {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загружаем курсы и тарифы для селекторов
    const { courses, loading: coursesLoading } = useCoursesAdmin();
    const { tariffs, loading: tariffsLoading } = useTariffsAdmin();

    // Мемоизируем преобразованные массивы для избежания ререндеров
    const memoizedCourses = useMemo(() =>
        courses.map(course => ({ id: course.id, title: course.title })),
        [courses]
    );

    const memoizedTariffs = useMemo(() =>
        tariffs.map(tariff => ({ id: tariff.id, name: tariff.name, code: tariff.code })),
        [tariffs]
    );

    // Загрузка списка чатов с course_name через JOIN
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
                    courses:course_id (
                        title
                    )
                `)
                .order('order_num', { ascending: true });

            if (chatsError) throw chatsError;

            // Преобразуем данные, добавляя course_name
            const transformedChats = chatsData?.map(chat => ({
                ...chat,
                course_name: chat.courses?.title || null
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
                    courses:course_id (
                        title
                    )
                `)
                .single();

            if (insertError) throw insertError;

            // Преобразуем данные
            const newChat = {
                ...insertedData,
                course_name: insertedData.courses?.title || null
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
                    courses:course_id (
                        title
                    )
                `)
                .single();

            if (updateError) throw updateError;

            // Преобразуем данные
            const updatedChat = {
                ...updatedData,
                course_name: updatedData.courses?.title || null
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

    useEffect(() => {
        loadChats();
    }, []);

    return {
        // Данные чатов
        chats,
        loading,
        error,

        // Данные для селекторов
        courses: memoizedCourses,
        coursesLoading,
        tariffs: memoizedTariffs,
        tariffsLoading,

        // CRUD операции
        loadChats,
        createChat,
        updateChat,
        deleteChat,
    };
} 