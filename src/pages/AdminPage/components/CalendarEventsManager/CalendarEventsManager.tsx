import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Plus, Edit2, Trash2, Calendar, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';
import {
  useStreamModulesForSelect,
  useEventTariffs,
  useUpdateEventTariffs,
} from '@/lib/supabase/hooks/useCalendar';

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
  start_date: string;
}

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  event_type: CalendarEvent['event_type'];
  module_id: string;
  external_url: string;
  lesson_id: string;
  material_id: string;
  technique_id: string;
  cover_image: string;
  tariff_ids: string[];
}

const initialFormData: EventFormData = {
  title: '',
  description: '',
  event_date: '',
  event_time: '',
  event_type: 'zoom',
  module_id: '',
  external_url: '',
  lesson_id: '',
  material_id: '',
  technique_id: '',
  cover_image: '',
  tariff_ids: [],
};

/**
 * Админка для управления событиями календаря
 * Позволяет создавать, редактировать и удалять события
 */
const CalendarEventsManager: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const queryClient = useQueryClient();

  // Получить все потоки
  const { data: streams } = useQuery({
    queryKey: ['admin-streams-list'],
    queryFn: async (): Promise<Stream[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('streams')
        .select('id, name, start_date')
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

  // Модули потока
  const { data: modules } = useStreamModulesForSelect(selectedStreamId);

  // Тарифы
  const { tariffs } = useTariffsAdmin();

  // Тарифы редактируемого события
  const { data: eventTariffs } = useEventTariffs(editingEventId);

  // Мутация обновления тарифов
  const updateEventTariffsMutation = useUpdateEventTariffs();

  // Заполняем тарифы при редактировании
  useEffect(() => {
    if (editingEventId && eventTariffs) {
      setFormData(prev => ({ ...prev, tariff_ids: eventTariffs }));
    }
  }, [editingEventId, eventTariffs]);

  // Создать событие
  const createEventMutation = useMutation({
    mutationFn: async (data: Omit<CalendarEvent, 'id'>) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: newEvent, error } = await supabase
        .from('calendar_events')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newEvent;
    },
    onSuccess: async (newEvent) => {
      // Сохраняем тарифы
      if (formData.tariff_ids.length > 0) {
        await updateEventTariffsMutation.mutateAsync({
          eventId: newEvent.id,
          tariffIds: formData.tariff_ids,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
    },
  });

  // Обновить событие
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CalendarEvent> }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('calendar_events')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: async (eventId) => {
      // Обновляем тарифы
      await updateEventTariffsMutation.mutateAsync({
        eventId,
        tariffIds: formData.tariff_ids,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
    },
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
    } catch (error) {
      alert('Ошибка при удалении события');
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_time: event.event_time || '',
      event_type: event.event_type,
      module_id: event.module_id || '',
      external_url: event.external_url || '',
      lesson_id: event.lesson_id?.toString() || '',
      material_id: event.material_id || '',
      technique_id: event.technique_id || '',
      cover_image: event.cover_image || '',
      tariff_ids: [],
    });
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingEventId(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStreamId) return;

    const eventData = {
      stream_id: selectedStreamId,
      title: formData.title,
      description: formData.description || null,
      event_date: formData.event_date,
      event_time: formData.event_time || null,
      event_type: formData.event_type,
      module_id: formData.module_id || null,
      external_url: formData.external_url || null,
      lesson_id: formData.lesson_id ? parseInt(formData.lesson_id) : null,
      material_id: formData.material_id || null,
      technique_id: formData.technique_id || null,
      cover_image: formData.cover_image || null,
    };

    try {
      if (editingEventId) {
        await updateEventMutation.mutateAsync({ id: editingEventId, data: eventData });
      } else {
        await createEventMutation.mutateAsync(eventData);
      }
      setIsFormOpen(false);
      setEditingEventId(null);
      setFormData(initialFormData);
    } catch (error) {
      alert('Ошибка при сохранении события');
    }
  };

  const handleTariffToggle = (tariffId: string) => {
    setFormData(prev => ({
      ...prev,
      tariff_ids: prev.tariff_ids.includes(tariffId)
        ? prev.tariff_ids.filter(id => id !== tariffId)
        : [...prev.tariff_ids, tariffId],
    }));
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
        {selectedStreamId && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Добавить событие
          </Button>
        )}
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
              {stream.name} (старт: {formatDate(stream.start_date)})
            </option>
          ))}
        </select>
      </div>

      {/* Форма создания/редактирования */}
      {isFormOpen && selectedStreamId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingEventId ? 'Редактировать событие' : 'Новое событие'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Дата и время */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата *
                  </label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время
                  </label>
                  <input
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_time: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Тип события */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип события *
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as CalendarEvent['event_type'] }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                >
                  <option value="zoom">Zoom вебинар</option>
                  <option value="offline">Оффлайн встреча</option>
                  <option value="lesson_unlock">Открытие урока</option>
                  <option value="material_unlock">Открытие материала</option>
                  <option value="technique_unlock">Открытие техники</option>
                </select>
              </div>

              {/* Модуль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модуль
                </label>
                <select
                  value={formData.module_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, module_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                >
                  <option value="">-- Без модуля --</option>
                  {modules?.map((module) => (
                    <option key={module.id} value={module.id}>
                      <span style={{ color: module.color }}></span> {module.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Дополнительные поля в зависимости от типа */}
              {(formData.event_type === 'zoom' || formData.event_type === 'offline') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ссылка на мероприятие
                  </label>
                  <input
                    type="url"
                    value={formData.external_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                    placeholder="https://zoom.us/..."
                  />
                </div>
              )}

              {formData.event_type === 'lesson_unlock' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID урока
                  </label>
                  <input
                    type="number"
                    value={formData.lesson_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, lesson_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  />
                </div>
              )}

              {formData.event_type === 'material_unlock' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID материала (UUID)
                  </label>
                  <input
                    type="text"
                    value={formData.material_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, material_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  />
                </div>
              )}

              {formData.event_type === 'technique_unlock' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID техники (UUID)
                  </label>
                  <input
                    type="text"
                    value={formData.technique_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, technique_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  />
                </div>
              )}

              {/* Обложка */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL обложки
                </label>
                <input
                  type="url"
                  value={formData.cover_image}
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              {/* Тарифы */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Доступно для тарифов
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Если не выбрано ни одного тарифа, событие доступно всем
                </p>
                <div className="flex flex-wrap gap-2">
                  {tariffs.map((tariff) => (
                    <button
                      key={tariff.id}
                      type="button"
                      onClick={() => handleTariffToggle(tariff.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        formData.tariff_ids.includes(tariff.id)
                          ? 'bg-[#B862EA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tariff.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingEventId ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        onClick={() => handleEdit(event)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
            <p className="text-sm text-gray-500 mb-4">Нет событий в этом потоке</p>
            <Button onClick={handleCreate} variant="outline" className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Добавить первое событие
            </Button>
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
          <strong>Совет:</strong> При копировании потока все события автоматически копируются с новыми датами
          (смещаются на разницу между стартами потоков). Это удобно для создания новых потоков с одинаковым расписанием.
        </p>
      </div>
    </div>
  );
};

export default CalendarEventsManager;
