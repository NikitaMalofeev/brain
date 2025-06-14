import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';

// Типы для хука кураторов
export interface Curator {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    telegram_id: string | null;
    username?: string;
    web_login?: string;
    photo_url?: string | null;
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
    username: string; // Сделано обязательным
}

export interface UpdateCuratorData {
    first_name?: string;
    last_name?: string;
    username?: string;
    web_login?: string;
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
    updateCurator: (userId: string, data: UpdateCuratorData) => Promise<{ success: boolean; error?: string }>;
    deleteCurator: (userId: string) => Promise<{ success: boolean; error?: string }>;
    updateCuratorAvatar: (userId: string, photoUrl: string) => Promise<void>;
    deleteCuratorAvatar: (userId: string) => Promise<void>;
}

/**
 * Асинхронная функция для загрузки кураторов и подсчета их студентов.
 * Вынесена для возможности переиспользования и тестирования.
 */
const fetchCurators = async (): Promise<Curator[]> => {
    if (!supabase) {
        throw new Error('Supabase client is not initialized');
    }

    // 1. Загружаем пользователей с ролью "куратор"
    const { data: curatorsData, error: curatorsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, telegram_id, username, web_login, photo_url, created_at, web_last_login')
        .eq('role', 'curator')
        .order('created_at', { ascending: false });

    if (curatorsError) throw curatorsError;
    if (!curatorsData) return [];

    // 2. Получаем количество учеников для каждого куратора
    const curatorIds = curatorsData.map(c => c.id);
    const { data: studentCountsData, error: countError } = await supabase
        .from('user_curator')
        .select('curator_id')
        .in('curator_id', curatorIds);

    if (countError) {
        console.warn('Could not fetch student counts:', countError.message);
    }

    // Группируем и считаем студентов на клиенте
    const studentCounts = (studentCountsData || []).reduce((acc, { curator_id }) => {
        if (curator_id) {
            acc[curator_id] = (acc[curator_id] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // 3. Соединяем данные
    const combinedData: Curator[] = curatorsData.map(user => ({
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        telegram_id: user.telegram_id,
        username: user.username,
        web_login: user.web_login,
        photo_url: user.photo_url,
        created_at: user.created_at,
        web_last_login: user.web_last_login,
        assigned_students_count: studentCounts[user.id] || 0,
    }));

    return combinedData;
};

/**
 * Хук для административного управления кураторами с использованием React Query.
 * Предоставляет функции для чтения, создания и обновления кураторов.
 */
export function useCuratorsAdmin() {
    const queryClient = useQueryClient();

    // Запрос для получения списка кураторов
    const {
        data: curators = [],
        isLoading,
        isError,
        error,
        refetch
    } = useQuery<Curator[], Error>({
        queryKey: ['curators'],
        queryFn: fetchCurators,
    });

    // Мутация для создания нового куратора
    const { mutateAsync: createCurator, isPending: isCreating } = useMutation({
        mutationFn: async (data: CreateCuratorData) => {
            if (!supabase) throw new Error('Supabase клиент не инициализирован');

            // Валидация на клиенте
            if (!data.web_login.trim()) throw new Error('Логин обязателен для заполнения');
            if (!data.web_password.trim()) throw new Error('Пароль обязателен для заполнения');
            if (data.web_password.length < 8) throw new Error('Пароль должен быть не менее 8 символов');
            if (!/^[a-zA-Z0-9_-]+$/.test(data.web_login)) throw new Error('Логин может содержать только буквы, цифры, _ и -');
            if (!data.username.trim()) throw new Error('Юзернейм Telegram обязателен');

            const { error: createError } = await supabase.rpc('create_curator', {
                p_web_login: data.web_login.trim(),
                p_web_password: data.web_password,
                p_first_name: data.first_name?.trim() || null,
                p_last_name: data.last_name?.trim() || null,
                p_telegram_username: data.username.trim()
            });

            if (createError) {
                if (createError.message.includes('web_login')) {
                    throw new Error('Такой логин уже существует');
                }
                throw createError;
            }
        },
        onSuccess: () => {
            // Инвалидация кеша для автоматического обновления списка кураторов
            return queryClient.invalidateQueries({ queryKey: ['curators'] });
        },
    });

    // Мутация для обновления информации о кураторе
    const { mutateAsync: updateCurator, isPending: isUpdating } = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: UpdateCuratorData }) => {
            if (!supabase) throw new Error('Supabase клиент не инициализирован');

            // Валидация полей аналогично созданию
            if (!data.first_name?.trim()) {
                throw new Error('Имя обязательно для заполнения');
            }

            if (data.web_login) {
                if (!data.web_login.trim()) {
                    throw new Error('Логин не может быть пустым');
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(data.web_login)) {
                    throw new Error('Логин может содержать только буквы, цифры, _ и -');
                }
            }

            if (!data.username?.trim()) {
                throw new Error('Юзернейм Telegram обязателен для заполнения');
            }

            const { error: updateError } = await supabase.rpc('update_curator', {
                p_user_id: userId,
                p_web_login: data.web_login?.trim() || null,
                p_first_name: data.first_name?.trim() || null,
                p_last_name: data.last_name?.trim() || null,
                p_username: data.username?.trim() || null,
            });

            if (updateError) {
                if (updateError.message.includes('логином уже существует')) {
                    throw new Error('Пользователь с таким логином уже существует');
                }
                throw updateError;
            }
        },
        onSuccess: () => {
            // Инвалидация кеша
            return queryClient.invalidateQueries({ queryKey: ['curators'] });
        },
    });

    // Мутация для удаления куратора
    const { mutateAsync: deleteCurator, isPending: isDeleting } = useMutation({
        mutationFn: async (userId: string) => {
            if (!supabase) throw new Error('Supabase клиент не инициализирован');

            const { data, error: deleteError } = await supabase.rpc('delete_curator', {
                p_user_id: userId,
            });

            if (deleteError) {
                throw deleteError;
            }

            return data;
        },
        onSuccess: () => {
            // Инвалидация кеша
            return queryClient.invalidateQueries({ queryKey: ['curators'] });
        },
    });

    // Мутация для обновления аватара куратора
    const { mutateAsync: updateCuratorAvatar, isPending: isUpdatingAvatar } = useMutation({
        mutationFn: async ({ userId, photoUrl }: { userId: string; photoUrl: string }) => {
            if (!supabase) throw new Error('Supabase клиент не инициализирован');

            const { error: updateError } = await supabase
                .from('users')
                .update({ photo_url: photoUrl })
                .eq('id', userId);

            if (updateError) {
                throw updateError;
            }
        },
        onSuccess: () => {
            // Инвалидация кеша для обновления списка кураторов
            return queryClient.invalidateQueries({ queryKey: ['curators'] });
        },
    });

    // Мутация для удаления аватара куратора
    const { mutateAsync: deleteCuratorAvatar, isPending: isDeletingAvatar } = useMutation({
        mutationFn: async (userId: string) => {
            if (!supabase) throw new Error('Supabase клиент не инициализирован');

            const { error: deleteError } = await supabase
                .from('users')
                .update({ photo_url: null })
                .eq('id', userId);

            if (deleteError) {
                throw deleteError;
            }
        },
        onSuccess: () => {
            // Инвалидация кеша для обновления списка кураторов
            return queryClient.invalidateQueries({ queryKey: ['curators'] });
        },
    });

    return {
        curators,
        loading: isLoading,
        error: isError ? error : null,
        refetchCurators: refetch,
        createCurator,
        isCreating,
        updateCurator,
        isUpdating,
        deleteCurator,
        isDeleting,
        updateCuratorAvatar,
        isUpdatingAvatar,
        deleteCuratorAvatar,
        isDeletingAvatar,
    };
} 