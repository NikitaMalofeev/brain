/*
name: useTokensAdmin
role: BoundedContext
responsibility: Административное управление токенами доступа с поддержкой обычных и персональных токенов
*/

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { customAlphabet } from 'nanoid';

/* DEPENDS: supabase-client, react-query, nanoid */
// TAGS: admin, tokens, personal-tokens, access-control, rpc

//#region Configuration
// Base62 алфавит для генерации токенов, как в документации
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 16); // 16 символов
//#endregion

//#region TypeScript Interfaces

// @anchor: access-token-interface-2f4a
/// <summary>
/// Интерфейс для токена доступа, включая связанные данные для отображения в админке
/// </summary>
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
    tg_id?: number; // Telegram ID для персональных токенов
    courses?: { title: string };
    tariffs?: { name: string };
    users?: { first_name: string, last_name: string, telegram_id: string };
}

// @anchor: token-creation-data-7b8c
/// <summary>
/// Данные для создания пачки обычных токенов (генерация ссылок)
/// </summary>
export interface TokenCreationData {
    count: number;
    tariff_id: string;
    course_id: string;
    comment?: string;
}

// @anchor: personal-token-data-9e1d
/// <summary>
/// Данные для создания персонального токена (автоматическое назначение)
/// </summary>
export interface PersonalTokenData {
    tg_id: number;
    tariff_id: string;
    course_id: string;
    comment?: string;
}

//#endregion

//#region Data Fetching Functions

// @anchor: fetch-tokens-3c6a
/// <summary>
/// Функция для загрузки всех токенов с JOIN'ами для отображения в админке
/// </summary>
/// <returns>Promise<AccessToken[]> - массив токенов с связанными данными</returns>
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

//#endregion

//#region Mutation Functions

// @anchor: create-tokens-batch-4a7e
/// <summary>
/// Функция для batch-создания обычных токенов (создает записи в БД для последующей генерации ссылок)
/// </summary>
/// <param name="formData">TokenCreationData - данные для создания токенов</param>
/// <returns>Promise<any> - созданные токены</returns>
const createTokensMutation = async (formData: TokenCreationData): Promise<any> => {
    const { count, tariff_id, course_id, comment } = formData;

    // SECTION: business-rules/AdminAuthentication
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

// @anchor: revoke-token-5b2f
/// <summary>
/// Функция для отзыва токена (изменение статуса на 'revoked')
/// </summary>
/// <param name="id">string - ID токена для отзыва</param>
/// <returns>Promise<AccessToken> - обновленный токен</returns>
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

// @anchor: assign-personal-token-8c4d
/// <summary>
/// Функция для создания персонального токена через RPC (создает и сразу активирует)
/// </summary>
/// <param name="formData">PersonalTokenData - данные для создания персонального токена</param>
/// <returns>Promise<any> - результат RPC операции</returns>
const assignPersonalTokenMutation = async (formData: PersonalTokenData): Promise<any> => {
    const { tg_id, tariff_id, course_id, comment } = formData;

    console.log('🚀 [PersonalToken] Начинаем создание персонального токена:', {
        tg_id,
        tariff_id,
        course_id,
        comment
    });

    // SECTION: business-rules/AdminAuthentication
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

    console.log('👤 [PersonalToken] Данные админа:', {
        admin_id: currentUser.id,
        admin_email: currentUser.email
    });

    // SECTION: business-rules/PersonalTokenAssignment
    // Вызываем RPC функцию для создания и активации персонального токена
    const { data, error } = await supabase!
        .rpc('assign_access_token_to_user', {
            p_tg_id: tg_id,
            p_tariff_id: tariff_id,
            p_course_id: course_id,
            p_comment: comment,
            p_created_by_user_id: currentUser.id
        });

    console.log('📊 [PersonalToken] Результат RPC функции:', {
        data,
        error,
        hasError: !!error
    });

    // SECTION: business-rules/ErrorHandling  
    // Сначала проверяем ошибки Supabase (сетевые/системные)
    if (error) {
        console.error('❌ [PersonalToken] Системная ошибка RPC:', error);
        throw new Error(error.message || 'Системная ошибка при вызове функции');
    }

    // Затем проверяем бизнес-ошибки в data (функция возвращает JSON с полем error)
    if (data && data.error) {
        console.error('❌ [PersonalToken] Бизнес-ошибка от функции:', data.error);
        throw new Error(data.error);
    }

    // Проверяем успешный результат
    if (!data || !data.ok) {
        console.error('❌ [PersonalToken] Некорректный ответ функции:', data);
        throw new Error('Функция не вернула корректный результат');
    }

    console.log('✅ [PersonalToken] Персональный токен успешно создан и назначен:', data);
    return data;
};

//#endregion

//#region Main Hook

// @anchor: use-tokens-admin-hook-1a9b
/// <summary>
/// Хук для административного управления токенами доступа
/// Поддерживает создание обычных и персональных токенов, отзыв токенов
/// </summary>
/// <returns>Объект с методами и состояниями для управления токенами</returns>
export function useTokensAdmin() {
    const queryClient = useQueryClient();

    //#region Query для загрузки токенов
    const {
        data: tokens = [],
        isLoading,
        error,
        refetch
    } = useQuery<AccessToken[]>({
        queryKey: ['access_tokens'],
        queryFn: fetchTokens,
    });
    //#endregion

    //#region Мутации
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

    const assignPersonalToken = useMutation({
        mutationFn: assignPersonalTokenMutation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access_tokens'] });
        },
    });
    //#endregion

    return {
        // Data
        tokens,
        isLoading,
        error,
        refetch,

        // Mutations for regular tokens
        createTokens: createTokens.mutateAsync,
        isCreating: createTokens.isPending,
        createError: createTokens.error,

        // Mutations for token management
        revokeToken: revokeToken.mutateAsync,
        isRevoking: revokeToken.isPending,
        revokeError: revokeToken.error,

        // Mutations for personal tokens
        assignPersonalToken: assignPersonalToken.mutateAsync,
        isAssigning: assignPersonalToken.isPending,
        assignError: assignPersonalToken.error,
    };
}

//#endregion 