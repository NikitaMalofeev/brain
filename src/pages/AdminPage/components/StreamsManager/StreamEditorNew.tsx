import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { useTariffs } from '@/lib/supabase/hooks/useTariffConfiguration';
import { useTariffConfiguration } from '@/lib/supabase/hooks/useTariffConfiguration';

interface StreamEditorProps {
  streamId: string | null;
  onClose: () => void;
  onSave: () => void;
}

interface StreamFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
}

interface Stream {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

/**
 * Редактор потока с просмотром конфигурации тарифов
 */
const StreamEditorNew: React.FC<StreamEditorProps> = ({ streamId, onClose, onSave }) => {
  const queryClient = useQueryClient();
  const isEditing = !!streamId;

  // Состояния формы
  const [formData, setFormData] = useState<StreamFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  // Для просмотра конфигурации
  const [selectedTariffId, setSelectedTariffId] = useState<string | 'all'>('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Получить данные потока
  const { data: stream, isLoading: streamLoading } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async (): Promise<Stream | null> => {
      if (!streamId || !supabase) return null;

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('id', streamId)
        .single();

      if (error) {
        logger.error('Error fetching stream', { streamId, error });
        throw error;
      }

      return data;
    },
    enabled: !!streamId,
  });

  // Установить данные формы при загрузке потока
  React.useEffect(() => {
    if (stream) {
      setFormData({
        name: stream.name,
        description: stream.description || '',
        start_date: stream.start_date.split('T')[0],
        end_date: stream.end_date?.split('T')[0] || '',
      });
    }
  }, [stream]);

  // Получить все тарифы
  const { data: tariffs } = useTariffs();

  // Получить конфигурацию выбранного тарифа
  const { data: configuration, isLoading: configLoading } = useTariffConfiguration(
    streamId,
    selectedTariffId === 'all' ? null : selectedTariffId
  );

  // Создать поток
  const createMutation = useMutation({
    mutationFn: async (data: StreamFormData) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: newStream, error } = await supabase
        .from('streams')
        .insert({
          name: data.name,
          description: data.description || null,
          start_date: data.start_date,
          end_date: data.end_date || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating stream', { error });
        throw error;
      }

      logger.info('Stream created', { streamId: newStream.id });
      return newStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
      onSave();
    },
  });

  // Обновить поток
  const updateMutation = useMutation({
    mutationFn: async (data: StreamFormData) => {
      if (!supabase || !streamId) throw new Error('Missing required data');

      const { error } = await supabase
        .from('streams')
        .update({
          name: data.name,
          description: data.description || null,
          start_date: data.start_date,
          end_date: data.end_date || null,
        })
        .eq('id', streamId);

      if (error) {
        logger.error('Error updating stream', { streamId, error });
        throw error;
      }

      logger.info('Stream updated', { streamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      onSave();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.start_date) {
      alert('Заполните обязательные поля (название и дата начала)');
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      alert('Ошибка при сохранении потока');
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  if (streamLoading && isEditing) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
          <p className="text-sm text-[#666]">Загрузка потока...</p>
        </div>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 bg-white rounded-lg">
      {/* Заголовок */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Редактировать поток' : 'Создать поток'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ЛЕВАЯ ПАНЕЛЬ: Форма редактирования */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название потока *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Поток 1, Январь 2024..."
                className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание потока..."
                rows={3}
                className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 resize-vertical"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата начала *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата окончания
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">Оставьте пустым для бессрочного потока</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: Просмотр конфигурации тарифов */}
        {isEditing && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Просмотр конфигурации тарифов
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Выберите тариф для просмотра:
              </label>
              <select
                value={selectedTariffId}
                onChange={(e) => setSelectedTariffId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все тарифы</option>
                {tariffs?.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name} ({tariff.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Для редактирования перейдите во вкладку "Тарифы"
              </p>
            </div>

            {selectedTariffId !== 'all' ? (
              configLoading ? (
                <div className="text-sm text-gray-600">Загрузка конфигурации...</div>
              ) : configuration?.modules && configuration.modules.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {configuration.modules.map((module) => (
                    <div
                      key={module.stream_module_id}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleModule(module.stream_module_id)}
                      >
                        <span className="text-gray-700">
                          {expandedModules.has(module.stream_module_id) ? '▼' : '▶'}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {module.module_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Доступ:{' '}
                            {module.access_duration_days
                              ? `${module.access_duration_days} дней`
                              : 'Бессрочно'}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedModules.has(module.stream_module_id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 ml-6 space-y-1"
                          >
                            {module.techniques.length === 0 ? (
                              <p className="text-xs text-gray-500">Нет техник</p>
                            ) : (
                              module.techniques.map((technique) => (
                                <div
                                  key={technique.technique_id}
                                  className="text-xs text-gray-700 py-1"
                                >
                                  • {technique.technique_title}
                                  <span className="text-gray-500 ml-1">
                                    (через {technique.unlock_offset_days} дн. → день {technique.unlock_offset_days + 1})
                                  </span>
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Для этого тарифа не настроены модули.
                  <br />
                  Настройте во вкладке "Тарифы".
                </div>
              )
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                Выберите тариф для просмотра конфигурации
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamEditorNew;
