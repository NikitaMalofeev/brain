import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTariffConfiguration,
  useStreams,
  useTariffs,
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
 * Компонент для настройки тарифа
 * Позволяет выбрать поток и тариф, настроить модули и техники
 */
const TariffConfigurationEditor: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [selectedTariffId, setSelectedTariffId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<string | null>(null);

  // Получить все потоки и тарифы
  const { data: streams, isLoading: streamsLoading, error: streamsError } = useStreams();
  const { data: tariffs, isLoading: tariffsLoading, error: tariffsError } = useTariffs();

  // Отладка
  React.useEffect(() => {
    console.log('TariffConfigurationEditor mounted');
    console.log('Streams:', streams);
    console.log('Tariffs:', tariffs);
    console.log('Loading:', { streamsLoading, tariffsLoading });
    console.log('Errors:', { streamsError, tariffsError });
  }, [streams, tariffs, streamsLoading, tariffsLoading, streamsError, tariffsError]);

  // Получить stream_tariff_id
  const { data: streamTariffId } = useStreamTariffId(selectedStreamId, selectedTariffId);

  // Получить конфигурацию тарифа
  const { data: configuration, isLoading: configLoading } = useTariffConfiguration(
    selectedStreamId,
    selectedTariffId
  );

  // Получить все модули потока
  const { data: streamModules } = useStreamModules(selectedStreamId);

  // Получить все техники
  const { data: allTechniques } = useTechniques(null);

  // Мутации
  const addModuleMutation = useAddModuleToTariff();
  const updateModuleMutation = useUpdateModuleInTariff();
  const removeModuleMutation = useRemoveModuleFromTariff();
  const addTechniqueMutation = useAddTechniqueToTariffModule();
  const updateTechniqueMutation = useUpdateTechniqueInTariffModule();
  const removeTechniqueMutation = useRemoveTechniqueFromTariffModule();

  // Переключить раскрытие модуля
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

  // Добавить модуль в тариф
  const handleAddModule = async (moduleId: string) => {
    if (!streamTariffId) return;

    try {
      await addModuleMutation.mutateAsync({
        stream_tariff_id: streamTariffId,
        stream_module_id: moduleId,
        access_duration_days: null, // Бессрочно по умолчанию
        order_num: (configuration?.modules.length || 0) + 1,
      });
      logger.info('Module added to tariff', { moduleId });
    } catch (error) {
      logger.error('Failed to add module to tariff', { moduleId, error });
    }
  };

  // Удалить модуль из тарифа
  const handleRemoveModule = async (tariffStreamModuleId: string) => {
    if (!confirm('Удалить модуль из тарифа?')) return;

    try {
      await removeModuleMutation.mutateAsync(tariffStreamModuleId);
      logger.info('Module removed from tariff', { tariffStreamModuleId });
    } catch (error) {
      logger.error('Failed to remove module from tariff', { tariffStreamModuleId, error });
    }
  };

  // Добавить технику в модуль
  const handleAddTechnique = async (tariffStreamModuleId: string, techniqueId: string) => {
    try {
      await addTechniqueMutation.mutateAsync({
        tariff_stream_module_id: tariffStreamModuleId,
        technique_id: techniqueId,
        unlock_offset_days: 0, // Доступна сразу по умолчанию
        order_num: 0,
      });
      logger.info('Technique added to module', { techniqueId });
    } catch (error) {
      logger.error('Failed to add technique to module', { techniqueId, error });
      alert('Ошибка при добавлении техники: ' + (error as any)?.message);
    }
  };

  // Обновить модуль в тарифе
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

  // Обновить технику в модуле
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

  // Удалить технику из модуля
  const handleRemoveTechnique = async (tariffModuleTechniqueId: string) => {
    if (!confirm('Удалить технику из модуля?')) return;

    try {
      await removeTechniqueMutation.mutateAsync(tariffModuleTechniqueId);
      logger.info('Technique removed from module', { tariffModuleTechniqueId });
    } catch (error) {
      logger.error('Failed to remove technique from module', { tariffModuleTechniqueId, error });
    }
  };

  // Получить модули которых ещё нет в тарифе
  const availableModules = streamModules?.filter(
    (module) => !configuration?.modules.some((cm) => cm.stream_module_id === module.id)
  );

  // Получить техники которых ещё нет в модуле
  const getAvailableTechniques = (module: TariffModuleConfig) => {
    return allTechniques?.filter(
      (technique) => !module.techniques.some((t) => t.technique_id === technique.id)
    );
  };

  if (streamsLoading || tariffsLoading) {
    return <div className="p-4 text-gray-900">Загрузка...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Настройка тарифов</h1>

      {/* Выбор потока */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Выберите поток:</label>
        <select
          value={selectedStreamId || ''}
          onChange={(e) => {
            setSelectedStreamId(e.target.value || null);
            setSelectedTariffId(null);
          }}
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

      {/* Выбор тарифа */}
      {selectedStreamId && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Выберите тариф:</label>
          <select
            value={selectedTariffId || ''}
            onChange={(e) => setSelectedTariffId(e.target.value || null)}
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Выберите тариф --</option>
            {tariffs?.map((tariff) => (
              <option key={tariff.id} value={tariff.id}>
                {tariff.name} ({tariff.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Конфигурация тарифа */}
      {selectedStreamId && selectedTariffId && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Модули в тарифе:</h2>

          {configLoading ? (
            <div className="text-gray-600">Загрузка конфигурации...</div>
          ) : (
            <>
              {/* Список модулей в тарифе */}
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
                          <h3 className="text-lg font-medium text-gray-900">{module.module_name}</h3>
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
                                placeholder="Оставить пустым для бессрочного доступа"
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
                                  handleUpdateModule(module.tariff_stream_module_id, days, module.order_num);
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
                              Доступ: {module.access_duration_days ? `${module.access_duration_days} дней` : 'Бессрочно'}
                            </p>
                            <button
                              onClick={() => setEditingModule(module.tariff_stream_module_id)}
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
                                  {editingTechnique === technique.tariff_module_technique_id ? (
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
                                          (открыть через {technique.unlock_offset_days} дней)
                                        </span>
                                        <button
                                          onClick={() => setEditingTechnique(technique.tariff_module_technique_id!)}
                                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                                        >
                                          Изменить
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveTechnique(technique.tariff_module_technique_id!)}
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
                                  handleAddTechnique(module.tariff_stream_module_id, e.target.value);
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
  );
};

export default TariffConfigurationEditor;
