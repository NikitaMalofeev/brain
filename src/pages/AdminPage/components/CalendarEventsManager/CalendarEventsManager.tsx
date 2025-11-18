import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tantml:invoke>
<parameter name="@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarEvent {
  id: string;
  stream_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: 'zoom' | 'offline' | 'lesson_unlock' | 'material_unlock' | 'technique_unlock';
  external_url: string | null;
  lesson_id: number | null;
  material_id: string | null;
  technique_id: string | null;
  cover_image: string | null;
}

interface Stream {
  id: string;
  name: string;
}

/**
 * Админка для управления событиями календаря
 * Позволяет создавать, редактировать и удалять события
 */
const CalendarEventsManager: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Получить все потоки
  const { data: streams } = useQuery({
    queryKey: ['admin-streams-list'],
    queryFn: async (): Promise<Stream[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('streams')
        .select('id, name')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Получить события выбранного потока
  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-calendar-events', selectedStreamId],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!selectedStreamId || !supabase) return [];

      logger.debug('Fetching calendar events', { streamId: selectedStreamId });

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('stream_id', selectedStreamId)
        .order('event_date', { ascending: true });

      if (error) {
        logger.error('Error fetching events', { error });
        throw error;
      }

      return data || [];
    },
    enabled: !!selectedStreamId,
  });

  // Удалить событие
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
    },
  });

  const handleDelete = async (eventId: string, title: string) => {
    if (!confirm(`Удалить событие "${title}"?`)) return;

    try {
      await deleteEventMutation.mutateAsync(eventId);
      alert('Событие удалено');
    } catch (error) {
      alert('Ошибка при удалении события');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getEventTypeLabel = (type: CalendarEvent['event_type']) => {
    const labels = {
      zoom: 'Zoom вебинар',
      offline: 'Оффлайн встреча',
      lesson_unlock: 'Открытие урока',
      material_unlock: 'Открытие материала',
      technique_unlock: 'Открытие техники',
    };
    return labels[type];
  };

  const getEventTypeBadge = (type: CalendarEvent['event_type']) => {
    const badges = {
      zoom: 'bg-blue-100 text-blue-800',
      offline: 'bg-purple-100 text-purple-800',
      lesson_unlock: 'bg-green-100 text-green-800',
      material_unlock: 'bg-yellow-100 text-yellow-800',
      technique_unlock: 'bg-pink-100 text-pink-800',
    };
    return badges[type];
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#242424]">Управление событиями календаря</h2>
          <p className="text-sm text-gray-500 mt-1">
            События для студентов: вебинары, открытия уроков и материалов
          </p>
        </div>
      </div>

      {/* Выбор потока */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Выберите поток</label>
        <select
          value={selectedStreamId || ''}
          onChange={(e) => setSelectedStreamId(e.target.value || null)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
        >
          <option value="">-- Выберите поток --</option>
          {streams?.map((stream) => (
            <option key={stream.id} value={stream.id}>
              {stream.name}
            </option>
          ))}
        </select>
      </div>

      {/* События */}
      {selectedStreamId ? (
        isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA]"></div>
          </div>
        ) : events && events.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(event.event_date)}
                      {event.event_time && (
                        <span className="text-gray-500 ml-2">{event.event_time}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {event.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeBadge(
                          event.event_type
                        )}`}
                      >
                        {getEventTypeLabel(event.event_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(event.id, event.title)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Нет событий в этом потоке</p>
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Выберите поток для просмотра событий</p>
        </div>
      )}

      {/* Примечание */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Примечание:</strong> Для полноценного управления событиями используйте
          функцию копирования потоков в StreamsManager. При копировании потока автоматически
          копируются все события с новыми датами.
        </p>
      </div>
    </div>
  );
};

export default CalendarEventsManager;
