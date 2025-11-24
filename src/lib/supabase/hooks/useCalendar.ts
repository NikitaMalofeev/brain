import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// ============================================
// Типы
// ============================================

export interface CalendarEvent {
  event_id: string;
  title: string;
  description: string | null;
  event_date: string; // DATE as string YYYY-MM-DD
  event_time: string | null; // TIME as string HH:MM:SS
  event_type: 'zoom' | 'offline' | 'lesson_unlock' | 'material_unlock' | 'technique_unlock';
  external_url: string | null;
  lesson_id: number | null;
  material_id: string | null;
  technique_id: string | null;
  cover_image: string | null;
  module_id: string | null;
  module_name: string | null;
  module_color: string | null;
  can_access: boolean;
}

export interface Stream {
  id: string;
  name: string;
  course_id: string | null;
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Хуки
// ============================================

/**
 * Хук для получения событий календаря пользователя на указанный месяц
 */
export function useCalendarEvents(userId: string | undefined, month: Date) {
  return useQuery({
    queryKey: ['calendar-events', userId, month.toISOString()],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!userId || !supabase) {
        return [];
      }

      logger.debug('Fetching calendar events', { userId, month: month.toISOString() });

      const { data, error } = await supabase.rpc('get_user_calendar_events', {
        p_user_id: userId,
        p_month: month.toISOString().split('T')[0], // YYYY-MM-DD
      });

      if (error) {
        logger.error('Error fetching calendar events', { error });
        throw error;
      }

      logger.debug('Calendar events fetched', { count: data?.length || 0 });
      return data || [];
    },
    enabled: !!userId && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });
}

/**
 * Хук для получения потоков (для админки)
 */
export function useStreams() {
  return useQuery({
    queryKey: ['streams'],
    queryFn: async (): Promise<Stream[]> => {
      if (!supabase) {
        return [];
      }

      logger.debug('Fetching streams');

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        logger.error('Error fetching streams', { error });
        throw error;
      }

      logger.debug('Streams fetched', { count: data?.length || 0 });
      return data || [];
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Хук для копирования потока
 */
export function useCopyStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sourceStreamId: string;
      newName: string;
      newStartDate: Date;
    }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Copying stream', params);

      const { data, error } = await supabase.rpc('copy_stream', {
        p_source_stream_id: params.sourceStreamId,
        p_new_stream_name: params.newName,
        p_new_start_date: params.newStartDate.toISOString().split('T')[0],
      });

      if (error) {
        logger.error('Error copying stream', { error });
        throw error;
      }

      logger.debug('Stream copied successfully', { newStreamId: data });
      return data;
    },
    onSuccess: () => {
      // Инвалидируем кэш потоков
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

/**
 * Хук для получения событий конкретного потока (для админки)
 */
export function useStreamEvents(streamId: string | null) {
  return useQuery({
    queryKey: ['stream-events', streamId],
    queryFn: async () => {
      if (!streamId || !supabase) {
        return [];
      }

      logger.debug('Fetching stream events', { streamId });

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          stream_modules(name, color)
        `)
        .eq('stream_id', streamId)
        .order('event_date', { ascending: true });

      if (error) {
        logger.error('Error fetching stream events', { error });
        throw error;
      }

      logger.debug('Stream events fetched', { count: data?.length || 0 });
      return data || [];
    },
    enabled: !!streamId && !!supabase,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Хук для создания события календаря (для админки)
 */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Partial<CalendarEvent>) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Creating calendar event', eventData);

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        logger.error('Error creating calendar event', { error });
        throw error;
      }

      logger.debug('Calendar event created successfully', { eventId: data.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['stream-events'] });
    },
  });
}

/**
 * Хук для удаления события календаря (для админки)
 */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Deleting calendar event', { eventId });

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        logger.error('Error deleting calendar event', { error });
        throw error;
      }

      logger.debug('Calendar event deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['stream-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
    },
  });
}

/**
 * Хук для обновления события календаря (для админки)
 */
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventId: string; eventData: Partial<CalendarEvent> }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Updating calendar event', params);

      const { data, error } = await supabase
        .from('calendar_events')
        .update(params.eventData)
        .eq('id', params.eventId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating calendar event', { error });
        throw error;
      }

      logger.debug('Calendar event updated successfully', { eventId: data.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['stream-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
    },
  });
}

/**
 * Хук для получения модулей потока (для выбора в форме события)
 */
export function useStreamModulesForSelect(streamId: string | null) {
  return useQuery({
    queryKey: ['stream-modules-select', streamId],
    queryFn: async () => {
      if (!streamId || !supabase) {
        return [];
      }

      const { data, error } = await supabase
        .from('stream_modules')
        .select('id, name, color, order_num')
        .eq('stream_id', streamId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching stream modules', { error });
        throw error;
      }

      return data || [];
    },
    enabled: !!streamId && !!supabase,
  });
}

/**
 * Хук для получения тарифов события
 */
export function useEventTariffs(eventId: string | null) {
  return useQuery({
    queryKey: ['event-tariffs', eventId],
    queryFn: async () => {
      if (!eventId || !supabase) {
        return [];
      }

      const { data, error } = await supabase
        .from('event_tariff_access')
        .select('tariff_id')
        .eq('event_id', eventId);

      if (error) {
        logger.error('Error fetching event tariffs', { error });
        throw error;
      }

      return data?.map(t => t.tariff_id) || [];
    },
    enabled: !!eventId && !!supabase,
  });
}

/**
 * Хук для обновления тарифов события
 */
export function useUpdateEventTariffs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventId: string; tariffIds: string[] }) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Updating event tariffs', params);

      // Удаляем старые тарифы
      const { error: deleteError } = await supabase
        .from('event_tariff_access')
        .delete()
        .eq('event_id', params.eventId);

      if (deleteError) {
        logger.error('Error deleting old event tariffs', { error: deleteError });
        throw deleteError;
      }

      // Добавляем новые тарифы (если есть)
      if (params.tariffIds.length > 0) {
        const { error: insertError } = await supabase
          .from('event_tariff_access')
          .insert(
            params.tariffIds.map(tariffId => ({
              event_id: params.eventId,
              tariff_id: tariffId,
            }))
          );

        if (insertError) {
          logger.error('Error inserting event tariffs', { error: insertError });
          throw insertError;
        }
      }

      logger.debug('Event tariffs updated successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}
