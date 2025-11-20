import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoursesAdmin } from '@/lib/supabase/hooks/useCoursesAdmin';
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
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

// Тип навигации
type NavigationView = 'courses' | 'streams' | 'tariffs' | 'configuration';

interface NavigationState {
  view: NavigationView;
  courseId?: string;
  courseName?: string;
  streamId?: string;
  streamName?: string;
  tariffId?: string;
  tariffName?: string;
}

/**
 * Хук для получения потоков курса
 */
function useCourseStreams(courseId: string | null) {
  return useQuery({
    queryKey: ['course-streams', courseId],
    queryFn: async () => {
      if (!courseId || !supabase) return [];

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching course streams', { courseId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Хук для получения тарифов потока
 */
function useStreamTariffs(streamId: string | null) {
  return useQuery({
    queryKey: ['stream-tariffs', streamId],
    queryFn: async () => {
      if (!streamId || !supabase) return [];

      const { data, error } = await supabase
        .from('stream_tariffs')
        .select(`
          id,
          stream_id,
          tariff_id,
          tariffs (
            id,
            name,
            code,
            description
          )
        `)
        .eq('stream_id', streamId);

      if (error) {
        logger.error('Error fetching stream tariffs', { streamId, error });
        throw error;
      }

      return data || [];
    },
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Хук для добавления тарифа к потоку
 */
function useAddTariffToStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { stream_id: string; tariff_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('stream_tariffs')
        .insert({
          stream_id: params.stream_id,
          tariff_id: params.tariff_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-tariffs'] });
    },
  });
}

/**
 * Хук для удаления тарифа из потока
 */
function useRemoveTariffFromStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (streamTariffId: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('stream_tariffs')
        .delete()
        .eq('id', streamTariffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['tariff-configuration'] });
    },
  });
}

/**
 * Хук для копирования потока
 */
function useCopyStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      source_stream_id: string;
      new_name: string;
      new_start_date: string;
    }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase.rpc('copy_stream_with_config', {
        p_source_stream_id: params.source_stream_id,
        p_new_stream_name: params.new_name,
        p_new_start_date: params.new_start_date,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-streams'] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

/**
 * Интерфейс для материала модуля
 */
interface ModuleMaterialInfo {
  id: string;
  module_id: string;
  material_id: string;
  order_num: number;
  release_day: number | null;
  active_days: number | null;
  material: {
    id: string;
    name: string;
    material_type: 'video' | 'audio';
  };
}

/**
 * Хук для получения материалов всех модулей потока
 */
function useStreamModuleMaterials(streamId: string | null) {
  return useQuery({
    queryKey: ['stream-module-materials', streamId],
    queryFn: async (): Promise<Record<string, ModuleMaterialInfo[]>> => {
      if (!streamId || !supabase) return {};

      // Сначала получаем модули потока
      const { data: modules, error: modulesError } = await supabase
        .from('stream_modules')
        .select('id')
        .eq('stream_id', streamId);

      if (modulesError) {
        logger.error('Error fetching stream modules for materials', { streamId, modulesError });
        throw modulesError;
      }

      if (!modules || modules.length === 0) return {};

      const moduleIds = modules.map(m => m.id);

      // Получаем материалы для всех модулей
      const { data: materials, error: materialsError } = await supabase
        .from('module_materials')
        .select(`
          id,
          module_id,
          material_id,
          order_num,
          release_day,
          active_days,
          material:materials(id, name, material_type)
        `)
        .in('module_id', moduleIds)
        .order('release_day');

      if (materialsError) {
        logger.error('Error fetching module materials', { moduleIds, materialsError });
        throw materialsError;
      }

      // Группируем материалы по module_id
      const result: Record<string, ModuleMaterialInfo[]> = {};
      for (const item of materials || []) {
        if (!result[item.module_id]) {
          result[item.module_id] = [];
        }
        result[item.module_id].push({
          ...item,
          material: item.material as unknown as ModuleMaterialInfo['material']
        });
      }

      return result;
    },
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Объединенная страница управления курсами
 * Навигация: Курсы → Потоки → Тарифы → Модули/Техники
 */
const UnifiedCoursesManager: React.FC = () => {
  // ========== СОСТОЯНИЯ ==========
  const [navigation, setNavigation] = useState<NavigationState>({ view: 'courses' });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyStreamData, setCopyStreamData] = useState({
    streamId: '',
    newName: '',
    newStartDate: ''
  });

  // ========== ХУКИ ДЛЯ КУРСОВ ==========
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses,
  } = useCoursesAdmin();

  // ========== ХУКИ ДЛЯ ПОТОКОВ ==========
  const { data: courseStreams, isLoading: streamsLoading } = useCourseStreams(navigation.courseId || null);

  // ========== ХУКИ ДЛЯ ТАРИФОВ ==========
  const { data: streamTariffs, isLoading: tariffsLoading } = useStreamTariffs(navigation.streamId || null);
  const { data: allTariffs } = useTariffs();

  // ========== ХУКИ ДЛЯ КОНФИГУРАЦИИ ==========
  const { data: streamModules } = useStreamModules(navigation.streamId || null);
  const { data: allTechniques } = useTechniques(null);
  const { data: streamTariffId } = useStreamTariffId(navigation.streamId || null, navigation.tariffId || null);
  const { data: configuration, isLoading: configLoading } = useTariffConfiguration(
    navigation.streamId || null,
    navigation.tariffId || null
  );
  const { data: moduleMaterials } = useStreamModuleMaterials(navigation.streamId || null);

  // Мутации
  const addTariffToStreamMutation = useAddTariffToStream();
  const removeTariffFromStreamMutation = useRemoveTariffFromStream();
  const copyStreamMutation = useCopyStream();
  const addModuleMutation = useAddModuleToTariff();
  const updateModuleMutation = useUpdateModuleInTariff();
  const removeModuleMutation = useRemoveModuleFromTariff();
  const addTechniqueMutation = useAddTechniqueToTariffModule();
  const updateTechniqueMutation = useUpdateTechniqueInTariffModule();
  const removeTechniqueMutation = useRemoveTechniqueFromTariffModule();

  // ========== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ==========
  const sortedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    return [...courses].sort((a, b) =>
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  }, [courses]);

  const availableTariffs = useMemo(() => {
    if (!allTariffs || !streamTariffs) return allTariffs || [];
    const usedTariffIds = streamTariffs.map((st: any) => st.tariff_id);
    return allTariffs.filter((t) => !usedTariffIds.includes(t.id));
  }, [allTariffs, streamTariffs]);

  const availableModules = streamModules?.filter(
    (module) => !configuration?.modules.some((cm) => cm.stream_module_id === module.id)
  );

  const getAvailableTechniques = (module: TariffModuleConfig) => {
    return allTechniques?.filter(
      (technique) => !module.techniques.some((t) => t.technique_id === technique.id)
    );
  };

  // ========== ОБРАБОТЧИКИ НАВИГАЦИИ ==========
  const handleCourseSelect = (courseId: string, courseName: string) => {
    setNavigation({ view: 'streams', courseId, courseName });
  };

  const handleStreamSelect = (streamId: string, streamName: string) => {
    setNavigation({
      ...navigation,
      view: 'tariffs',
      streamId,
      streamName,
    });
  };

  const handleTariffSelect = (tariffId: string, tariffName: string) => {
    setNavigation({
      ...navigation,
      view: 'configuration',
      tariffId,
      tariffName,
    });
  };

  const handleNavigationBack = () => {
    switch (navigation.view) {
      case 'configuration':
        setNavigation({
          view: 'tariffs',
          courseId: navigation.courseId,
          courseName: navigation.courseName,
          streamId: navigation.streamId,
          streamName: navigation.streamName,
        });
        break;
      case 'tariffs':
        setNavigation({
          view: 'streams',
          courseId: navigation.courseId,
          courseName: navigation.courseName,
        });
        break;
      case 'streams':
        setNavigation({ view: 'courses' });
        break;
    }
  };

  // ========== ОБРАБОТЧИКИ ДЛЯ ТАРИФОВ ==========
  const handleAddTariffToStream = async (tariffId: string) => {
    if (!navigation.streamId) return;

    try {
      await addTariffToStreamMutation.mutateAsync({
        stream_id: navigation.streamId,
        tariff_id: tariffId,
      });
    } catch (error) {
      alert('Ошибка при добавлении тарифа: ' + (error as any)?.message);
    }
  };

  const handleRemoveTariffFromStream = async (streamTariffId: string) => {
    if (!confirm('Удалить тариф из потока? Вся конфигурация модулей и техник будет удалена.')) return;

    try {
      await removeTariffFromStreamMutation.mutateAsync(streamTariffId);
    } catch (error) {
      alert('Ошибка при удалении тарифа: ' + (error as any)?.message);
    }
  };

  // ========== ОБРАБОТЧИКИ ДЛЯ КОПИРОВАНИЯ ==========
  const openCopyModal = (streamId: string, streamName: string) => {
    setCopyStreamData({
      streamId,
      newName: `${streamName} (копия)`,
      newStartDate: ''
    });
    setShowCopyModal(true);
  };

  const closeCopyModal = () => {
    setShowCopyModal(false);
    setCopyStreamData({ streamId: '', newName: '', newStartDate: '' });
  };

  const handleCopyStream = async () => {
    if (!copyStreamData.streamId || !copyStreamData.newName || !copyStreamData.newStartDate) return;

    try {
      await copyStreamMutation.mutateAsync({
        source_stream_id: copyStreamData.streamId,
        new_name: copyStreamData.newName,
        new_start_date: copyStreamData.newStartDate,
      });
      closeCopyModal();
      alert('Поток успешно скопирован!');
    } catch (error) {
      alert('Ошибка при копировании потока: ' + (error as any)?.message);
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
    } catch (error) {
      alert('Ошибка при добавлении модуля: ' + (error as any)?.message);
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
      setEditingModule(null);
    } catch (error) {
      alert('Ошибка при обновлении модуля: ' + (error as any)?.message);
    }
  };

  const handleRemoveModule = async (tariffStreamModuleId: string) => {
    if (!confirm('Удалить модуль из тарифа?')) return;

    try {
      await removeModuleMutation.mutateAsync(tariffStreamModuleId);
    } catch (error) {
      alert('Ошибка при удалении модуля: ' + (error as any)?.message);
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
    } catch (error) {
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
      setEditingTechnique(null);
    } catch (error) {
      alert('Ошибка при обновлении техники: ' + (error as any)?.message);
    }
  };

  const handleRemoveTechnique = async (tariffModuleTechniqueId: string) => {
    if (!confirm('Удалить технику из модуля?')) return;

    try {
      await removeTechniqueMutation.mutateAsync(tariffModuleTechniqueId);
    } catch (error) {
      alert('Ошибка при удалении техники: ' + (error as any)?.message);
    }
  };

  // ========== РЕНДЕР BREADCRUMB ==========
  const renderBreadcrumb = () => {
    const items = [{ label: 'Курсы', view: 'courses' as NavigationView }];

    if (navigation.courseId) {
      items.push({ label: navigation.courseName || 'Курс', view: 'streams' as NavigationView });
    }
    if (navigation.streamId) {
      items.push({ label: navigation.streamName || 'Поток', view: 'tariffs' as NavigationView });
    }
    if (navigation.tariffId) {
      items.push({ label: navigation.tariffName || 'Тариф', view: 'configuration' as NavigationView });
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        {items.map((item, index) => (
          <React.Fragment key={item.view}>
            {index > 0 && <span className="text-gray-400">→</span>}
            <button
              onClick={() => {
                if (item.view === 'courses') setNavigation({ view: 'courses' });
                else if (item.view === 'streams') setNavigation({ view: 'streams', courseId: navigation.courseId, courseName: navigation.courseName });
                else if (item.view === 'tariffs') setNavigation({ view: 'tariffs', courseId: navigation.courseId, courseName: navigation.courseName, streamId: navigation.streamId, streamName: navigation.streamName });
              }}
              disabled={index === items.length - 1}
              className={`hover:text-blue-600 ${index === items.length - 1 ? 'font-medium text-gray-900' : ''}`}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ========== РЕНДЕР СПИСКА КУРСОВ ==========
  const renderCoursesList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Курсы</h2>
        <button
          onClick={refetchCourses}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          disabled={coursesLoading}
        >
          Обновить
        </button>
      </div>

      {coursesError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {coursesError.message}
        </div>
      )}

      {coursesLoading ? (
        <div className="text-gray-600">Загрузка курсов...</div>
      ) : sortedCourses.length === 0 ? (
        <div className="text-gray-500">Курсы не найдены</div>
      ) : (
        <div className="space-y-3">
          {sortedCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => handleCourseSelect(course.id, course.title)}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{course.title}</h3>
                  {course.subtitle && (
                    <p className="text-sm text-gray-600 mt-1">{course.subtitle}</p>
                  )}
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ========== РЕНДЕР СПИСКА ПОТОКОВ ==========
  const renderStreamsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Потоки курса</h2>
          <p className="text-sm text-gray-600 mt-1">{navigation.courseName}</p>
        </div>
        <button
          onClick={handleNavigationBack}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Назад
        </button>
      </div>

      {streamsLoading ? (
        <div className="text-gray-600">Загрузка потоков...</div>
      ) : !courseStreams || courseStreams.length === 0 ? (
        <div className="text-gray-500">
          У этого курса пока нет потоков. Создайте поток в разделе "Потоки".
        </div>
      ) : (
        <div className="space-y-3">
          {courseStreams.map((stream) => (
            <div
              key={stream.id}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleStreamSelect(stream.id, stream.name)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{stream.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    {stream.start_date && (
                      <span className="text-sm text-gray-600">
                        Начало: {new Date(stream.start_date).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      stream.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stream.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCopyModal(stream.id, stream.name);
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                  >
                    Копировать
                  </button>
                  <span
                    className="text-gray-400 cursor-pointer"
                    onClick={() => handleStreamSelect(stream.id, stream.name)}
                  >
                    →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ========== РЕНДЕР СПИСКА ТАРИФОВ ПОТОКА ==========
  const renderTariffsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Тарифы потока</h2>
          <p className="text-sm text-gray-600 mt-1">{navigation.streamName}</p>
        </div>
        <button
          onClick={handleNavigationBack}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Назад
        </button>
      </div>

      {tariffsLoading ? (
        <div className="text-gray-600">Загрузка тарифов...</div>
      ) : (
        <>
          {/* Список тарифов потока */}
          {!streamTariffs || streamTariffs.length === 0 ? (
            <div className="text-gray-500">У этого потока пока нет тарифов.</div>
          ) : (
            <div className="space-y-3">
              {streamTariffs.map((st: any) => (
                <div
                  key={st.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleTariffSelect(st.tariff_id, st.tariffs?.name || 'Тариф')}
                    >
                      <h3 className="text-lg font-medium text-gray-900">
                        {st.tariffs?.name}
                      </h3>
                      <p className="text-sm text-gray-600">Код: {st.tariffs?.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTariffFromStream(st.id);
                        }}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50"
                      >
                        Удалить
                      </button>
                      <span
                        className="text-gray-400 cursor-pointer"
                        onClick={() => handleTariffSelect(st.tariff_id, st.tariffs?.name || 'Тариф')}
                      >
                        →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Добавить тариф */}
          {availableTariffs && availableTariffs.length > 0 && (
            <div className="mt-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddTariffToStream(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">+ Добавить тариф в поток</option>
                {availableTariffs.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name} ({tariff.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ========== РЕНДЕР КОНФИГУРАЦИИ ТАРИФА ==========
  const renderConfiguration = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Конфигурация тарифа</h2>
          <p className="text-sm text-gray-600 mt-1">
            {navigation.streamName} / {navigation.tariffName}
          </p>
        </div>
        <button
          onClick={handleNavigationBack}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Назад
        </button>
      </div>

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
                                  <div className="font-medium text-gray-900">
                                    {technique.technique_title}
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
                                        handleUpdateTechnique(technique.tariff_module_technique_id!, days, technique.order_num);
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
                                      (через {technique.unlock_offset_days} дней)
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

                      {/* Материалы модуля */}
                      {moduleMaterials && moduleMaterials[module.stream_module_id] && moduleMaterials[module.stream_module_id].length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Материалы из библиотеки:</h4>
                          <div className="space-y-2">
                            {moduleMaterials[module.stream_module_id].map((mm) => (
                              <div
                                key={mm.id}
                                className="bg-purple-50 p-2 rounded border border-purple-200 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {mm.material.material_type === 'audio' ? '🎵' : '🎬'}
                                  </span>
                                  <span className="text-sm text-gray-900">
                                    {mm.material.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    (день {mm.release_day || 1}{mm.active_days ? `, ${mm.active_days} дн.` : ''})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
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
  );

  // ========== ОСНОВНОЙ РЕНДЕР ==========
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
      {renderBreadcrumb()}

      <AnimatePresence mode="wait">
        <motion.div
          key={navigation.view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {navigation.view === 'courses' && renderCoursesList()}
          {navigation.view === 'streams' && renderStreamsList()}
          {navigation.view === 'tariffs' && renderTariffsList()}
          {navigation.view === 'configuration' && renderConfiguration()}
        </motion.div>
      </AnimatePresence>

      {/* Модальное окно копирования потока */}
      {showCopyModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeCopyModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Копировать поток</h3>
              <button
                onClick={closeCopyModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название нового потока *
                </label>
                <input
                  type="text"
                  value={copyStreamData.newName}
                  onChange={(e) => setCopyStreamData({ ...copyStreamData, newName: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата начала нового потока *
                </label>
                <input
                  type="date"
                  value={copyStreamData.newStartDate}
                  onChange={(e) => setCopyStreamData({ ...copyStreamData, newStartDate: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-sm text-gray-500">
                Будут скопированы: модули, тарифы, конфигурация техник, события календаря
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCopyStream}
                  disabled={copyStreamMutation.isPending || !copyStreamData.newName || !copyStreamData.newStartDate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {copyStreamMutation.isPending ? 'Копирование...' : 'Копировать'}
                </button>
                <button
                  onClick={closeCopyModal}
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
};

export default UnifiedCoursesManager;
