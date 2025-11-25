import React, { useState } from 'react';
import { Plus, Calendar, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useModuleTechniquesSchedule,
  useAddTechniqueToModule,
  useUpdateTechniqueInModule,
  useRemoveTechniqueFromModule,
} from '@/lib/supabase/hooks/useTechniqueSchedule';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface Technique {
  id: string;
  title: string;
  available_from_module?: string;
}

interface ModuleTechniquesManagerProps {
  streamModuleId: string;
  moduleName: string;
  moduleDurationDays?: number;
}

const ModuleTechniquesManager: React.FC<ModuleTechniquesManagerProps> = ({
  streamModuleId,
  moduleName,
  moduleDurationDays = 21,
}) => {
  const [isAddingTechnique, setIsAddingTechnique] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState('');
  const [unlockDay, setUnlockDay] = useState(1);
  const [orderNum, setOrderNum] = useState(1);

  // Получить все техники для выбора
  const { data: allTechniques, error: techniquesError } = useQuery({
    queryKey: ['all-techniques'],
    queryFn: async (): Promise<Technique[]> => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('techniques')
        .select('id, title, available_from_module')
        .order('order_num');

      if (error) {
        logger.error('Error fetching techniques', { error });
        throw error;
      }

      console.log('Fetched all techniques for selection', { count: data?.length || 0, data });
      return data || [];
    },
  });

  // Логируем ошибку если есть
  if (techniquesError) {
    logger.error('Error loading techniques for selection', { error: techniquesError });
  }

  // Получить расписание техник в модуле
  const { data: moduleTechniques, isLoading } = useModuleTechniquesSchedule(streamModuleId);

  const addTechniqueMutation = useAddTechniqueToModule();
  const updateTechniqueMutation = useUpdateTechniqueInModule();
  const removeTechniqueMutation = useRemoveTechniqueFromModule();

  const handleAddTechnique = async () => {
    if (!selectedTechniqueId || !unlockDay) {
      alert('Выберите технику и укажите день открытия');
      return;
    }

    try {
      await addTechniqueMutation.mutateAsync({
        stream_module_id: streamModuleId,
        technique_id: selectedTechniqueId,
        unlock_day: unlockDay,
        order_num: orderNum,
      });

      setIsAddingTechnique(false);
      setSelectedTechniqueId('');
      setUnlockDay(1);
      setOrderNum(1);
    } catch (error) {
      console.error('Error adding technique:', error);
      alert('Ошибка при добавлении техники');
    }
  };

  const handleUpdateTechnique = async (
    id: string,
    newUnlockDay: number,
    newOrderNum: number
  ) => {
    try {
      await updateTechniqueMutation.mutateAsync({
        id,
        unlock_day: newUnlockDay,
        order_num: newOrderNum,
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating technique:', error);
      alert('Ошибка при обновлении техники');
    }
  };

  const handleRemoveTechnique = async (id: string, techniqueTitle: string) => {
    if (!confirm(`Удалить технику "${techniqueTitle}" из модуля "${moduleName}"?`)) {
      return;
    }

    try {
      await removeTechniqueMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error removing technique:', error);
      alert('Ошибка при удалении техники');
    }
  };


  // Логируем данные для отладки
  console.log('ModuleTechniquesManager data', {
    allTechniquesCount: allTechniques?.length || 0,
    moduleTechniquesCount: moduleTechniques?.length || 0,
    allTechniques,
    moduleTechniques,
  });

  // Фильтруем техники, которые уже добавлены в модуль
  const availableTechniques =
    allTechniques?.filter(
      (tech) => !moduleTechniques?.some((mt: any) => mt.technique_id === tech.id)
    ) || [];

  console.log('Available techniques for selection', { count: availableTechniques.length, availableTechniques });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Расписание техник в модуле "{moduleName}"</h3>
        <Button
          onClick={() => setIsAddingTechnique(!isAddingTechnique)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <Plus className="w-4 h-4" />
          Добавить технику
        </Button>
      </div>

      {/* Форма добавления техники */}
      {isAddingTechnique && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold">Добавить технику в модуль</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Техника</label>
            <select
              value={selectedTechniqueId}
              onChange={(e) => setSelectedTechniqueId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите технику...</option>
              {availableTechniques.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.title}
                  {tech.available_from_module && ` (${tech.available_from_module})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                День открытия (1-{moduleDurationDays})
              </label>
              <input
                type="number"
                value={unlockDay}
                onChange={(e) => setUnlockDay(parseInt(e.target.value) || 1)}
                min="1"
                max={moduleDurationDays}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                День модуля, когда откроется техника
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Порядок отображения
              </label>
              <input
                type="number"
                value={orderNum}
                onChange={(e) => setOrderNum(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddTechnique}
              disabled={addTechniqueMutation.isPending}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              {addTechniqueMutation.isPending ? 'Добавление...' : 'Добавить'}
            </Button>
            <Button
              onClick={() => {
                setIsAddingTechnique(false);
                setSelectedTechniqueId('');
                setUnlockDate('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Список техник в модуле */}
      {moduleTechniques && moduleTechniques.length > 0 ? (
        <div className="space-y-2">
          {moduleTechniques.map((item: any) => {
            const isEditing = editingId === item.id;
            const isUnlocked = item.is_unlocked;

            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  isUnlocked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {isEditing ? (
                  <EditingRow
                    item={item}
                    moduleDurationDays={moduleDurationDays}
                    onSave={handleUpdateTechnique}
                    onCancel={() => setEditingId(null)}
                    isUpdating={updateTechniqueMutation.isPending}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{item.order_num}</span>
                        <h4 className="font-semibold">{item.technique?.title || item.technique_title}</h4>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            isUnlocked
                              ? 'bg-green-200 text-green-800'
                              : 'bg-orange-200 text-orange-800'
                          }`}
                        >
                          {isUnlocked ? '✓ Открыта' : '🔒 Заблокирована'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>День {item.unlock_day}</span>
                        {!isUnlocked && item.days_until_unlock > 0 && (
                          <span className="text-orange-600">
                            (через {item.days_until_unlock} дн.)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleRemoveTechnique(item.id, item.technique?.title || item.technique_title)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>В этом модуле пока нет техник</p>
          <p className="text-sm">Нажмите "Добавить технику" чтобы добавить первую</p>
        </div>
      )}
    </div>
  );
};

// Компонент для редактирования техники
const EditingRow: React.FC<{
  item: any;
  moduleDurationDays: number;
  onSave: (id: string, unlockDay: number, orderNum: number) => void;
  onCancel: () => void;
  isUpdating: boolean;
}> = ({ item, moduleDurationDays, onSave, onCancel, isUpdating }) => {
  const [unlockDay, setUnlockDay] = useState(item.unlock_day || 1);
  const [orderNum, setOrderNum] = useState(item.order_num);

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">{item.technique?.title || item.technique_title}</h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            День открытия (1-{moduleDurationDays})
          </label>
          <input
            type="number"
            value={unlockDay}
            onChange={(e) => setUnlockDay(parseInt(e.target.value) || 1)}
            min="1"
            max={moduleDurationDays}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Порядок</label>
          <input
            type="number"
            value={orderNum}
            onChange={(e) => setOrderNum(parseInt(e.target.value) || 1)}
            min="1"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => onSave(item.id, unlockDay, orderNum)}
          disabled={isUpdating}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {isUpdating ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Отмена
        </Button>
      </div>
    </div>
  );
};

export default ModuleTechniquesManager;
