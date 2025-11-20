import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Plus, Edit2, Trash2, Lock, Unlock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TechniqueEditor from './TechniqueEditor';
import TechniqueBlocksManager from './TechniqueBlocksManager';

interface Technique {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image: string | null;
  duration_seconds: number | null;
  status: 'free' | 'purchasable' | 'locked';
  purchase_url: string | null;
  upgrade_tariff_chat_url: string | null;
  available_from_module: string | null;
  unlock_condition_type: string | null;
  unlock_condition_value: any;
  order_num: number;
}

/**
 * Админка для управления техниками (аудиопрактиками)
 * Позволяет создавать, редактировать, удалять техники
 * Настраивать условия доступа и цены
 */
const TechniquesManager: React.FC = () => {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [blocksView, setBlocksView] = useState<{ techniqueId: string; title: string } | null>(null);
  const queryClient = useQueryClient();

  // Получить все техники
  const { data: techniques, isLoading } = useQuery({
    queryKey: ['admin-techniques'],
    queryFn: async (): Promise<Technique[]> => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Fetching techniques for admin');

      const { data, error } = await supabase
        .from('techniques')
        .select('*')
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching techniques', { error });
        throw error;
      }

      logger.debug('Techniques fetched', { count: data?.length });
      return data || [];
    },
  });

  // Удалить технику
  const deleteTechniqueMutation = useMutation({
    mutationFn: async (techniqueId: string) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Deleting technique', { techniqueId });

      const { error } = await supabase.from('techniques').delete().eq('id', techniqueId);

      if (error) {
        logger.error('Error deleting technique', { techniqueId, error });
        throw error;
      }

      logger.debug('Technique deleted', { techniqueId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-techniques'] });
    },
  });

  const handleDelete = async (techniqueId: string, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить технику "${title}"?`)) {
      return;
    }

    try {
      await deleteTechniqueMutation.mutateAsync(techniqueId);
      alert('Техника удалена');
    } catch (error) {
      alert('Ошибка при удалении техники');
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedTechniqueId(null);
  };

  const handleEdit = (techniqueId: string) => {
    setSelectedTechniqueId(techniqueId);
    setIsCreating(false);
  };

  const handleCloseEditor = () => {
    setSelectedTechniqueId(null);
    setIsCreating(false);
  };

  const handleManageBlocks = (techniqueId: string, title: string) => {
    setBlocksView({ techniqueId, title });
  };

  const handleCloseBlocks = () => {
    setBlocksView(null);
  };

  const renderStatusBadge = (status: Technique['status']) => {
    const badges = {
      free: { label: 'Бесплатная', color: 'bg-green-100 text-green-800' },
      purchasable: { label: 'К покупке', color: 'bg-blue-100 text-blue-800' },
      locked: { label: 'Заблокирована', color: 'bg-gray-100 text-gray-800' },
    };

    const badge = badges[status];

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
          <p className="text-sm text-[#666]">Загрузка техник...</p>
        </div>
      </div>
    );
  }

  // Если открыт редактор блоков
  if (blocksView) {
    return (
      <TechniqueBlocksManager
        techniqueId={blocksView.techniqueId}
        techniqueTitle={blocksView.title}
        onBack={handleCloseBlocks}
      />
    );
  }

  // Если открыт редактор
  if (isCreating || selectedTechniqueId) {
    return (
      <TechniqueEditor
        techniqueId={selectedTechniqueId}
        onClose={handleCloseEditor}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-techniques'] });
          handleCloseEditor();
        }}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#242424]">Управление техниками</h2>
        <Button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
          Создать технику
        </Button>
      </div>

      {/* Таблица техник */}
      {techniques && techniques.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Название
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Длительность
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Условие доступа
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {techniques.map((technique) => (
                <tr key={technique.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{technique.order_num}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {technique.cover_image && (
                        <img
                          src={technique.cover_image}
                          alt={technique.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{technique.title}</p>
                        {technique.available_from_module && (
                          <p className="text-xs text-gray-500">
                            С модуля: {technique.available_from_module}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{renderStatusBadge(technique.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {technique.duration_seconds
                      ? `${Math.floor(technique.duration_seconds / 60)} мин`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {technique.unlock_condition_type === 'after_technique' ? (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Через{' '}
                        {technique.unlock_condition_value?.duration_days || 0} дней
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        Без условий
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleManageBlocks(technique.id, technique.title)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Управление блоками"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(technique.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(technique.id, technique.title)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">Нет созданных техник</p>
          <Button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg"
          >
            Создать первую технику
          </Button>
        </div>
      )}
    </div>
  );
};

export default TechniquesManager;
