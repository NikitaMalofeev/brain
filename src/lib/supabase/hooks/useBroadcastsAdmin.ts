import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Broadcast, CreateBroadcastData, UpdateBroadcastData } from '@/types';

interface BroadcastsAdminResult {
    broadcasts: Broadcast[];
    loading: boolean;
    error: Error | null;
    loadBroadcasts: () => Promise<void>;
    createBroadcast: (data: CreateBroadcastData) => Promise<void>;
    updateBroadcast: (data: UpdateBroadcastData) => Promise<void>;
    deleteBroadcast: (id: string) => Promise<void>;
    reorderBroadcasts: (broadcastIds: string[]) => Promise<void>;
}

/**
 * Хук для административного управления эфирами
 * Только для админов - CRUD операции с эфирами/трансляциями
 */
export function useBroadcastsAdmin(): BroadcastsAdminResult {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Загрузка списка эфиров
    const loadBroadcasts = async () => {
        if (!supabase) {
            setError(new Error('Supabase клиент не инициализирован'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: broadcastsData, error: broadcastsError } = await supabase
                .from('broadcasts')
                .select('*')
                .order('order_num', { ascending: true })
                .order('start_time', { ascending: false }); // fallback если order_num одинаковый

            if (broadcastsError) throw broadcastsError;

            setBroadcasts(broadcastsData || []);
        } catch (err) {
            console.error('Ошибка при загрузке эфиров:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    // Создание нового эфира
    const createBroadcast = async (data: CreateBroadcastData) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            // Получаем максимальный order_num
            const { data: all, error: fetchError } = await supabase
                .from('broadcasts')
                .select('order_num');
            if (fetchError) throw fetchError;
            const maxOrder = all && all.length > 0 ? Math.max(...all.map((b: any) => b.order_num || 0)) : 0;

            const { error: insertError } = await supabase
                .from('broadcasts')
                .insert([{ ...data, order_num: maxOrder + 1 }]);

            if (insertError) throw insertError;
            await loadBroadcasts();
        } catch (err) {
            console.error('Ошибка при создании эфира:', err);
            throw err instanceof Error ? err : new Error('Ошибка при создании эфира');
        }
    };

    // Обновление эфира
    const updateBroadcast = async (data: UpdateBroadcastData) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { id, ...updateData } = data;

            const { error: updateError } = await supabase
                .from('broadcasts')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;

            // Перезагружаем список эфиров
            await loadBroadcasts();
        } catch (err) {
            console.error('Ошибка при обновлении эфира:', err);
            throw err instanceof Error ? err : new Error('Ошибка при обновлении эфира');
        }
    };

    // Удаление эфира
    const deleteBroadcast = async (id: string) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            const { error: deleteError } = await supabase
                .from('broadcasts')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Перезагружаем список эфиров
            await loadBroadcasts();
        } catch (err) {
            console.error('Ошибка при удалении эфира:', err);
            throw err instanceof Error ? err : new Error('Ошибка при удалении эфира');
        }
    };

    // Изменение порядка эфиров
    const reorderBroadcasts = async (broadcastIds: string[]) => {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }

        try {
            // Обновляем порядок для каждого эфира
            for (let i = 0; i < broadcastIds.length; i++) {
                const { error: updateError } = await supabase
                    .from('broadcasts')
                    .update({ order_num: i + 1 })
                    .eq('id', broadcastIds[i]);

                if (updateError) throw updateError;
            }

            // Перезагружаем список эфиров
            await loadBroadcasts();
        } catch (err) {
            console.error('Ошибка при изменении порядка эфиров:', err);
            throw err instanceof Error ? err : new Error('Ошибка при изменении порядка эфиров');
        }
    };

    useEffect(() => {
        loadBroadcasts();
    }, []);

    return {
        broadcasts,
        loading,
        error,
        loadBroadcasts,
        createBroadcast,
        updateBroadcast,
        deleteBroadcast,
        reorderBroadcasts,
    };
} 