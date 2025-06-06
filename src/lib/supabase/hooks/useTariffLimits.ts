import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';

// Типы для лимитов тарифов
export interface TariffLimit {
    id: string;
    stage_id: number;
    tariff_id: string;
    max_days_access?: number | null; // null или 0 означает полный доступ
    requires_full_prereq: boolean;
    created_at: string;
    updated_at: string;
}

// Данные для создания/обновления лимита тарифа
export interface TariffLimitFormData {
    stage_id: number;
    tariff_id: string;
    max_days_access?: number | null;
    requires_full_prereq: boolean;
}

// Результат объединения тарифа с его лимитами для этапа
export interface TariffWithLimits {
    id: string;
    name: string;
    code: string;
    max_days_access?: number | null;
    requires_full_prereq: boolean;
}

// Функция для получения лимитов тарифов для этапа
const fetchTariffLimits = async (stageId: number): Promise<TariffWithLimits[]> => {
    if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
    }

    // Сначала получаем все тарифы
    const { data: tariffsData, error: tariffsError } = await supabase
        .from('tariffs')
        .select('id, name, code')
        .order('code', { ascending: true });

    if (tariffsError) {
        throw new Error(tariffsError.message);
    }

    // Затем получаем лимиты для данного этапа
    const { data: limitsData, error: limitsError } = await supabase
        .from('tariff_limits')
        .select('tariff_id, max_days_access, requires_full_prereq')
        .eq('stage_id', stageId);

    if (limitsError) {
        throw new Error(limitsError.message);
    }

    // Объединяем данные
    const result: TariffWithLimits[] = (tariffsData || []).map(tariff => {
        const limit = limitsData?.find(l => l.tariff_id === tariff.id);
        return {
            id: tariff.id,
            name: tariff.name,
            code: tariff.code,
            max_days_access: limit?.max_days_access || null,
            requires_full_prereq: limit?.requires_full_prereq || false,
        };
    });

    return result;
};

// Функция для сохранения/обновления лимитов тарифов
const saveTariffLimitsMutation = async ({ stageId, limits }: {
    stageId: number;
    limits: Array<{ tariffId: string; maxDaysAccess?: number | null; requiresFullPrereq: boolean }>
}): Promise<void> => {
    if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
    }

    // Удаляем существующие лимиты для этого этапа
    const { error: deleteError } = await supabase
        .from('tariff_limits')
        .delete()
        .eq('stage_id', stageId);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    // Добавляем новые лимиты (только для тех тарифов, где есть настройки)
    const limitsToInsert = limits.filter(limit =>
        (limit.maxDaysAccess !== undefined && limit.maxDaysAccess !== null) || limit.requiresFullPrereq
    ).map(limit => ({
        stage_id: stageId,
        tariff_id: limit.tariffId,
        max_days_access: limit.maxDaysAccess,
        requires_full_prereq: limit.requiresFullPrereq,
    }));

    if (limitsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from('tariff_limits')
            .insert(limitsToInsert);

        if (insertError) {
            throw new Error(insertError.message);
        }
    }
};

/**
 * Хук для работы с лимитами тарифов для этапов курса
 * Использует React Query для эффективного управления состоянием и кэшированием
 */
export function useTariffLimits(stageId: number) {
    const queryClient = useQueryClient();

    // Получение лимитов тарифов для этапа
    const {
        data: tariffLimits = [],
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['tariff-limits', stageId],
        queryFn: () => fetchTariffLimits(stageId),
        enabled: !!stageId,
    });

    // Мутация для сохранения лимитов
    const saveLimitsMut = useMutation({
        mutationFn: saveTariffLimitsMutation,
        onSuccess: () => {
            // Инвалидируем кэш лимитов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['tariff-limits', stageId] });
        },
    });

    return {
        // Данные
        tariffLimits,
        loading,
        error,
        refetch,

        // Операции сохранения
        saveTariffLimits: (limits: Array<{ tariffId: string; maxDaysAccess?: number | null; requiresFullPrereq: boolean }>) =>
            saveLimitsMut.mutateAsync({ stageId, limits }),
        savingLimits: saveLimitsMut.isPending,
        saveLimitsError: saveLimitsMut.error,
    };
} 