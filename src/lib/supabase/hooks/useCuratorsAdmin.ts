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

export interface CreateCuratorData {
    first_name?: string;
    last_name?: string;
    web_login: string;
    web_password: string;
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
    createCurator: (data: CreateCuratorData) => Promise<{ success: boolean; error?: string }>;
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

    // Создание нового куратора
    const createCurator = async (data: CreateCuratorData): Promise<{ success: boolean; error?: string }> => {
        if (!supabase) {
            return { success: false, error: 'Supabase клиент не инициализирован' };
        }

        try {
            // Валидация обязательных полей
            if (!data.web_login.trim()) {
                return { success: false, error: 'Логин обязателен для заполнения' };
            }

            if (!data.web_password.trim()) {
                return { success: false, error: 'Пароль обязателен для заполнения' };
            }

            // Проверка требований к паролю
            if (data.web_password.length < 8) {
                return { success: false, error: 'Пароль должен содержать минимум 8 символов' };
            }

            // Валидация web_login (только буквы, цифры, _, -)
            if (!/^[a-zA-Z0-9_-]+$/.test(data.web_login)) {
                return { success: false, error: 'Логин может содержать только буквы, цифры, _ и -' };
            }

            // Создаем куратора через SQL функцию
            const { data: result, error: createError } = await supabase
                .rpc('create_curator', {
                    p_web_login: data.web_login.trim(),
                    p_web_password: data.web_password,
                    p_first_name: data.first_name?.trim() || null,
                    p_last_name: data.last_name?.trim() || null
                });

            if (createError) {
                // Обработка специфических ошибок
                if (createError.message.includes('web_login')) {
                    return { success: false, error: 'Такой логин уже существует' };
                }
                throw createError;
            }

            return { success: true };

        } catch (err) {
            console.error('Ошибка при создании куратора:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Неизвестная ошибка при создании куратора'
            };
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
        createCurator,
    };
} 