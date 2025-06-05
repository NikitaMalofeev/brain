import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { FAQ, CreateFAQData, UpdateFAQData } from '@/types';

interface FaqAdminResult {
    faqItems: FAQ[];
    loading: boolean;
    error: Error | null;
    loadFaq: () => Promise<void>;
    createFaq: (data: CreateFAQData) => Promise<void>;
    updateFaq: (data: UpdateFAQData) => Promise<void>;
    deleteFaq: (id: string) => Promise<void>;
}

/**
 * Хук для административного управления FAQ
 * Только для админов - CRUD операции с часто задаваемыми вопросами
 */
export function useFaqAdmin(): FaqAdminResult {
    const [faqItems, setFaqItems] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загрузка списка FAQ
    const loadFaq = async () => {
        if (!supabase) {
            setError(new Error('Supabase клиент не инициализирован'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: faqData, error: faqError } = await supabase
                .from('faq')
                .select('*')
                .order('order_num', { ascending: true });

            if (faqError) throw faqError;

            setFaqItems(faqData || []);
        } catch (err) {
            console.error('Ошибка при загрузке FAQ:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    // Создание нового FAQ элемента
    const createFaq = async (data: CreateFAQData) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: insertError } = await supabase
                .from('faq')
                .insert([data]);

            if (insertError) throw insertError;

            // Перезагружаем список FAQ
            await loadFaq();
        } catch (err) {
            console.error('Ошибка при создании FAQ:', err);
            throw err instanceof Error ? err : new Error('Ошибка при создании FAQ');
        }
    };

    // Обновление FAQ элемента
    const updateFaq = async (data: UpdateFAQData) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { id, ...updateData } = data;

            const { error: updateError } = await supabase
                .from('faq')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;

            // Перезагружаем список FAQ
            await loadFaq();
        } catch (err) {
            console.error('Ошибка при обновлении FAQ:', err);
            throw err instanceof Error ? err : new Error('Ошибка при обновлении FAQ');
        }
    };

    // Удаление FAQ элемента
    const deleteFaq = async (id: string) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: deleteError } = await supabase
                .from('faq')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Перезагружаем список FAQ
            await loadFaq();
        } catch (err) {
            console.error('Ошибка при удалении FAQ:', err);
            throw err instanceof Error ? err : new Error('Ошибка при удалении FAQ');
        }
    };

    useEffect(() => {
        loadFaq();
    }, []);

    return {
        faqItems,
        loading,
        error,
        loadFaq,
        createFaq,
        updateFaq,
        deleteFaq,
    };
} 