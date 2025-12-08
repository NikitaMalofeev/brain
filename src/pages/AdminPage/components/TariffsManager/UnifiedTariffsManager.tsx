import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTariffsAdmin, type Tariff, type TariffFormData } from '@/lib/supabase/hooks/useTariffsAdmin';
import {
  useTariffConfiguration,
  useStreams,
  useStreamTariffId,
  useAddModuleToTariff,
  useUpdateModuleInTariff,
  useRemoveModuleFromTariff,
  useAddTechniqueToTariffModule,
  useUpdateTechniqueInTariffModule,
  useRemoveTechniqueFromTariffModule,
  TariffModuleConfig,
} from '@/lib/supabase/hooks/useTariffConfiguration';
import { useStreamModules } from '@/lib/supabase/hooks/useStreamModules';
import { useTechniques } from '@/lib/supabase/hooks/useTechniques';
import { logger } from '@/lib/logger';

/**
 * Объединенная страница управления тарифами
 * Слева: список всех тарифов (создать, редактировать, удалить)
 * Справа: настройка выбранного тарифа по потокам (модули и техники)
 */
const UnifiedTariffsManager: React.FC = () => {
  // ========== СОСТОЯНИЯ ==========
  const [selectedTariffId, setSelectedTariffId] = useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<string | null>(null);

  // Состояния для модального окна тарифа
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentTariff, setCurrentTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState<TariffFormData>({
    name: '',
    code: '',
    description: '',
  });

  // ========== ХУКИ ДЛЯ ТАРИФОВ ==========
  const {
    tariffs,
    loading: tariffsLoading,
    error: tariffsError,
    createTariff,
    createTariffLoading,
    updateTariff,
    updateTariffLoading,
    deleteTariff,
    isMutating,
  } = useTariffsAdmin();

  // ========== ХУКИ ДЛЯ КОНФИГУРАЦИИ ==========
  const { data: streams } = useStreams();
  const { data: streamModules } = useStreamModules(selectedStreamId);
  const { data: allTechniques } = useTechniques(null);
  const { data: streamTariffId } = useStreamTariffId(selectedStreamId, selectedTariffId);
  const { data: configuration, isLoading: configLoading } = useTariffConfiguration(
    selectedStreamId,
    selectedTariffId
  );

  // Мутации для модулей и техник
  const addModuleMutation = useAddModuleToTariff();
  const updateModuleMutation = useUpdateModuleInTariff();
  const removeModuleMutation = useRemoveModuleFromTariff();
  const addTechniqueMutation = useAddTechniqueToTariffModule();
  const updateTechniqueMutation = useUpdateTechniqueInTariffModule();
  const removeTechniqueMutation = useRemoveTechniqueFromTariffModule();

  // ========== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ==========
  const selectedTariff = tariffs?.find((t) => t.id === selectedTariffId);

  const sortedTariffs = useMemo(() => {
    if (!tariffs || tariffs.length === 0) return [];
    return [...tariffs].sort((a, b) => a.code.localeCompare(b.code));
  }, [tariffs]);

  const availableModules = streamModules?.filter(
    (module) => !configuration?.modules.some((cm) => cm.stream_module_id === module.id)
  );

  const getAvailableTechniques = (module: TariffModuleConfig) => {
    return allTechniques?.filter(
      (technique) => !module.techniques.some((t) => t.technique_id === technique.id)
    );
  };

  // ========== ОБРАБОТЧИКИ ДЛЯ ТАРИФОВ ==========
  const openCreateModal = () => {
    setFormData({ name: '', code: '', description: '' });
    setModalMode('add');
    setCurrentTariff(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tariff: Tariff) => {
    setFormData({
      name: tariff.name,
      code: tariff.code,
      description: tariff.description || '',
    });
    setModalMode('edit');
    setCurrentTariff(tariff);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTariff(null);
    setFormData({ name: '', code: '', description: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return;

    try {
      if (modalMode === 'add') {
        await createTariff(formData);
      } else if (currentTariff) {
        await updateTariff(currentTariff.id, formData);
      }
      closeModal();
    } catch (err) {
      console.error('Ошибка при сохранении тарифа:', err);
    }
  };

  const handleDelete = async (tariff: Tariff) => {
    if (!confirm(`Удалить тариф "${tariff.name}"?`)) return;

    try {
      await deleteTariff(tariff.id);
      if (selectedTariffId === tariff.id) {
        setSelectedTariffId(null);
        setSelectedStreamId(null);
      }
    } catch (err) {
      console.error('Ошибка при удалении тарифа:', err);
    }
  };

  // ========== ОБРАБОТЧИКИ ДЛЯ МОДУЛЕЙ И ТЕХНИК ==========
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

  const handleAddModule = async (moduleId: string) => {
    if (!streamTariffId) return;

    try {
      await addModuleMutation.mutateAsync({
        stream_tariff_id: streamTariffId,
        stream_module_id: moduleId,
        access_duration_days: null,
        order_num: (configuration?.modules.length || 0) + 1,
      });
      logger.info('Module added to tariff', { moduleId });
    } catch (error) {
      logger.error('Failed to add module to tariff', { moduleId, error });
    }
  };

  const handleUpdateModule = async (
    tariffStreamModuleId: string,
    accessDurationDays: number | null,
    orderNum: number
  ) => {
    try {
      await updateModuleMutation.mutateAsync({
        tariff_stream_module_id: tariffStreamModuleId,
        access_duration_days: accessDurationDays,
        order_num: orderNum,
      });
      logger.info('Module updated in tariff', { tariffStreamModuleId });
      setEditingModule(null);
    } catch (error) {
      logger.error('Failed to update module in tariff', { tariffStreamModuleId, error });
      alert('Ошибка при обновлении модуля: ' + (error as any)?.message);
    }
  };

  const handleRemoveModule = async (tariffStreamModuleId: string) => {
    if (!confirm('Удалить модуль из тарифа?')) return;

    try {
      await removeModuleMutation.mutateAsync(tariffStreamModuleId);
      logger.info('Module removed from tariff', { tariffStreamModuleId });
    } catch (error) {
      logger.error('Failed to remove module from tariff', { tariffStreamModuleId, error });
    }
  };

  const handleAddTechnique = async (tariffStreamModuleId: string, techniqueId: string) => {
    try {
      await addTechniqueMutation.mutateAsync({
        tariff_stream_module_id: tariffStreamModuleId,
        technique_id: techniqueId,
        unlock_offset_days: 0,
        order_num: 0,
      });
      logger.info('Technique added to module', { techniqueId });
    } catch (error) {
      logger.error('Failed to add technique to module', { techniqueId, error });
      alert('Ошибка при добавлении техники: ' + (error as any)?.message);
    }
  };

  const handleUpdateTechnique = async (
    tariffModuleTechniqueId: string,
    unlockOffsetDays: number,
    orderNum: number
  ) => {
    try {
      await updateTechniqueMutation.mutateAsync({
        tariff_module_technique_id: tariffModuleTechniqueId,
        unlock_offset_days: unlockOffsetDays,
        order_num: orderNum,
      });
      logger.info('Technique updated in module', { tariffModuleTechniqueId });
      setEditingTechnique(null);
    } catch (error) {
      logger.error('Failed to update technique in module', { tariffModuleTechniqueId, error });
      alert('Ошибка при обновлении техники: ' + (error as any)?.message);
    }
  };

  const handleRemoveTechnique = async (tariffModuleTechniqueId: string) => {
    if (!confirm('Удалить технику из модуля?')) return;

    try {
      await removeTechniqueMutation.mutateAsync(tariffModuleTechniqueId);
      logger.info('Technique removed from module', { tariffModuleTechniqueId });
    } catch (error) {
      logger.error('Failed to remove technique from module', { tariffModuleTechniqueId, error });
    }
  };

  // ========== РЕНДЕР ==========
  return (
    <div className="flex gap-6 p-6 bg-white rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
      {/* ЛЕВАЯ ПАНЕЛЬ: Список тарифов */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 pr-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Тарифы</h2>
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={isMutating}
          >
            + Создать
          </button>
        </div>

        {tariffsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {tariffsError.message}
          </div>
        )}

        {tariffsLoading ? (
          <div className="text-gray-600 text-sm">Загрузка тарифов...</div>
        ) : sortedTariffs.length === 0 ? (
          <div className="text-gray-500 text-sm">Нет тарифов. Создайте первый.</div>
        ) : (
          <div className="space-y-2">
            {sortedTariffs.map((tariff) => (
              <div
                key={tariff.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTariffId === tariff.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedTariffId(tariff.id);
                  setSelectedStreamId(null);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{tariff.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Код: {tariff.code}</div>
                    {tariff.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {tariff.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(tariff);
                      }}
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 rounded hover:bg-blue-100"
                      disabled={isMutating}
                      title="Редактировать"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tariff);
                      }}
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-700 rounded hover:bg-red-100"
                      disabled={isMutating}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ: Настройка выбранного тарифа */}
      <div className="flex-1">
        {!selectedTariff ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            ← Выберите тариф для настройки
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedTariff.name}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Код: {selectedTariff.code}
                {selectedTariff.description && ` • ${selectedTariff.description}`}
              </p>
            </div>

            {/* Выбор потока */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Выберите поток:</label>
              <select
                value={selectedStreamId || ''}
                onChange={(e) => setSelectedStreamId(e.target.value || null)}
                className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Выберите поток --</option>
                {streams?.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Конфигурация модулей и техник */}
            {selectedStreamId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Модули в тарифе:</h3>

                {configLoading ? (
                  <div className="text-gray-600">Загрузка конфигурации...</div>
                ) : (
                  <>
                    {/* Список модулей */}
                    <div className="space-y-3">
                      {configuration?.modules.map((module) => (
                        <motion.div
                          key={module.stream_module_id}
                          layout
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleModule(module.stream_module_id)}
                                  className="text-gray-700 hover:text-gray-900"
                                >
                                  {expandedModules.has(module.stream_module_id) ? '▼' : '▶'}
                                </button>
                                <h3 className="text-lg font-medium text-gray-900">
                                  {module.module_name}
                                </h3>
                              </div>

                              {/* Редактирование модуля */}
                              {editingModule === module.tariff_stream_module_id ? (
                                <div className="mt-3 ml-8 space-y-2 bg-white p-3 rounded border border-blue-300">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Доступ к модулю (дней):
                                    </label>
                                    <input
                                      type="number"
                                      id={`access-days-${module.tariff_stream_module_id}`}
                                      defaultValue={module.access_duration_days || ''}
                                      placeholder="Пусто = бессрочно"
                                      className="w-full px-3 py-1.5 text-sm rounded bg-white text-gray-900 border border-gray-300"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const input = document.getElementById(
                                          `access-days-${module.tariff_stream_module_id}`
                                        ) as HTMLInputElement;
                                        const days = input.value ? parseInt(input.value) : null;
                                        handleUpdateModule(
                                          module.tariff_stream_module_id,
                                          days,
                                          module.order_num
                                        );
                                      }}
                                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      onClick={() => setEditingModule(null)}
                                      className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 ml-8 flex items-center gap-3">
                                  <p className="text-sm text-gray-600">
                                    Доступ:{' '}
                                    {module.access_duration_days
                                      ? `${module.access_duration_days} дней`
                                      : 'Бессрочно'}
                                  </p>
                                  <button
                                    onClick={() =>
                                      setEditingModule(module.tariff_stream_module_id)
                                    }
                                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                                  >
                                    Изменить
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleRemoveModule(module.tariff_stream_module_id)}
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                            >
                              Удалить
                            </button>
                          </div>

                          {/* Техники в модуле */}
                          <AnimatePresence>
                            {expandedModules.has(module.stream_module_id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 ml-8 space-y-2"
                              >
                                <h4 className="text-sm font-medium text-gray-700">Техники:</h4>
                                {module.techniques.length === 0 ? (
                                  <p className="text-sm text-gray-500">Нет техник</p>
                                ) : (
                                  <div className="space-y-2">
                                    {module.techniques.map((technique) => (
                                      <div
                                        key={technique.technique_id}
                                        className="bg-white p-2 rounded border border-gray-200"
                                      >
                                        {editingTechnique ===
                                        technique.tariff_module_technique_id ? (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-gray-900">
                                                {technique.technique_title}
                                              </span>
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Открыть через (дней):
                                              </label>
                                              <input
                                                type="number"
                                                id={`unlock-days-${technique.tariff_module_technique_id}`}
                                                defaultValue={technique.unlock_offset_days}
                                                min="0"
                                                className="w-full px-2 py-1 text-sm rounded bg-white text-gray-900 border border-gray-300"
                                              />
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => {
                                                  const input = document.getElementById(
                                                    `unlock-days-${technique.tariff_module_technique_id}`
                                                  ) as HTMLInputElement;
                                                  const days = parseInt(input.value) || 0;
                                                  handleUpdateTechnique(
                                                    technique.tariff_module_technique_id!,
                                                    days,
                                                    technique.order_num
                                                  );
                                                }}
                                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                              >
                                                Сохранить
                                              </button>
                                              <button
                                                onClick={() => setEditingTechnique(null)}
                                                className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                              >
                                                Отмена
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm text-gray-900">
                                                {technique.technique_title}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                (через {technique.unlock_offset_days} дн. → день {technique.unlock_offset_days + 1})
                                              </span>
                                              <button
                                                onClick={() =>
                                                  setEditingTechnique(
                                                    technique.tariff_module_technique_id!
                                                  )
                                                }
                                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                                              >
                                                Изменить
                                              </button>
                                            </div>
                                            <button
                                              onClick={() =>
                                                handleRemoveTechnique(
                                                  technique.tariff_module_technique_id!
                                                )
                                              }
                                              className="text-xs text-red-600 hover:text-red-700"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Добавить технику */}
                                <div className="mt-3">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAddTechnique(
                                          module.tariff_stream_module_id,
                                          e.target.value
                                        );
                                        e.target.value = '';
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 text-sm rounded bg-white text-gray-900 border border-gray-300"
                                  >
                                    <option value="">+ Добавить технику</option>
                                    {getAvailableTechniques(module)?.map((technique) => (
                                      <option key={technique.id} value={technique.id}>
                                        {technique.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>

                    {/* Добавить модуль */}
                    {availableModules && availableModules.length > 0 && (
                      <div className="mt-4">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddModule(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">+ Добавить модуль в тариф</option>
                          {availableModules.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО для создания/редактирования тарифа */}
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
                {modalMode === 'add' ? 'Создать тариф' : 'Редактировать тариф'}
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
                  Название тарифа *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название тарифа..."
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  disabled={createTariffLoading || updateTariffLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Код тарифа *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="T1, T2, T3..."
                  maxLength={10}
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  disabled={createTariffLoading || updateTariffLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Краткий код для идентификации (например: T1, T2, T3)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание тарифа..."
                  rows={4}
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 resize-vertical"
                  disabled={createTariffLoading || updateTariffLoading}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={
                    createTariffLoading ||
                    updateTariffLoading ||
                    !formData.name.trim() ||
                    !formData.code.trim()
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTariffLoading || updateTariffLoading
                    ? 'Сохранение...'
                    : modalMode === 'add'
                      ? 'Создать'
                      : 'Сохранить'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={createTariffLoading || updateTariffLoading}
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

export default UnifiedTariffsManager;
