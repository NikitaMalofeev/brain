import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';

// Типы для тарифов
export interface Tariff {
    id: string;
    name: string;
    code: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

// Данные для создания/обновления тарифа
export interface TariffFormData {
    name: string;
    code: string;
    description?: string;
}

// Функция для получения всех тарифов
const fetchTariffs = async (): Promise<Tariff[]> => {
    if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariffs')
        .select('*')
        .order('code', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

// Функция для создания тарифа
const createTariffMutation = async (formData: TariffFormData): Promise<Tariff> => {
    if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
    }

    const { data, error } = await supabase
        .from('tariffs')
        .insert([{
            name: formData.name,
            code: formData.code,
            description: formData.description || null,
        }])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

// Функция для обновления тарифа
const updateTariffMutation = async ({ id, formData }: { id: string; formData: Partial<TariffFormData> }): Promise<Tariff> => {
    if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
    }

    const updateData: any = {};
    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.code !== undefined) updateData.code = formData.code;
    if (formData.description !== undefined) updateData.description = formData.description || null;

    const { data, error } = await supabase
        .from('tariffs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

// Функция для удаления тарифа
const deleteTariffMutation = async (id: string): Promise<void> => {
    if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
    }

    const { error } = await supabase
        .from('tariffs')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
};

/**
 * Хук для административного управления тарифами
 * Использует React Query для эффективного управления состоянием и кэшированием
 */
export function useTariffsAdmin() {
    const queryClient = useQueryClient();

    // Получение всех тарифов
    const {
        data: tariffs = [],
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['tariffs'],
        queryFn: fetchTariffs,
    });

    // Мутация для создания тарифа
    const createTariffMut = useMutation({
        mutationFn: createTariffMutation,
        onSuccess: () => {
            // Инвалидируем кэш тарифов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['tariffs'] });
        },
    });

    // Мутация для обновления тарифа
    const updateTariffMut = useMutation({
        mutationFn: updateTariffMutation,
        onSuccess: () => {
            // Инвалидируем кэш тарифов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['tariffs'] });
        },
    });

    // Мутация для удаления тарифа
    const deleteTariffMut = useMutation({
        mutationFn: deleteTariffMutation,
        onSuccess: () => {
            // Инвалидируем кэш тарифов для перезагрузки данных
            queryClient.invalidateQueries({ queryKey: ['tariffs'] });
        },
    });

    return {
        // Данные
        tariffs,
        loading,
        error,
        refetch,

        // Операции создания
        createTariff: createTariffMut.mutateAsync,
        createTariffLoading: createTariffMut.isPending,
        createTariffError: createTariffMut.error,

        // Операции обновления
        updateTariff: (id: string, formData: Partial<TariffFormData>) =>
            updateTariffMut.mutateAsync({ id, formData }),
        updateTariffLoading: updateTariffMut.isPending,
        updateTariffError: updateTariffMut.error,

        // Операции удаления
        deleteTariff: deleteTariffMut.mutateAsync,
        deleteTariffLoading: deleteTariffMut.isPending,
        deleteTariffError: deleteTariffMut.error,

        // Общие состояния мутаций
        isMutating: createTariffMut.isPending || updateTariffMut.isPending || deleteTariffMut.isPending,
    };
} 