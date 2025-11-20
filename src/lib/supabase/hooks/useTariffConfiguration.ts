import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Интерфейсы для работы с конфигурацией тарифов
 */

export interface TariffModuleConfig {
  tariff_stream_module_id: string;
  stream_module_id: string;
  module_name: string;
  access_duration_days: number | null;
  order_num: number;
  techniques: TariffTechniqueConfig[];
}

export interface TariffTechniqueConfig {
  tariff_module_technique_id?: string;
  technique_id: string;
  technique_title: string;
  unlock_offset_days: number;
  order_num: number;
}

export interface TariffConfiguration {
  stream_tariff_id: string;
  modules: TariffModuleConfig[];
}

/**
 * Хук для получения конфигурации тарифа для потока
 */
export function useTariffConfiguration(streamId: string | null, tariffId: string | null) {
  return useQuery({
    queryKey: ['tariff-configuration', streamId, tariffId],
    queryFn: async (): Promise<TariffConfiguration | null> => {
      if (!streamId || !tariffId || !supabase) {
        return null;
      }

      logger.debug('Fetching tariff configuration', { streamId, tariffId });

      const { data, error } = await supabase.rpc('get_tariff_configuration', {
        p_stream_id: streamId,
        p_tariff_id: tariffId,
      });

      if (error) {
        logger.error('Error fetching tariff configuration', { streamId, tariffId, error });
        throw error;
      }

      // Группировать по модулям
      const modulesMap = new Map<string, TariffModuleConfig>();

      data?.forEach((row: any) => {
        if (!modulesMap.has(row.module_id)) {
          modulesMap.set(row.module_id, {
            tariff_stream_module_id: row.tariff_stream_module_id,
            stream_module_id: row.module_id,
            module_name: row.module_name,
            access_duration_days: row.access_duration_days,
            order_num: row.module_order_num,
            techniques: [],
          });
        }

        if (row.technique_id) {
          modulesMap.get(row.module_id)!.techniques.push({
            technique_id: row.technique_id,
            technique_title: row.technique_title,
            unlock_offset_days: row.unlock_offset_days,
            order_num: row.technique_order_num,
          });
        }
      });

      return {
        stream_tariff_id: data?.[0]?.stream_tariff_id || '',
        modules: Array.from(modulesMap.values()),
      };
    },
    enabled: !!streamId && !!tariffId,
    staleTime: 1 * 60 * 1000, // 1 минута
  });
}

/**
 * Хук для сохранения модуля в тариф
 */
export function useAddModuleToTariff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stream_tariff_id: string;
      stream_module_id: string;
      access_duration_days: number | null;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Adding module to tariff', params);

      const { data, error } = await supabase
        .from('tariff_stream_modules')
        .insert({
          stream_tariff_id: params.stream_tariff_id,
          stream_module_id: params.stream_module_id,
          access_duration_days: params.access_duration_days,
          order_num: params.order_num,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding module to tariff', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для обновления модуля в тарифе
 */
export function useUpdateModuleInTariff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tariff_stream_module_id: string;
      access_duration_days: number | null;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating module in tariff', params);

      const { data, error } = await supabase
        .from('tariff_stream_modules')
        .update({
          access_duration_days: params.access_duration_days,
          order_num: params.order_num,
        })
        .eq('id', params.tariff_stream_module_id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating module in tariff', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для удаления модуля из тарифа
 */
export function useRemoveModuleFromTariff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tariffStreamModuleId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing module from tariff', { tariffStreamModuleId });

      const { error } = await supabase
        .from('tariff_stream_modules')
        .delete()
        .eq('id', tariffStreamModuleId);

      if (error) {
        logger.error('Error removing module from tariff', { tariffStreamModuleId, error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для добавления техники в модуль тарифа
 */
export function useAddTechniqueToTariffModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tariff_stream_module_id: string;
      technique_id: string;
      unlock_offset_days: number;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Adding technique to tariff module', params);

      const { data, error } = await supabase
        .from('tariff_module_techniques')
        .insert({
          tariff_stream_module_id: params.tariff_stream_module_id,
          technique_id: params.technique_id,
          unlock_offset_days: params.unlock_offset_days,
          order_num: params.order_num,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding technique to tariff module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для обновления техники в модуле тарифа
 */
export function useUpdateTechniqueInTariffModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tariff_module_technique_id: string;
      unlock_offset_days: number;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating technique in tariff module', params);

      const { data, error } = await supabase
        .from('tariff_module_techniques')
        .update({
          unlock_offset_days: params.unlock_offset_days,
          order_num: params.order_num,
        })
        .eq('id', params.tariff_module_technique_id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating technique in tariff module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для удаления техники из модуля тарифа
 */
export function useRemoveTechniqueFromTariffModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tariffModuleTechniqueId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Removing technique from tariff module', { tariffModuleTechniqueId });

      const { error } = await supabase
        .from('tariff_module_techniques')
        .delete()
        .eq('id', tariffModuleTechniqueId);

      if (error) {
        logger.error('Error removing technique from tariff module', { tariffModuleTechniqueId, error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для получения всех потоков
 */
export function useStreams() {
  return useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching streams', { error });
        throw error;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для получения всех тарифов
 */
export function useTariffs() {
  return useQuery({
    queryKey: ['tariffs'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('tariffs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching tariffs', { error });
        throw error;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Хук для получения stream_tariff_id
 */
export function useStreamTariffId(streamId: string | null, tariffId: string | null) {
  return useQuery({
    queryKey: ['stream-tariff-id', streamId, tariffId],
    queryFn: async (): Promise<string | null> => {
      if (!streamId || !tariffId || !supabase) {
        return null;
      }

      const { data, error } = await supabase
        .from('stream_tariffs')
        .select('id')
        .eq('stream_id', streamId)
        .eq('tariff_id', tariffId)
        .single();

      if (error) {
        logger.error('Error fetching stream_tariff_id', { streamId, tariffId, error });
        throw error;
      }

      return data?.id || null;
    },
    enabled: !!streamId && !!tariffId,
    staleTime: 10 * 60 * 1000, // 10 минут
  });
}
