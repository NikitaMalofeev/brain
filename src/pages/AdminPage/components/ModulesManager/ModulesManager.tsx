import React, { useState, useMemo } from 'react';
import { useStreams } from '@/lib/supabase/hooks/useTariffConfiguration';
import { useStreamModules } from '@/lib/supabase/hooks/useStreamModules';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  ColorPicker,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  DragOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ========== INTERFACES ==========
interface StreamModule {
  id: string;
  stream_id: string;
  name: string;
  color: string | null;
  order_num: number;
}

interface Material {
  id: string;
  name: string;
  description: string | null;
  material_type: 'video' | 'audio';
}

interface ModuleMaterial {
  id: string;
  module_id: string;
  material_id: string;
  order_num: number;
  release_day: number | null;
  active_days: number | null;
  material?: Material;
}

// ========== HOOKS ==========
function useAllMaterials() {
  return useQuery({
    queryKey: ['all-materials'],
    queryFn: async (): Promise<Material[]> => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, description, material_type')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

function useModuleMaterials(moduleId: string | null) {
  return useQuery({
    queryKey: ['module-materials', moduleId],
    queryFn: async (): Promise<ModuleMaterial[]> => {
      if (!supabase || !moduleId) return [];
      const { data, error } = await supabase
        .from('module_materials')
        .select(`
          id, module_id, material_id, order_num, release_day, active_days,
          material:materials(id, name, description, material_type)
        `)
        .eq('module_id', moduleId)
        .order('release_day', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        material: item.material as unknown as Material
      }));
    },
    enabled: !!moduleId,
  });
}

function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { stream_id: string; name: string; color: string | null; order_num: number }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('stream_modules')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name: string; color: string | null; order_num: number }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('stream_modules')
        .update({ name: params.name, color: params.color, order_num: params.order_num })
        .eq('id', params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.from('stream_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

function useAddModuleMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { module_id: string; material_id: string; order_num: number; release_day: number; active_days?: number | null }) => {
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
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

function useRemoveModuleMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; module_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.from('module_materials').delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

// ========== COMPONENT ==========
const ModulesManager: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<StreamModule | null>(null);
  const [form] = Form.useForm();

  // Materials view state
  const [materialsView, setMaterialsView] = useState<{ moduleId: string; moduleName: string } | null>(null);
  const [draggedMaterial, setDraggedMaterial] = useState<Material | null>(null);
  const [activeDaysModal, setActiveDaysModal] = useState<{ materialId: string; materialName: string; targetDay: number } | null>(null);
  const [activeDaysValue, setActiveDaysValue] = useState<string>('');
  const [moduleDaysCount, setModuleDaysCount] = useState(14);

  // Hooks
  const { data: streams, isLoading: streamsLoading } = useStreams();
  const { data: modules, isLoading: modulesLoading } = useStreamModules(selectedStreamId);
  const { data: allMaterials } = useAllMaterials();
  const { data: moduleMaterials, isLoading: materialsLoading } = useModuleMaterials(materialsView?.moduleId || null);

  const createModuleMutation = useCreateModule();
  const updateModuleMutation = useUpdateModule();
  const deleteModuleMutation = useDeleteModule();
  const addModuleMaterialMutation = useAddModuleMaterial();
  const removeModuleMaterialMutation = useRemoveModuleMaterial();

  // Computed
  const sortedStreams = useMemo(() => {
    if (!streams) return [];
    return [...streams].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [streams]);

  const sortedModules = useMemo(() => {
    if (!modules) return [];
    return [...modules].sort((a, b) => a.order_num - b.order_num);
  }, [modules]);

  const availableMaterials = useMemo(() => {
    if (!allMaterials || !moduleMaterials) return allMaterials || [];
    const addedIds = new Set(moduleMaterials.map(mm => mm.material_id));
    return allMaterials.filter(m => !addedIds.has(m.id));
  }, [allMaterials, moduleMaterials]);

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

  const isMutating = createModuleMutation.isPending || updateModuleMutation.isPending ||
    deleteModuleMutation.isPending || addModuleMaterialMutation.isPending || removeModuleMaterialMutation.isPending;

  // Handlers
  const openCreateModal = () => {
    setEditingModule(null);
    form.setFieldsValue({
      name: '',
      color: '#3B82F6',
      order_num: (sortedModules?.length || 0) + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (module: StreamModule) => {
    setEditingModule(module);
    form.setFieldsValue({
      name: module.name,
      color: module.color || '#3B82F6',
      order_num: module.order_num,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#3B82F6';

      if (editingModule) {
        await updateModuleMutation.mutateAsync({
          id: editingModule.id,
          name: values.name,
          color,
          order_num: values.order_num,
        });
        message.success('Модуль обновлён');
      } else {
        await createModuleMutation.mutateAsync({
          stream_id: selectedStreamId!,
          name: values.name,
          color,
          order_num: values.order_num,
        });
        message.success('Модуль создан');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при сохранении');
    }
  };

  const handleDelete = async (module: StreamModule) => {
    try {
      await deleteModuleMutation.mutateAsync(module.id);
      message.success('Модуль удалён');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  // Material handlers
  const handleDrop = (day: number) => {
    if (!draggedMaterial || !materialsView) return;
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
      message.success('Материал добавлен');
      setActiveDaysModal(null);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при добавлении');
    }
  };

  const handleRemoveMaterial = async (mm: ModuleMaterial) => {
    try {
      await removeModuleMaterialMutation.mutateAsync({ id: mm.id, module_id: mm.module_id });
      message.success('Материал удалён');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  // Materials view
  if (materialsView) {
    return (
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setMaterialsView(null)}>
              Назад
            </Button>
            <div>
              <Title level={4} style={{ margin: 0 }}>Материалы модуля</Title>
              <Text type="secondary">{materialsView.moduleName}</Text>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Space>
                <Text>Дней в сетке:</Text>
                <InputNumber
                  value={moduleDaysCount}
                  onChange={(v) => setModuleDaysCount(Math.max(7, v || 14))}
                  min={7}
                  max={60}
                  style={{ width: 80 }}
                />
              </Space>
            </div>
          </Space>

          <Row gutter={24}>
            {/* Available materials */}
            <Col span={6}>
              <Card size="small" title="Доступные материалы">
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Перетащите на нужный день
                </Text>
                {materialsLoading ? (
                  <Spin />
                ) : availableMaterials.length === 0 ? (
                  <Empty description="Все материалы добавлены" />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {availableMaterials.map((material) => (
                      <Card
                        key={material.id}
                        size="small"
                        draggable
                        onDragStart={() => setDraggedMaterial(material)}
                        onDragEnd={() => setDraggedMaterial(null)}
                        style={{ cursor: 'grab' }}
                        bodyStyle={{ padding: 8 }}
                      >
                        <Space>
                          <DragOutlined />
                          {material.material_type === 'audio' ? '🎵' : '🎬'}
                          <Text ellipsis style={{ maxWidth: 120 }}>{material.name}</Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>

            {/* Days grid */}
            <Col span={18}>
              <Card size="small" title="Сетка дней модуля">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 8
                }}>
                  {Array.from({ length: moduleDaysCount }, (_, i) => i + 1).map((day) => (
                    <div
                      key={day}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(day)}
                      style={{
                        minHeight: 100,
                        padding: 8,
                        borderRadius: 6,
                        border: `2px solid ${draggedMaterial ? '#1890ff' : materialsByDay[day]?.length ? '#722ed1' : '#d9d9d9'}`,
                        background: draggedMaterial ? '#e6f7ff' : materialsByDay[day]?.length ? '#f9f0ff' : '#fafafa',
                      }}
                    >
                      <Text strong style={{ fontSize: 12 }}>День {day}</Text>
                      {materialsByDay[day]?.map((mm) => (
                        <Card
                          key={mm.id}
                          size="small"
                          style={{ marginTop: 4 }}
                          bodyStyle={{ padding: 4 }}
                        >
                          <Space size={2}>
                            {mm.material?.material_type === 'audio' ? '🎵' : '🎬'}
                            <Text ellipsis style={{ fontSize: 11, maxWidth: 60 }}>
                              {mm.material?.name}
                            </Text>
                            <Popconfirm
                              title="Удалить материал?"
                              onConfirm={() => handleRemoveMaterial(mm)}
                              okText="Да"
                              cancelText="Нет"
                            >
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                          {mm.active_days && (
                            <div><Text type="secondary" style={{ fontSize: 10 }}>{mm.active_days} дн.</Text></div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </Space>

        {/* Active days modal */}
        <Modal
          title="Добавить материал"
          open={!!activeDaysModal}
          onOk={handleConfirmAddMaterial}
          onCancel={() => setActiveDaysModal(null)}
          confirmLoading={isMutating}
          okText="Добавить"
          cancelText="Отмена"
        >
          <p>"{activeDaysModal?.materialName}" на день {activeDaysModal?.targetDay}</p>
          <Form layout="vertical">
            <Form.Item label="Сколько дней будет активен?" help="Оставьте пустым для бессрочного доступа">
              <InputNumber
                value={activeDaysValue ? parseInt(activeDaysValue) : undefined}
                onChange={(v) => setActiveDaysValue(v ? String(v) : '')}
                placeholder="Бессрочно"
                min={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  }

  // Main view
  return (
    <Row gutter={24}>
      {/* Streams list */}
      <Col span={8}>
        <Card title="Потоки" loading={streamsLoading}>
          {!streams || streams.length === 0 ? (
            <Empty description="Нет потоков" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {sortedStreams.map((stream) => (
                <Card
                  key={stream.id}
                  size="small"
                  hoverable
                  onClick={() => setSelectedStreamId(stream.id)}
                  style={{
                    borderColor: selectedStreamId === stream.id ? '#1890ff' : undefined,
                    background: selectedStreamId === stream.id ? '#e6f7ff' : undefined,
                  }}
                >
                  <Text strong>{stream.name}</Text>
                  {stream.start_date && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Начало: {new Date(stream.start_date).toLocaleDateString('ru-RU')}
                      </Text>
                    </div>
                  )}
                </Card>
              ))}
            </Space>
          )}
        </Card>
      </Col>

      {/* Modules list */}
      <Col span={16}>
        <Card
          title={
            <Space>
              <span>Модули потока</span>
              {selectedStreamId && streams && (
                <Text type="secondary">
                  {streams.find(s => s.id === selectedStreamId)?.name}
                </Text>
              )}
            </Space>
          }
          extra={
            selectedStreamId && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                Создать модуль
              </Button>
            )
          }
        >
          {!selectedStreamId ? (
            <Empty description="Выберите поток" />
          ) : modulesLoading ? (
            <Spin />
          ) : !sortedModules || sortedModules.length === 0 ? (
            <Empty description="Нет модулей" />
          ) : (
            <Table
              dataSource={sortedModules}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Цвет',
                  dataIndex: 'color',
                  width: 60,
                  render: (color) => (
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: color || '#ccc' }} />
                  ),
                },
                {
                  title: 'Название',
                  dataIndex: 'name',
                  render: (name) => <Text strong>{name}</Text>,
                },
                {
                  title: 'Порядок',
                  dataIndex: 'order_num',
                  width: 80,
                  render: (num) => <Tag>{num}</Tag>,
                },
                {
                  title: 'Действия',
                  width: 200,
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        icon={<BookOutlined />}
                        onClick={() => setMaterialsView({ moduleId: record.id, moduleName: record.name })}
                      >
                        Материалы
                      </Button>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                      />
                      <Popconfirm
                        title="Удалить модуль?"
                        description="Все техники модуля также будут удалены"
                        onConfirm={() => handleDelete(record)}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </Col>

      {/* Create/Edit modal */}
      <Modal
        title={editingModule ? 'Редактировать модуль' : 'Создать модуль'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isMutating}
        okText={editingModule ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название модуля"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Название модуля..." />
          </Form.Item>
          <Form.Item name="color" label="Цвет">
            <ColorPicker />
          </Form.Item>
          <Form.Item name="order_num" label="Порядковый номер">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  );
};

export default ModulesManager;
