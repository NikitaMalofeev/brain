import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

interface TechniqueEditorProps {
  techniqueId: string | null; // null = создание новой
  onClose: () => void;
  onSave: () => void;
}

interface TechniqueFormData {
  title: string;
  description: string;
  audio_url: string;
  cover_image: string;
  duration_seconds: number | null;
  status: 'free' | 'purchasable' | 'locked';
  purchase_url: string;
  upgrade_tariff_chat_url: string;
  available_from_module: string;
  unlock_condition_type: 'after_technique' | null;
  unlock_condition_technique_id: string;
  unlock_condition_duration_days: number;
  order_num: number;
  is_standalone: boolean; // НОВОЕ ПОЛЕ
}

const initialFormData: TechniqueFormData = {
  title: '',
  description: '',
  audio_url: '',
  cover_image: '',
  duration_seconds: null,
  status: 'purchasable',
  purchase_url: '',
  upgrade_tariff_chat_url: '',
  available_from_module: '',
  unlock_condition_type: null,
  unlock_condition_technique_id: '',
  unlock_condition_duration_days: 30,
  order_num: 0,
  is_standalone: false, // По умолчанию не standalone
};

const TechniqueEditor: React.FC<TechniqueEditorProps> = ({
  techniqueId,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<TechniqueFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузить технику для редактирования
  const { data: technique, isLoading } = useQuery({
    queryKey: ['technique', techniqueId],
    queryFn: async () => {
      if (!techniqueId || !supabase) return null;

      const { data, error } = await supabase
        .from('techniques')
        .select('*')
        .eq('id', techniqueId)
        .single();

      if (error) {
        logger.error('Error fetching technique', { techniqueId, error });
        throw error;
      }

      return data;
    },
    enabled: !!techniqueId,
  });

  // Загрузить все техники для выбора условия
  const { data: allTechniques } = useQuery({
    queryKey: ['all-techniques-for-select'],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('techniques')
        .select('id, title, order_num')
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching techniques', { error });
        throw error;
      }

      return data || [];
    },
  });

  // Заполнить форму данными техники при загрузке
  useEffect(() => {
    if (technique) {
      setFormData({
        title: technique.title || '',
        description: technique.description || '',
        audio_url: technique.audio_url || '',
        cover_image: technique.cover_image || '',
        duration_seconds: technique.duration_seconds,
        status: technique.status || 'purchasable',
        purchase_url: technique.purchase_url || '',
        upgrade_tariff_chat_url: technique.upgrade_tariff_chat_url || '',
        available_from_module: technique.available_from_module || '',
        unlock_condition_type: technique.unlock_condition_type || null,
        unlock_condition_technique_id:
          technique.unlock_condition_value?.technique_id || '',
        unlock_condition_duration_days:
          technique.unlock_condition_value?.duration_days || 30,
        order_num: technique.order_num || 0,
        is_standalone: technique.is_standalone || false, // Загрузить is_standalone
      });
    }
  }, [technique]);

  const handleChange = (
    field: keyof TechniqueFormData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.audio_url.trim()) {
      alert('Заполните обязательные поля: Название и URL аудио');
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        audio_url: formData.audio_url.trim(),
        cover_image: formData.cover_image.trim() || null,
        duration_seconds: formData.duration_seconds,
        status: formData.status,
        purchase_url: formData.purchase_url.trim() || null,
        upgrade_tariff_chat_url: formData.upgrade_tariff_chat_url.trim() || null,
        available_from_module: formData.available_from_module.trim() || null,
        order_num: formData.order_num,
        unlock_condition_type: formData.unlock_condition_type,
        unlock_condition_value:
          formData.unlock_condition_type === 'after_technique'
            ? {
                technique_id: formData.unlock_condition_technique_id,
                duration_days: formData.unlock_condition_duration_days,
              }
            : null,
        is_standalone: formData.is_standalone, // Сохранить is_standalone
      };

      if (techniqueId) {
        // Обновление
        const { error } = await supabase!
          .from('techniques')
          .update(dataToSave)
          .eq('id', techniqueId);

        if (error) {
          logger.error('Error updating technique', { techniqueId, error });
          throw error;
        }

        logger.debug('Technique updated', { techniqueId });
        alert('Техника обновлена');
      } else {
        // Создание
        const { error } = await supabase!.from('techniques').insert([dataToSave]);

        if (error) {
          logger.error('Error creating technique', { error });
          throw error;
        }

        logger.debug('Technique created');
        alert('Техника создана');
      }

      onSave();
    } catch (error) {
      console.error('Error saving technique:', error);
      alert('Ошибка при сохранении техники');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
          <p className="text-sm text-[#666]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-[#242424]">
          {techniqueId ? 'Редактировать технику' : 'Создать технику'}
        </h2>
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {/* Название */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
            placeholder="Императрица"
            required
          />
        </div>

        {/* Описание */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
            placeholder="Подробное описание техники..."
          />
        </div>

        {/* URL аудио и обложки */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL аудио <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.audio_url}
              onChange={(e) => handleChange('audio_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="https://..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL обложки
            </label>
            <input
              type="url"
              value={formData.cover_image}
              onChange={(e) => handleChange('cover_image', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Длительность и порядок */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Длительность (секунды)
            </label>
            <input
              type="number"
              value={formData.duration_seconds || ''}
              onChange={(e) =>
                handleChange('duration_seconds', e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Порядковый номер
            </label>
            <input
              type="number"
              value={formData.order_num}
              onChange={(e) => handleChange('order_num', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {/* Статус */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
          <select
            value={formData.status}
            onChange={(e) =>
              handleChange('status', e.target.value as TechniqueFormData['status'])
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
          >
            <option value="free">Бесплатная</option>
            <option value="purchasable">К покупке</option>
            <option value="locked">Заблокирована (по условию)</option>
          </select>
        </div>

        {/* Standalone техника */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <input
            type="checkbox"
            id="is_standalone"
            checked={formData.is_standalone}
            onChange={(e) => handleChange('is_standalone', e.target.checked)}
            className="w-5 h-5 text-[#B862EA] border-gray-300 rounded focus:ring-[#B862EA]"
          />
          <label htmlFor="is_standalone" className="text-sm font-medium text-gray-700 cursor-pointer">
            Standalone техника (доступна к покупке отдельно, не привязана к модулям тарифов)
          </label>
        </div>

        {/* URL покупки и чата */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL покупки на сайте
            </label>
            <input
              type="url"
              value={formData.purchase_url}
              onChange={(e) => handleChange('purchase_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="https://site.com/buy/technique"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL чата с отделом продаж
            </label>
            <input
              type="url"
              value={formData.upgrade_tariff_chat_url}
              onChange={(e) => handleChange('upgrade_tariff_chat_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="https://t.me/..."
            />
          </div>
        </div>

        {/* Доступна с модуля */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Доступна с модуля
          </label>
          <input
            type="text"
            value={formData.available_from_module}
            onChange={(e) => handleChange('available_from_module', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
            placeholder="Модуль 3"
          />
        </div>

        {/* Условие разблокировки */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Условие разблокировки
          </h3>

          <div className="space-y-4">
            {/* Тип условия */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип условия
              </label>
              <select
                value={formData.unlock_condition_type || 'none'}
                onChange={(e) =>
                  handleChange(
                    'unlock_condition_type',
                    e.target.value === 'none' ? null : (e.target.value as 'after_technique')
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              >
                <option value="none">Без условий</option>
                <option value="after_technique">
                  После получения другой техники + время
                </option>
              </select>
            </div>

            {/* Параметры условия */}
            {formData.unlock_condition_type === 'after_technique' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Предыдущая техника
                  </label>
                  <select
                    value={formData.unlock_condition_technique_id}
                    onChange={(e) =>
                      handleChange('unlock_condition_technique_id', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                  >
                    <option value="">Выберите технику</option>
                    {allTechniques?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Через сколько дней
                  </label>
                  <input
                    type="number"
                    value={formData.unlock_condition_duration_days}
                    onChange={(e) =>
                      handleChange(
                        'unlock_condition_duration_days',
                        parseInt(e.target.value) || 30
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
                    placeholder="30"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TechniqueEditor;
