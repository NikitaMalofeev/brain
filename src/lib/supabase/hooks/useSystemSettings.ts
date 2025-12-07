import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Типы для системных настроек
 */

// Настройки кнопок библиотеки
export interface LibraryButtonConfig {
  label: string;
  url: string;
  enabled: boolean;
}

export interface LibraryButtonsSettings {
  library_button: LibraryButtonConfig;
  bioregulation_button: LibraryButtonConfig;
}

// Дефолтные настройки кнопок
const DEFAULT_LIBRARY_BUTTONS: LibraryButtonsSettings = {
  library_button: {
    label: 'Библиотека',
    url: '',
    enabled: true,
  },
  bioregulation_button: {
    label: 'Запустить биорегулирование',
    url: '',
    enabled: true,
  },
};

/**
 * Хук для получения системной настройки по ключу
 */
export function useSystemSetting<T = unknown>(key: string, defaultValue?: T) {
  return useQuery({
    queryKey: ['system-setting', key],
    queryFn: async (): Promise<T | null> => {
      if (!supabase) {
        logger.error('Supabase client not initialized');
        return defaultValue || null;
      }

      logger.debug('Fetching system setting', { key });

      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        // Если настройка не найдена - вернём дефолт
        if (error.code === 'PGRST116') {
          logger.debug('System setting not found, using default', { key });
          return defaultValue || null;
        }
        logger.error('Error fetching system setting', { key, error });
        throw error;
      }

      logger.debug('System setting fetched', { key, data: data?.value });
      return (data?.value as T) || defaultValue || null;
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });
}

/**
 * Хук для обновления системной настройки (только для админов)
 */
export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { key: string; value: unknown }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      logger.debug('Updating system setting', params);

      // Используем upsert для создания или обновления
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key: params.key,
            value: params.value,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          }
        )
        .select()
        .single();

      if (error) {
        logger.error('Error updating system setting', { params, error });
        throw error;
      }

      logger.info('System setting updated', params);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-setting', variables.key] });
    },
  });
}

/**
 * Специализированный хук для настроек кнопок библиотеки
 */
export function useLibraryButtonsSettings() {
  return useSystemSetting<LibraryButtonsSettings>('library_buttons', DEFAULT_LIBRARY_BUTTONS);
}

/**
 * Хук для обновления настроек кнопок библиотеки
 */
export function useUpdateLibraryButtonsSettings() {
  const mutation = useUpdateSystemSetting();

  const updateSettings = (settings: LibraryButtonsSettings) => {
    return mutation.mutateAsync({
      key: 'library_buttons',
      value: settings,
    });
  };

  return {
    updateSettings,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Хук для получения всех системных настроек (для админки)
 */
export function useAllSystemSettings() {
  return useQuery({
    queryKey: ['all-system-settings'],
    queryFn: async () => {
      if (!supabase) {
        logger.error('Supabase client not initialized');
        return [];
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) {
        logger.error('Error fetching all system settings', { error });
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
