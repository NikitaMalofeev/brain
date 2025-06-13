import { useSupabaseDetector } from './useSupabaseDetector';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Универсальный хелпер для возврата mock-данных при падении Supabase
 * @param realData - реальные данные из Supabase
 * @param mockData - mock-данные для offline/dev-режима
 * @returns realData или mockData в зависимости от статуса Supabase
 */
export function useWithSupabaseFallback<T>(realData: T, mockData: T): T {
    const { isSupabaseAvailable } = useSupabaseDetector();
    return isSupabaseAvailable ? realData : mockData;
}

/**
 * Специализированный хелпер для React Query хуков
 * Автоматически создает мок UseQueryResult из простых данных
 */
export function useQueryWithSupabaseFallback<T>(
    query: UseQueryResult<T, Error>,
    mockData: T
): UseQueryResult<T, Error> {
    const { isSupabaseAvailable } = useSupabaseDetector();

    if (isSupabaseAvailable) {
        return query;
    }

    // Создаем мок UseQueryResult
    return {
        data: mockData,
        isLoading: false,
        isError: false,
        isPending: false,
        isSuccess: true,
        isFetched: true,
        isFetchedAfterMount: true,
        isRefetching: false,
        isLoadingError: false,
        isRefetchError: false,
        status: 'success',
        error: null,
        refetch: () => Promise.resolve({ data: mockData } as any),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        isPlaceholderData: false,
        isPreviousData: false,
        isStale: false,
        fetchStatus: 'idle',
        remove: () => { },
        isIdle: false,
        isFetching: false,
        isInitialLoading: false,
        isPaused: false,
        errorUpdateCount: 0,
        promise: Promise.resolve(mockData),
    } as UseQueryResult<T, Error>;
} 