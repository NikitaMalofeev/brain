import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { customAlphabet } from 'nanoid';

// Base62 алфавит для генерации токенов, как в документации
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 16); // 16 символов

// Интерфейс для токена, включая связанные данные для отображения
export interface AccessToken {
    id: string;
    token: string;
    course_id: string;
    tariff_id: string;
    status: 'created' | 'used' | 'revoked';
    used_by_user_id?: string;
    used_at?: string;
    created_by_user_id?: string;
    comment?: string;
    created_at: string;
    courses?: { title: string };
    tariffs?: { name: string };
    users?: { first_name: string, last_name: string, telegram_id: string };
}

// Данные для создания пачки токенов
export interface TokenCreationData {
    count: number;
    tariff_id: string;
    course_id: string;
    comment?: string;
}

// Функция для загрузки всех токенов с JOIN'ами
const fetchTokens = async (): Promise<AccessToken[]> => {
    const { data, error } = await supabase!
        .from('access_tokens')
        .select(`
            *,
            courses (title),
            tariffs (name),
            users!used_by_user_id (first_name, last_name, telegram_id)
        `)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

// Функция для batch-создания токенов
const createTokensMutation = async (formData: TokenCreationData): Promise<any> => {
    const { count, tariff_id, course_id, comment } = formData;

    // Получаем данные текущего админа из localStorage
    const adminUserData = localStorage.getItem('admin_user');

    let currentUser;
    try {
        currentUser = adminUserData ? JSON.parse(adminUserData) : null;
    } catch {
        throw new Error("Ошибка данных пользователя");
    }

    if (!currentUser?.id) {
        throw new Error("Пользователь не найден");
    }

    const tokensToInsert = Array.from({ length: count }, () => ({
        token: nanoid(),
        tariff_id,
        course_id,
        comment,
        created_by_user_id: currentUser.id
    }));

    const { data, error } = await supabase!
        .from('access_tokens')
        .insert(tokensToInsert)
        .select();

    if (error) throw new Error(error.message);
    return data;
};

// Функция для отзыва токена
const revokeTokenMutation = async (id: string): Promise<AccessToken> => {
    const { data, error } = await supabase!
        .from('access_tokens')
        .update({ status: 'revoked' })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

/**
 * Хук для административного управления токенами доступа
 */
export function useTokensAdmin() {
    const queryClient = useQueryClient();

    const {
        data: tokens = [],
        isLoading,
        error,
        refetch
    } = useQuery<AccessToken[]>({
        queryKey: ['access_tokens'],
        queryFn: fetchTokens,
    });

    const createTokens = useMutation({
        mutationFn: createTokensMutation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access_tokens'] });
        },
    });

    const revokeToken = useMutation({
        mutationFn: revokeTokenMutation,
        onSuccess: (updatedToken) => {
            queryClient.setQueryData(['access_tokens'], (oldData: AccessToken[] | undefined) => {
                return oldData ? oldData.map(token => token.id === updatedToken.id ? updatedToken : token) : [];
            });
        }
    })

    return {
        tokens,
        isLoading,
        error,
        refetch,

        createTokens: createTokens.mutateAsync,
        isCreating: createTokens.isPending,
        createError: createTokens.error,

        revokeToken: revokeToken.mutateAsync,
        isRevoking: revokeToken.isPending,
        revokeError: revokeToken.error,
    };
} 