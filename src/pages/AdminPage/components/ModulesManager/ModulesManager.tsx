import React, { useState, useMemo } from 'react';
import { useStreams } from '@/lib/supabase/hooks/useTariffConfiguration';
import { useStreamModules } from '@/lib/supabase/hooks/useStreamModules';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  ColorPicker,
  Select,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
} from 'antd';

// Предустановленные цвета для модулей
const COLOR_PRESETS = [
  { label: 'Голубой градиент', value: 'linear-gradient(135deg, rgba(141, 197, 241, 0.4) -48.61%, #63ABE6 105.56%)' },
  { label: 'Золотой градиент', value: 'linear-gradient(180deg, #F1DA8D 0%, #B5A368 100%)' },
  { label: 'Синий', value: '#89A3DF' },
  { label: 'Светло-голубой', value: '#CCDCF8' },
];
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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

// ========== HOOKS ==========
// Материалы модулей теперь настраиваются в StreamsManager (Поток -> Тариф -> Модуль -> Материалы)
// Здесь управляем только базовой информацией о модулях

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

// ========== COMPONENT ==========
const ModulesManager: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<StreamModule | null>(null);
  const [form] = Form.useForm();

  // Hooks
  const { data: streams, isLoading: streamsLoading } = useStreams();
  const { data: modules, isLoading: modulesLoading } = useStreamModules(selectedStreamId);

  const createModuleMutation = useCreateModule();
  const updateModuleMutation = useUpdateModule();
  const deleteModuleMutation = useDeleteModule();

  // Computed
  const sortedStreams = useMemo(() => {
    if (!streams) return [];
    return [...streams].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [streams]);

  const sortedModules = useMemo(() => {
    if (!modules) return [];
    return [...modules].sort((a, b) => a.order_num - b.order_num);
  }, [modules]);

  const isMutating = createModuleMutation.isPending || updateModuleMutation.isPending || deleteModuleMutation.isPending;

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
      // Поддержка градиентов и обычных цветов
      let color = '#3B82F6';
      if (typeof values.color === 'string') {
        color = values.color;
      } else if (values.color?.toHexString) {
        color = values.color.toHexString();
      }

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
                  width: 150,
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                      />
                      <Popconfirm
                        title="Удалить модуль?"
                        description="Все материалы модуля также будут удалены"
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
          <Form.Item label="Цвет">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name="color" noStyle>
                <Select
                  placeholder="Выберите цвет из списка"
                  options={COLOR_PRESETS}
                  optionRender={(option) => (
                    <Space>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          background: option.value as string,
                          border: '1px solid #d9d9d9',
                        }}
                      />
                      {option.label}
                    </Space>
                  )}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Space>
                <span style={{ color: '#666' }}>или выберите свой:</span>
                <Form.Item name="color" noStyle>
                  <ColorPicker />
                </Form.Item>
              </Space>
            </Space>
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
