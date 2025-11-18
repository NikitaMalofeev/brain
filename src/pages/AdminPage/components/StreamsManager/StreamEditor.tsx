import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

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

const initialFormData: StreamFormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
};

const StreamEditor: React.FC<StreamEditorProps> = ({ streamId, onClose, onSave }) => {
  const [formData, setFormData] = useState<StreamFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузить поток для редактирования
  const { data: stream, isLoading } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
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

  useEffect(() => {
    if (stream) {
      setFormData({
        name: stream.name || '',
        description: stream.description || '',
        start_date: stream.start_date?.split('T')[0] || '',
        end_date: stream.end_date?.split('T')[0] || '',
      });
    }
  }, [stream]);

  const handleChange = (field: keyof StreamFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.start_date) {
      alert('Заполните обязательные поля: Название и Дата начала');
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      };

      if (streamId) {
        const { error } = await supabase!
          .from('streams')
          .update(dataToSave)
          .eq('id', streamId);

        if (error) throw error;
        alert('Поток обновлен');
      } else {
        const { error } = await supabase!.from('streams').insert([dataToSave]);

        if (error) throw error;
        alert('Поток создан');
      }

      onSave();
    } catch (error) {
      console.error('Error saving stream:', error);
      alert('Ошибка при сохранении потока');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">
          {streamId ? 'Редактировать поток' : 'Создать поток'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#B862EA]"
            placeholder="Поток Ноябрь 2025"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#B862EA]"
            placeholder="Описание потока..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата начала <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#B862EA]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата окончания</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#B862EA]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg"
          >
            {isSaving ? 'Сохранение...' : <><Save className="w-4 h-4" /> Сохранить</>}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StreamEditor;
