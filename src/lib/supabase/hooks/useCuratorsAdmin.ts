import { useState, useEffect } from 'react';
import { supabase } from '../client';

// Типы для хука кураторов
export interface Curator {
    user_id: string;
    full_name: string;
    telegram_id: string;
    web_login?: string;
    created_at: string;
    last_login?: string;
    web_last_login?: string;
    assigned_students_count: number;
}

export interface CuratorsFilter {
    page?: number;
    perPage?: number;
}

export interface CuratorsAdminResult {
    curators: Curator[];
    loading: boolean;
    error: Error | null;
    pagination: {
        currentPage: number;
        perPage: number;
        hasMore: boolean;
    };
    loadCurators: (filter?: CuratorsFilter) => Promise<void>;
}

/**
 * Хук для административного управления кураторами
 * Только для админов - просмотр списка кураторов с статистикой
 */
export function useCuratorsAdmin(): CuratorsAdminResult {
    const [curators, setCurators] = useState<Curator[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        perPage: 20,
        hasMore: false,
    });

    // Загрузка списка кураторов через SQL функцию
    const loadCurators = async (filter: CuratorsFilter = {}) => {
        if (!supabase) {
            setError(new Error('Supabase клиент не инициализирован'));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const {
                page = 1,
                perPage = 20,
            } = filter;

            // Вызываем SQL функцию get_curators_list
            const { data: curatorsData, error: curatorsError } = await supabase
                .rpc('get_curators_list');

            if (curatorsError) throw curatorsError;

            // Применяем пагинацию на клиенте (так как у нас не много кураторов)
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const paginatedData = (curatorsData || []).slice(startIndex, endIndex);

            setCurators(paginatedData);

            // Обновляем информацию о пагинации
            setPagination({
                currentPage: page,
                perPage,
                hasMore: endIndex < (curatorsData || []).length,
            });

        } catch (err) {
            console.error('Ошибка при загрузке кураторов:', err);
            setError(err instanceof Error ? err : new Error('Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCurators();
    }, []);

    return {
        curators,
        loading,
        error,
        pagination,
        loadCurators,
    };
} 