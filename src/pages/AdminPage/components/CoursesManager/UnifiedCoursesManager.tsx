import React, { useState, useMemo } from 'react';
import { useCoursesAdmin } from '@/lib/supabase/hooks/useCoursesAdmin';
import {
  useTariffConfiguration,
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
// useTechniques removed - using direct query for admin
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Spin,
  Alert,
  Empty,
  Breadcrumb,
  List,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  Collapse,
  Popconfirm,
  message,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RightOutlined,
  CheckOutlined,
  CloseOutlined,
  CaretRightOutlined,
  SoundOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TariffModuleContentManager from './TariffModuleContentManager';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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
 */
const UnifiedCoursesManager: React.FC = () => {
  // Состояния
  const [navigation, setNavigation] = useState<NavigationState>({ view: 'courses' });
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingModuleData, setEditingModuleData] = useState<{ days: number | null; gridDays: number | null; unlockDays: number | null }>({ days: null, gridDays: null, unlockDays: null });
  const [editingTechnique, setEditingTechnique] = useState<string | null>(null);
  const [editingTechniqueData, setEditingTechniqueData] = useState<{ days: number }>({ days: 0 });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyForm] = Form.useForm();

  // Хуки для курсов
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses,
  } = useCoursesAdmin();

  // Хуки для потоков
  const { data: courseStreams, isLoading: streamsLoading } = useCourseStreams(navigation.courseId || null);

  // Хуки для тарифов
  const { data: streamTariffs, isLoading: tariffsLoading } = useStreamTariffs(navigation.streamId || null);
  const { data: allTariffs } = useTariffs();

  // Хуки для конфигурации
  const { data: streamModules } = useStreamModules(navigation.streamId || null);

  // Получить все техники напрямую из таблицы (для админки)
  const { data: allTechniques } = useQuery({
    queryKey: ['all-materials-admin'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, order_num')
        .order('order_num');
      if (error) {
        logger.error('Error fetching materials for admin', { error });
        throw error;
      }
      // Map to match expected interface (title -> name for backwards compatibility)
      return (data || []).map(m => ({ ...m, title: m.name }));
    },
  });
  const { data: streamTariffId } = useStreamTariffId(navigation.streamId || null, navigation.tariffId || null);
  const { data: configuration, isLoading: configLoading } = useTariffConfiguration(
    navigation.streamId || null,
    navigation.tariffId || null
  );
  const { data: moduleMaterials } = useStreamModuleMaterials(navigation.streamId || null);

  // Получаем дату начала текущего потока
  const currentStreamStartDate = useMemo(() => {
    if (!navigation.streamId || !courseStreams) return undefined;
    const currentStream = courseStreams.find((s: any) => s.id === navigation.streamId);
    return currentStream?.start_date;
  }, [navigation.streamId, courseStreams]);

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

  // Вычисляемые значения
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

  const availableModules = useMemo(() => {
    if (!streamModules || !configuration) return streamModules || [];

    const addedModuleIds = configuration.modules.map(m => m.stream_module_id);
    const filtered = streamModules.filter(module => !addedModuleIds.includes(module.id));

    return filtered;
  }, [streamModules, configuration]);

  const getAvailableTechniques = (module: TariffModuleConfig) => {
    return allTechniques?.filter(
      (technique) => !module.techniques.some((t) => t.technique_id === technique.id)
    );
  };

  // Обработчики навигации
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

  // Обработчики для тарифов
  const handleAddTariffToStream = async (tariffId: string) => {
    if (!navigation.streamId) return;

    try {
      await addTariffToStreamMutation.mutateAsync({
        stream_id: navigation.streamId,
        tariff_id: tariffId,
      });
      message.success('Тариф добавлен в поток');
    } catch (error) {
      message.error('Ошибка при добавлении тарифа: ' + (error as any)?.message);
    }
  };

  const handleRemoveTariffFromStream = async (streamTariffId: string) => {
    try {
      await removeTariffFromStreamMutation.mutateAsync(streamTariffId);
      message.success('Тариф удалён из потока');
    } catch (error) {
      message.error('Ошибка при удалении тарифа: ' + (error as any)?.message);
    }
  };

  // Обработчики для копирования
  const openCopyModal = (streamId: string, streamName: string) => {
    copyForm.setFieldsValue({
      streamId,
      newName: `${streamName} (копия)`,
      newStartDate: null,
    });
    setShowCopyModal(true);
  };

  const handleCopyStream = async () => {
    try {
      const values = await copyForm.validateFields();
      await copyStreamMutation.mutateAsync({
        source_stream_id: values.streamId,
        new_name: values.newName,
        new_start_date: values.newStartDate.format('YYYY-MM-DD'),
      });
      setShowCopyModal(false);
      copyForm.resetFields();
      message.success('Поток успешно скопирован!');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('Ошибка при копировании потока: ' + error?.message);
    }
  };

  // Обработчики для модулей и техник
  const handleAddModule = async (moduleId: string) => {
    if (!streamTariffId) return;

    try {
      await addModuleMutation.mutateAsync({
        stream_tariff_id: streamTariffId,
        stream_module_id: moduleId,
        access_duration_days: null,
        order_num: (configuration?.modules.length || 0) + 1,
      });
      message.success('Модуль добавлен');
    } catch (error) {
      message.error('Ошибка при добавлении модуля: ' + (error as any)?.message);
    }
  };

  const handleUpdateModule = async (
    tariffStreamModuleId: string,
    accessDurationDays: number | null,
    gridDays: number | null,
    unlockOffsetDays: number | null,
    orderNum: number
  ) => {
    try {
      await updateModuleMutation.mutateAsync({
        tariff_stream_module_id: tariffStreamModuleId,
        access_duration_days: accessDurationDays,
        grid_days: gridDays,
        unlock_offset_days: unlockOffsetDays,
        order_num: orderNum,
      });
      setEditingModule(null);
      message.success('Модуль обновлён');
    } catch (error) {
      message.error('Ошибка при обновлении модуля: ' + (error as any)?.message);
    }
  };

  const handleRemoveModule = async (tariffStreamModuleId: string) => {
    try {
      await removeModuleMutation.mutateAsync(tariffStreamModuleId);
      message.success('Модуль удалён');
    } catch (error) {
      message.error('Ошибка при удалении модуля: ' + (error as any)?.message);
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
      message.success('Техника добавлена');
    } catch (error) {
      message.error('Ошибка при добавлении техники: ' + (error as any)?.message);
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
      message.success('Техника обновлена');
    } catch (error) {
      message.error('Ошибка при обновлении техники: ' + (error as any)?.message);
    }
  };

  const handleRemoveTechnique = async (tariffModuleTechniqueId: string) => {
    try {
      await removeTechniqueMutation.mutateAsync(tariffModuleTechniqueId);
      message.success('Техника удалена');
    } catch (error) {
      message.error('Ошибка при удалении техники: ' + (error as any)?.message);
    }
  };

  // Breadcrumb
  const breadcrumbItems = [
    {
      title: <a onClick={() => setNavigation({ view: 'courses' })}>Курсы</a>,
    },
  ];
  if (navigation.courseId) {
    breadcrumbItems.push({
      title: navigation.view === 'streams' ? (
        <Text strong>{navigation.courseName}</Text>
      ) : (
        <a onClick={() => setNavigation({ view: 'streams', courseId: navigation.courseId, courseName: navigation.courseName })}>
          {navigation.courseName}
        </a>
      ),
    });
  }
  if (navigation.streamId) {
    breadcrumbItems.push({
      title: navigation.view === 'tariffs' ? (
        <Text strong>{navigation.streamName}</Text>
      ) : (
        <a onClick={() => setNavigation({
          view: 'tariffs',
          courseId: navigation.courseId,
          courseName: navigation.courseName,
          streamId: navigation.streamId,
          streamName: navigation.streamName,
        })}>
          {navigation.streamName}
        </a>
      ),
    });
  }
  if (navigation.tariffId) {
    breadcrumbItems.push({
      title: <Text strong>{navigation.tariffName}</Text>,
    });
  }

  // Рендер списка курсов
  const renderCoursesList = () => (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Курсы</Title>}
      extra={
        <Button icon={<ReloadOutlined />} onClick={refetchCourses} loading={coursesLoading}>
          Обновить
        </Button>
      }
    >
      {coursesError && (
        <Alert message={coursesError.message} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {coursesLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : sortedCourses.length === 0 ? (
        <Empty description="Курсы не найдены" />
      ) : (
        <List
          dataSource={sortedCourses}
          renderItem={(course) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => handleCourseSelect(course.id, course.title)}
              actions={[<RightOutlined key="arrow" />]}
            >
              <List.Item.Meta
                title={<Text strong>{course.title}</Text>}
                description={course.subtitle}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  // Рендер списка потоков
  const renderStreamsList = () => (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>Потоки курса</Title>
          <Text type="secondary">{navigation.courseName}</Text>
        </div>
      }
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={handleNavigationBack}>
          Назад
        </Button>
      }
    >
      {streamsLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : !courseStreams || courseStreams.length === 0 ? (
        <Empty description="У этого курса пока нет потоков. Создайте поток в разделе «Потоки»." />
      ) : (
        <List
          dataSource={courseStreams}
          renderItem={(stream) => (
            <List.Item
              actions={[
                <Button
                  key="copy"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openCopyModal(stream.id, stream.name);
                  }}
                >
                  Копировать
                </Button>,
                <RightOutlined key="arrow" onClick={() => handleStreamSelect(stream.id, stream.name)} />,
              ]}
            >
              <List.Item.Meta
                title={
                  <a onClick={() => handleStreamSelect(stream.id, stream.name)}>
                    <Text strong>{stream.name}</Text>
                  </a>
                }
                description={
                  <Space>
                    {stream.start_date && (
                      <Text type="secondary">
                        Начало: {new Date(stream.start_date).toLocaleDateString('ru-RU')}
                      </Text>
                    )}
                    <Tag color={stream.is_active ? 'success' : 'default'}>
                      {stream.is_active ? 'Активен' : 'Неактивен'}
                    </Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  // Рендер списка тарифов потока
  const renderTariffsList = () => (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>Тарифы потока</Title>
          <Text type="secondary">{navigation.streamName}</Text>
        </div>
      }
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={handleNavigationBack}>
          Назад
        </Button>
      }
    >
      {tariffsLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : (
        <>
          {!streamTariffs || streamTariffs.length === 0 ? (
            <Empty description="У этого потока пока нет тарифов." />
          ) : (
            <List
              dataSource={streamTariffs}
              renderItem={(st: any) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="delete"
                      title="Удалить тариф из потока?"
                      description="Вся конфигурация модулей и техник будет удалена."
                      onConfirm={() => handleRemoveTariffFromStream(st.id)}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        Удалить
                      </Button>
                    </Popconfirm>,
                    <RightOutlined
                      key="arrow"
                      onClick={() => handleTariffSelect(st.tariff_id, st.tariffs?.name || 'Тариф')}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <a onClick={() => handleTariffSelect(st.tariff_id, st.tariffs?.name || 'Тариф')}>
                        <Text strong>{st.tariffs?.name}</Text>
                      </a>
                    }
                    description={`Код: ${st.tariffs?.code}`}
                  />
                </List.Item>
              )}
            />
          )}

          {availableTariffs && availableTariffs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Select
                placeholder="+ Добавить тариф в поток"
                style={{ width: '100%' }}
                onChange={(value) => {
                  if (value) handleAddTariffToStream(value);
                }}
                value={null}
              >
                {availableTariffs.map((tariff) => (
                  <Select.Option key={tariff.id} value={tariff.id}>
                    {tariff.name} ({tariff.code})
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
        </>
      )}
    </Card>
  );

  // Рендер конфигурации тарифа
  const renderConfiguration = () => (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>Конфигурация тарифа</Title>
          <Text type="secondary">{navigation.streamName} / {navigation.tariffName}</Text>
        </div>
      }
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={handleNavigationBack}>
          Назад
        </Button>
      }
    >
      {configLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : (
        <>
          {configuration?.modules && configuration.modules.length > 0 ? (
            <Collapse
              activeKey={expandedModules}
              onChange={(keys) => setExpandedModules(keys as string[])}
              expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            >
              {configuration.modules.map((module) => (
                <Panel
                  key={module.stream_module_id}
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text strong>{module.module_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {module.unlock_offset_days ? `Открывается на ${module.unlock_offset_days} день` : 'Доступен сразу'}
                          {' | '}
                          {module.access_duration_days ? `${module.access_duration_days} дней доступа` : 'Бессрочно'}
                          {module.grid_days && ` | Сетка: ${module.grid_days} дней`}
                        </Text>
                      </div>
                    </div>
                  }
                  extra={
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingModule(module.tariff_stream_module_id);
                          setEditingModuleData({
                            days: module.access_duration_days,
                            gridDays: module.grid_days,
                            unlockDays: module.unlock_offset_days ?? 0
                          });
                          // Открываем модуль если он закрыт
                          if (!expandedModules.includes(module.stream_module_id)) {
                            setExpandedModules([...expandedModules, module.stream_module_id]);
                          }
                        }}
                      />
                      <Popconfirm
                        title="Удалить модуль из тарифа?"
                        onConfirm={() => handleRemoveModule(module.tariff_stream_module_id)}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                >
                  {/* Редактирование модуля */}
                  {editingModule === module.tariff_stream_module_id && (
                    <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong style={{ fontSize: 12 }}>С какого дня потока модуль доступен:</Text>
                          <InputNumber
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="0 = сразу"
                            min={0}
                            value={editingModuleData.unlockDays}
                            onChange={(value) => setEditingModuleData({ ...editingModuleData, unlockDays: value })}
                          />
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 12 }}>Доступ к модулю (дней):</Text>
                          <InputNumber
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="Пусто = бессрочно"
                            value={editingModuleData.days}
                            onChange={(value) => setEditingModuleData({ ...editingModuleData, days: value })}
                          />
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 12 }}>Дней в сетке расписания:</Text>
                          <InputNumber
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="Пусто = как доступ"
                            min={1}
                            value={editingModuleData.gridDays}
                            onChange={(value) => setEditingModuleData({ ...editingModuleData, gridDays: value })}
                          />
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                            Только для отображения сетки, не влияет на доступ
                          </Text>
                        </div>
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={() => handleUpdateModule(
                              module.tariff_stream_module_id,
                              editingModuleData.days,
                              editingModuleData.gridDays,
                              editingModuleData.unlockDays,
                              module.order_num
                            )}
                          >
                            Сохранить
                          </Button>
                          <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => setEditingModule(null)}
                          >
                            Отмена
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  )}

                  {/* Переключатель между материалами и уроками */}
                  <TariffModuleContentManager
                    module={module}
                    allMaterials={allTechniques || []}
                    moduleDurationDays={module.grid_days ?? module.access_duration_days ?? undefined}
                    streamId={navigation.streamId!}
                    courseId={navigation.courseId!}
                    allTariffModuleIds={configuration?.modules.map(m => m.tariff_stream_module_id) || []}
                    allModulesInfo={configuration?.modules.map(m => ({
                      tariff_stream_module_id: m.tariff_stream_module_id,
                      order_num: m.order_num,
                      access_duration_days: m.access_duration_days,
                      unlock_offset_days: m.unlock_offset_days,
                    })) || []}
                    streamStartDate={currentStreamStartDate}
                  />
                </Panel>
              ))}
            </Collapse>
          ) : (
            <Empty description="Нет модулей в тарифе" />
          )}

          {/* Добавить модуль */}
          {availableModules && availableModules.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Select
                placeholder="+ Добавить модуль в тариф"
                style={{ width: '100%' }}
                onSelect={(value) => {
                  if (value) handleAddModule(value);
                }}
                allowClear
              >
                {availableModules.map((module) => (
                  <Select.Option key={module.id} value={module.id}>
                    {module.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
        </>
      )}
    </Card>
  );

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />

      {navigation.view === 'courses' && renderCoursesList()}
      {navigation.view === 'streams' && renderStreamsList()}
      {navigation.view === 'tariffs' && renderTariffsList()}
      {navigation.view === 'configuration' && renderConfiguration()}

      {/* Модальное окно копирования потока */}
      <Modal
        title="Копировать поток"
        open={showCopyModal}
        onOk={handleCopyStream}
        onCancel={() => {
          setShowCopyModal(false);
          copyForm.resetFields();
        }}
        confirmLoading={copyStreamMutation.isPending}
        okText="Копировать"
        cancelText="Отмена"
      >
        <Form form={copyForm} layout="vertical">
          <Form.Item name="streamId" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name="newName"
            label="Название нового потока"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Название..." />
          </Form.Item>

          <Form.Item
            name="newStartDate"
            label="Дата начала нового потока"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Будут скопированы: модули, тарифы, конфигурация техник, события календаря
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default UnifiedCoursesManager;
