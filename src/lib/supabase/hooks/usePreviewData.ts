/**
 * Хуки для получения preview данных (гостевой режим)
 * Используются когда у пользователя нет тарифа/потока
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// ============================================
// Типы для preview данных
// ============================================

export interface PreviewStreamModule {
    module_id: string;
    module_name: string;
    module_order_num: number;
    module_color: string;
    is_unlocked: boolean;
    total_lessons: number;
    completed_lessons: number;
    unlocked_lessons: number;
    overdue_lessons: number;
    stream_id: string;
    stream_name: string;
    unlock_day: number;
    first_stage_id: number | null;
    total_assignments: number;
    completed_assignments: number;
    overdue_assignments: number;
}

export interface PreviewCalendarEvent {
    event_id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string | null;
    event_type: string;
    external_url: string | null;
    lesson_id: number | null;
    material_id: string | null;
    technique_id: string | null;
    cover_image: string | null;
    module_id: string | null;
    module_name: string | null;
    module_color: string | null;
    can_access: boolean;
}

export interface PreviewStreamInfo {
    stream_id: string;
    stream_name: string;
    start_date: string;
    current_week: number;
}

// ============================================
// Хук для получения модулей в preview режиме
// ============================================

export function usePreviewStreamModules() {
    return useQuery<PreviewStreamModule[]>({
        queryKey: ['preview_stream_modules'],
        queryFn: async () => {
            if (!supabase) {
                throw new Error('Supabase не инициализирован');
            }

            const { data, error } = await supabase.rpc('get_preview_stream_modules');

            if (error) {
                logger.error('Ошибка получения preview модулей:', error);
                throw error;
            }

            return data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// ============================================
// Хук для получения событий календаря в preview режиме
// ============================================

export function usePreviewCalendarEvents(month: Date) {
    // Формат даты: первое число месяца
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;

    return useQuery<PreviewCalendarEvent[]>({
        queryKey: ['preview_calendar_events', monthStr],
        queryFn: async () => {
            if (!supabase) {
                throw new Error('Supabase не инициализирован');
            }

            const { data, error } = await supabase.rpc('get_preview_calendar_events', {
                p_month: monthStr
            });

            if (error) {
                logger.error('Ошибка получения preview событий календаря:', error);
                throw error;
            }

            return data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// ============================================
// Хук для получения информации о потоке в preview режиме
// ============================================

export function usePreviewStreamInfo() {
    return useQuery<PreviewStreamInfo | null>({
        queryKey: ['preview_stream_info'],
        queryFn: async () => {
            if (!supabase) {
                throw new Error('Supabase не инициализирован');
            }

            const { data, error } = await supabase.rpc('get_preview_stream_info');

            if (error) {
                logger.error('Ошибка получения preview информации о потоке:', error);
                throw error;
            }

            // Функция возвращает массив с одним элементом
            return data && data.length > 0 ? data[0] : null;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}
