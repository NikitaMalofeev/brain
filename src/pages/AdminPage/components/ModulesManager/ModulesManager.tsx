import React, { useState, useMemo } from 'react';
import { useStreams } from '@/lib/supabase/hooks/useTariffConfiguration';
import { useStreamModules } from '@/lib/supabase/hooks/useStreamModules';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Book, Plus, Trash2, ArrowLeft } from 'lucide-react';

/**
 * Интерфейс для модуля
 */
interface StreamModule {
  id: string;
  stream_id: string;
  name: string;
  color: string | null;
  order_num: number;
}

/**
 * Интерфейс для материала
 */
interface Material {
  id: string;
  name: string;
  description: string | null;
  material_type: 'video' | 'audio';
}

/**
 * Интерфейс для связи модуля с материалом
 */
interface ModuleMaterial {
  id: string;
  module_id: string;
  material_id: string;
  order_num: number;
  release_day: number | null;
  active_days: number | null;
  material?: Material;
}

/**
 * Хук для получения всех материалов
 */
function useAllMaterials() {
  return useQuery({
    queryKey: ['all-materials'],
    queryFn: async (): Promise<Material[]> => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('materials')
        .select('id, name, description, material_type')
        .order('name');

      if (error) {
        logger.error('Error fetching materials', { error });
        throw error;
      }

      return data || [];
    },
  });
}

/**
 * Хук для получения материалов модуля
 */
function useModuleMaterials(moduleId: string | null) {
  return useQuery({
    queryKey: ['module-materials', moduleId],
    queryFn: async (): Promise<ModuleMaterial[]> => {
      if (!supabase || !moduleId) return [];

      const { data, error } = await supabase
        .from('module_materials')
        .select(`
          id,
          module_id,
          material_id,
          order_num,
          release_day,
          active_days,
          material:materials(id, name, description, material_type)
        `)
        .eq('module_id', moduleId)
        .order('release_day', { ascending: true });

      if (error) {
        logger.error('Error fetching module materials', { moduleId, error });
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        material: item.material as unknown as Material
      }));
    },
    enabled: !!moduleId,
  });
}

/**
 * Хук для добавления материала в модуль
 */
function useAddModuleMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      module_id: string;
      material_id: string;
      order_num: number;
      release_day: number;
      active_days?: number | null;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('module_materials')
        .insert({
          module_id: params.module_id,
          material_id: params.material_id,
          order_num: params.order_num,
          release_day: params.release_day,
          active_days: params.active_days || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding material to module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

/**
 * Хук для удаления материала из модуля
 */
function useRemoveModuleMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; module_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('module_materials')
        .delete()
        .eq('id', params.id);

      if (error) {
        logger.error('Error removing material from module', { params, error });
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

/**
 * Хук для обновления материала модуля
 */
function useUpdateModuleMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      module_id: string;
      order_num?: number;
      release_day?: number;
      active_days?: number | null;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const updateData: any = {};
      if (params.order_num !== undefined) updateData.order_num = params.order_num;
      if (params.release_day !== undefined) updateData.release_day = params.release_day;
      if (params.active_days !== undefined) updateData.active_days = params.active_days;

      const { data, error } = await supabase
        .from('module_materials')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating module material', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

/**
 * Хук для создания модуля
 */
function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      stream_id: string;
      name: string;
      color: string | null;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('stream_modules')
        .insert({
          stream_id: params.stream_id,
          name: params.name,
          color: params.color,
          order_num: params.order_num,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

/**
 * Хук для обновления модуля
 */
function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      color: string | null;
      order_num: number;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('stream_modules')
        .update({
          name: params.name,
          color: params.color,
          order_num: params.order_num,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating module', { params, error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

/**
 * Хук для удаления модуля
 */
function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('stream_modules')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting module', { id, error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

/**
 * Компонент управления модулями потоков
 */
const ModulesManager: React.FC = () => {
  // ========== СОСТОЯНИЯ ==========
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<StreamModule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    order_num: 1,
  });

  // Состояние для управления материалами модуля
  const [materialsView, setMaterialsView] = useState<{ moduleId: string; moduleName: string } | null>(null);
  const [draggedMaterial, setDraggedMaterial] = useState<Material | null>(null);
  const [activeDaysModal, setActiveDaysModal] = useState<{
    materialId: string;
    materialName: string;
    targetDay: number;
  } | null>(null);
  const [activeDaysValue, setActiveDaysValue] = useState<string>('');
  const [moduleDaysCount, setModuleDaysCount] = useState(14); // Количество дней в сетке

  // ========== ХУКИ ==========
  const { data: streams, isLoading: streamsLoading } = useStreams();
  const { data: modules, isLoading: modulesLoading } = useStreamModules(selectedStreamId);
  const { data: allMaterials } = useAllMaterials();
  const { data: moduleMaterials, isLoading: materialsLoading } = useModuleMaterials(materialsView?.moduleId || null);

  const createModuleMutation = useCreateModule();
  const updateModuleMutation = useUpdateModule();
  const deleteModuleMutation = useDeleteModule();
  const addModuleMaterialMutation = useAddModuleMaterial();
  const removeModuleMaterialMutation = useRemoveModuleMaterial();
  const updateModuleMaterialMutation = useUpdateModuleMaterial();

  // ========== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ==========
  const sortedStreams = useMemo(() => {
    if (!streams) return [];
    return [...streams].sort((a, b) =>
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  }, [streams]);

  const sortedModules = useMemo(() => {
    if (!modules) return [];
    return [...modules].sort((a, b) => a.order_num - b.order_num);
  }, [modules]);

  const isMutating =
    createModuleMutation.isPending ||
    updateModuleMutation.isPending ||
    deleteModuleMutation.isPending ||
    addModuleMaterialMutation.isPending ||
    removeModuleMaterialMutation.isPending ||
    updateModuleMaterialMutation.isPending;

  // Материалы, которые еще не добавлены в модуль
  const availableMaterials = useMemo(() => {
    if (!allMaterials || !moduleMaterials) return allMaterials || [];
    const addedIds = new Set(moduleMaterials.map(mm => mm.material_id));
    return allMaterials.filter(m => !addedIds.has(m.id));
  }, [allMaterials, moduleMaterials]);

  // ========== ОБРАБОТЧИКИ ==========
  const openCreateModal = () => {
    setEditingModule(null);
    setFormData({
      name: '',
      color: '#3B82F6',
      order_num: (sortedModules?.length || 0) + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (module: StreamModule) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      color: module.color || '#3B82F6',
      order_num: module.order_num,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModule(null);
    setFormData({ name: '', color: '#3B82F6', order_num: 1 });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !selectedStreamId) return;

    try {
      if (editingModule) {
        await updateModuleMutation.mutateAsync({
          id: editingModule.id,
          name: formData.name.trim(),
          color: formData.color,
          order_num: formData.order_num,
        });
      } else {
        await createModuleMutation.mutateAsync({
          stream_id: selectedStreamId,
          name: formData.name.trim(),
          color: formData.color,
          order_num: formData.order_num,
        });
      }
      closeModal();
    } catch (err) {
      alert('Ошибка при сохранении модуля: ' + (err as any)?.message);
    }
  };

  const handleDelete = async (module: StreamModule) => {
    if (!confirm(`Удалить модуль "${module.name}"? Все техники модуля также будут удалены.`)) {
      return;
    }

    try {
      await deleteModuleMutation.mutateAsync(module.id);
    } catch (err) {
      alert('Ошибка при удалении модуля: ' + (err as any)?.message);
    }
  };

  // Обработчики для материалов
  const openMaterialsView = (module: StreamModule) => {
    setMaterialsView({ moduleId: module.id, moduleName: module.name });
  };

  const closeMaterialsView = () => {
    setMaterialsView(null);
    setDraggedMaterial(null);
  };

  const handleDragStart = (material: Material) => {
    setDraggedMaterial(material);
  };

  const handleDragEnd = () => {
    setDraggedMaterial(null);
  };

  const handleDrop = (day: number) => {
    if (!draggedMaterial || !materialsView) return;

    // Открываем модальное окно для настройки active_days
    setActiveDaysModal({
      materialId: draggedMaterial.id,
      materialName: draggedMaterial.name,
      targetDay: day,
    });
    setActiveDaysValue('');
    setDraggedMaterial(null);
  };

  const handleConfirmAddMaterial = async () => {
    if (!activeDaysModal || !materialsView) return;

    try {
      await addModuleMaterialMutation.mutateAsync({
        module_id: materialsView.moduleId,
        material_id: activeDaysModal.materialId,
        order_num: (moduleMaterials?.length || 0) + 1,
        release_day: activeDaysModal.targetDay,
        active_days: activeDaysValue ? parseInt(activeDaysValue) : null,
      });
      setActiveDaysModal(null);
    } catch (err) {
      alert('Ошибка при добавлении материала: ' + (err as any)?.message);
    }
  };

  const handleRemoveMaterial = async (mm: ModuleMaterial) => {
    if (!confirm('Удалить материал из модуля?')) return;

    try {
      await removeModuleMaterialMutation.mutateAsync({
        id: mm.id,
        module_id: mm.module_id,
      });
    } catch (err) {
      alert('Ошибка при удалении материала: ' + (err as any)?.message);
    }
  };

  // Группировка материалов по дням
  const materialsByDay = useMemo(() => {
    if (!moduleMaterials) return {};
    const result: Record<number, ModuleMaterial[]> = {};
    for (const mm of moduleMaterials) {
      const day = mm.release_day || 1;
      if (!result[day]) result[day] = [];
      result[day].push(mm);
    }
    return result;
  }, [moduleMaterials]);

  // ========== РЕНДЕР ==========
  // Если открыт вид материалов модуля
  if (materialsView) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
        {/* Заголовок с кнопкой назад */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeMaterialsView}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Материалы модуля</h2>
            <p className="text-sm text-gray-600">{materialsView.moduleName}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-600">Дней в сетке:</label>
            <input
              type="number"
              value={moduleDaysCount}
              onChange={(e) => setModuleDaysCount(Math.max(7, parseInt(e.target.value) || 14))}
              min="7"
              max="60"
              className="w-16 px-2 py-1 text-sm rounded border border-gray-300"
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Левая панель: Доступные материалы */}
          <div className="w-64 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Доступные материалы</h3>
            <p className="text-xs text-gray-500 mb-3">Перетащите материал на нужный день</p>

            {materialsLoading ? (
              <div className="text-sm text-gray-600">Загрузка...</div>
            ) : availableMaterials.length === 0 ? (
              <div className="text-sm text-gray-500">Все материалы добавлены</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableMaterials.map((material) => (
                  <div
                    key={material.id}
                    draggable
                    onDragStart={() => handleDragStart(material)}
                    onDragEnd={handleDragEnd}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{material.material_type === 'audio' ? '🎵' : '🎬'}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{material.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Правая панель: Сетка дней */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Сетка дней модуля</h3>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: moduleDaysCount }, (_, i) => i + 1).map((day) => (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(day)}
                  className={`min-h-24 p-2 rounded-lg border-2 transition-colors ${
                    draggedMaterial
                      ? 'border-blue-300 bg-blue-50'
                      : materialsByDay[day]?.length
                      ? 'border-purple-200 bg-purple-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-600 mb-2">День {day}</div>

                  {materialsByDay[day]?.map((mm) => (
                    <div
                      key={mm.id}
                      className="mb-1 p-1.5 bg-white rounded border border-gray-200 text-xs group relative"
                    >
                      <div className="flex items-center gap-1">
                        <span>{mm.material?.material_type === 'audio' ? '🎵' : '🎬'}</span>
                        <span className="truncate flex-1">{mm.material?.name}</span>
                        <button
                          onClick={() => handleRemoveMaterial(mm)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5"
                          title="Удалить"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      {mm.active_days && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {mm.active_days} дн.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Модальное окно настройки длительности */}
        {activeDaysModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setActiveDaysModal(null)}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Добавить материал</h3>
              <p className="text-sm text-gray-600 mb-4">
                "{activeDaysModal.materialName}" на день {activeDaysModal.targetDay}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Сколько дней будет активен?
                  </label>
                  <input
                    type="number"
                    value={activeDaysValue}
                    onChange={(e) => setActiveDaysValue(e.target.value)}
                    placeholder="Пусто = бессрочно"
                    min="1"
                    className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Оставьте пустым для бессрочного доступа
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmAddMaterial}
                    disabled={isMutating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isMutating ? 'Добавление...' : 'Добавить'}
                  </button>
                  <button
                    onClick={() => setActiveDaysModal(null)}
                    disabled={isMutating}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex gap-6 p-6 bg-white rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
      {/* ЛЕВАЯ ПАНЕЛЬ: Выбор потока */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 pr-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Потоки</h2>

        {streamsLoading ? (
          <div className="text-gray-600 text-sm">Загрузка потоков...</div>
        ) : !streams || streams.length === 0 ? (
          <div className="text-gray-500 text-sm">
            Нет потоков. Создайте поток во вкладке "Потоки".
          </div>
        ) : (
          <div className="space-y-2">
            {sortedStreams.map((stream) => (
              <div
                key={stream.id}
                onClick={() => setSelectedStreamId(stream.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStreamId === stream.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-gray-900 text-sm">{stream.name}</div>
                {stream.start_date && (
                  <div className="text-xs text-gray-500 mt-1">
                    Начало: {new Date(stream.start_date).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ: Модули потока */}
      <div className="flex-1">
        {!selectedStreamId ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            ← Выберите поток для управления модулями
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Модули потока</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {streams?.find((s) => s.id === selectedStreamId)?.name}
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isMutating}
              >
                + Создать модуль
              </button>
            </div>

            {modulesLoading ? (
              <div className="text-gray-600">Загрузка модулей...</div>
            ) : !sortedModules || sortedModules.length === 0 ? (
              <div className="text-gray-500">
                У этого потока пока нет модулей. Создайте первый модуль.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedModules.map((module) => (
                  <div
                    key={module.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {module.color && (
                          <div
                            className="w-5 h-5 rounded-full border border-gray-200"
                            style={{ backgroundColor: module.color }}
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
                          <p className="text-sm text-gray-600">Порядок: {module.order_num}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMaterialsView(module)}
                          className="px-3 py-1 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 rounded hover:bg-purple-50 flex items-center gap-1"
                          disabled={isMutating}
                        >
                          <Book className="w-3 h-3" />
                          Материалы
                        </button>
                        <button
                          onClick={() => openEditModal(module)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                          disabled={isMutating}
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => handleDelete(module)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50"
                          disabled={isMutating}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingModule ? 'Редактировать модуль' : 'Создать модуль'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название модуля *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название модуля..."
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  disabled={isMutating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    disabled={isMutating}
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1 px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    disabled={isMutating}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Порядковый номер
                </label>
                <input
                  type="number"
                  value={formData.order_num}
                  onChange={(e) =>
                    setFormData({ ...formData, order_num: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  disabled={isMutating}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isMutating || !formData.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMutating ? 'Сохранение...' : editingModule ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={isMutating}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulesManager;
