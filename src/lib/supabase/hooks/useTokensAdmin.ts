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

// Константы для статусов персональных токенов
export const PERSONAL_TOKEN_STATUSES = {
    AUTO_ACTIVATED: 'Активирован автоматически',
    PENDING_ACTIVATION: 'Ожидает активации',
    CREATED: 'Создан',
    USED: 'Использован',
    REVOKED: 'Отозван'
} as const;

// Сообщения для UI
export const PERSONAL_TOKEN_MESSAGES = {
    SUCCESS_AUTO_ACTIVATED: '✅ Тариф успешно назначен пользователю!\n\nПользователь найден в системе - тариф активирован автоматически.',
    SUCCESS_PENDING: '✅ Персональный токен создан!\n\nТариф будет активирован при первом входе пользователя в приложение.',
    ERROR_ACTIVE_TARIFF: '⚠️ Невозможно создать токен\n\nУ данного пользователя уже есть активный тариф. Один пользователь может иметь только один активный тариф.',
    ERROR_TOKEN_EXISTS: '⚠️ Невозможно создать токен\n\nДля данного Telegram ID уже создан персональный токен. Дождитесь его активации или отзовите существующий токен.',
    ERROR_DATA_NOT_FOUND: '❌ Ошибка данных\n\n{error}\n\nПроверьте правильность выбранного курса и тарифа.',
    ERROR_GENERAL: '❌ Ошибка при назначении тарифа\n\n{error}'
} as const;
//#endregion

//#region Utility Functions

// @anchor: get-token-display-status-3f8b
/// <summary>
/// Утилитарная функция для получения отображаемого статуса токена
/// </summary>
/// <param name="token">AccessToken - токен для анализа</param>
/// <returns>string - отображаемый статус</returns>
export const getTokenDisplayStatus = (token: AccessToken): string => {
    // Для персональных токенов со статусом 'used' показываем специальный статус
    if (token.tg_id && token.status === 'used') {
        return PERSONAL_TOKEN_STATUSES.AUTO_ACTIVATED;
    }

    // Для персональных токенов со статусом 'created' показываем ожидание
    if (token.tg_id && token.status === 'created') {
        return PERSONAL_TOKEN_STATUSES.PENDING_ACTIVATION;
    }

    // Для обычных токенов возвращаем русские переводы базовых статусов
    switch (token.status) {
        case 'created':
            return PERSONAL_TOKEN_STATUSES.CREATED;
        case 'used':
            return PERSONAL_TOKEN_STATUSES.USED;
        case 'revoked':
            return PERSONAL_TOKEN_STATUSES.REVOKED;
        default:
            return token.status;
    }
};

// @anchor: get-token-css-class-7d2e  
/// <summary>
/// Утилитарная функция для получения CSS класса статуса токена
/// </summary>
/// <param name="token">AccessToken - токен для анализа</param>
/// <returns>string - CSS класс для статуса</returns>
export const getTokenStatusCssClass = (token: AccessToken): string => {
    // Для персональных токенов используем специальные классы
    if (token.tg_id && token.status === 'used') {
        return 'status-auto-activated';
    }

    if (token.tg_id && token.status === 'created') {
        return 'status-pending-activation';
    }

    // Для обычных токенов возвращаем стандартные классы
    return `status-${token.status}`;
};

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

        // Форматируем ошибку согласно константам
        let formattedError = data.error;
        if (data.error.includes('уже есть активный тариф')) {
            formattedError = PERSONAL_TOKEN_MESSAGES.ERROR_ACTIVE_TARIFF;
        } else if (data.error.includes('уже создан персональный токен')) {
            formattedError = PERSONAL_TOKEN_MESSAGES.ERROR_TOKEN_EXISTS;
        } else if (data.error.includes('не найден')) {
            formattedError = PERSONAL_TOKEN_MESSAGES.ERROR_DATA_NOT_FOUND.replace('{error}', data.error);
        } else {
            formattedError = PERSONAL_TOKEN_MESSAGES.ERROR_GENERAL.replace('{error}', data.error);
        }

        throw new Error(formattedError);
    }

    // Проверяем успешный результат
    if (!data || !data.ok) {
        console.error('❌ [PersonalToken] Некорректный ответ функции:', data);
        throw new Error('Функция не вернула корректный результат');
    }

    console.log('✅ [PersonalToken] Персональный токен успешно создан и назначен:', data);

    // Добавляем флаг для UI на основе ответа функции
    return {
        ...data,
        displayMessage: data.auto_activated
            ? PERSONAL_TOKEN_MESSAGES.SUCCESS_AUTO_ACTIVATED
            : PERSONAL_TOKEN_MESSAGES.SUCCESS_PENDING
    };
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