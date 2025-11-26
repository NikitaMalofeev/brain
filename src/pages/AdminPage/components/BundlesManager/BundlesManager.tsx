import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Col,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import {
  useBundles,
  useBundleTechniques,
  useCreateBundle,
  useUpdateBundle,
  useDeleteBundle,
  useAddTechniqueToBundle,
  useRemoveTechniqueFromBundle,
  Bundle,
} from '@/lib/supabase/hooks/useBundles';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface Technique {
  id: string;
  name: string;
  material_type: 'video' | 'audio';
}

const BundlesManager: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [expandedBundles, setExpandedBundles] = useState<string[]>([]);
  const [draggedTechnique, setDraggedTechnique] = useState<Technique | null>(null);

  // Хуки
  const { data: bundles, isLoading: bundlesLoading } = useBundles();
  const createBundleMutation = useCreateBundle();
  const updateBundleMutation = useUpdateBundle();
  const deleteBundleMutation = useDeleteBundle();
  const addTechniqueMutation = useAddTechniqueToBundle();
  const removeTechniqueMutation = useRemoveTechniqueFromBundle();

  // Загрузка всех техник
  const { data: allTechniques, isLoading: techniquesLoading } = useQuery({
    queryKey: ['all-techniques-for-bundles'],
    queryFn: async (): Promise<Technique[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, material_type')
        .order('name');
      if (error) {
        console.error('Error loading techniques:', error);
        throw error;
      }
      console.log('Loaded techniques:', data?.length);
      return data || [];
    },
  });

  const handleOpenModal = (bundle?: Bundle) => {
    if (bundle) {
      setEditingBundle(bundle);
      form.setFieldsValue({
        name: bundle.name,
        description: bundle.description,
      });
    } else {
      setEditingBundle(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingBundle(null);
    form.resetFields();
  };

  const handleSubmit = async (values: { name: string; description?: string }) => {
    try {
      if (editingBundle) {
        await updateBundleMutation.mutateAsync({
          id: editingBundle.id,
          name: values.name,
          description: values.description,
          order_num: editingBundle.order_num,
        });
        message.success('Пакет обновлен');
      } else {
        await createBundleMutation.mutateAsync({
          name: values.name,
          description: values.description,
          order_num: (bundles?.length || 0) + 1,
        });
        message.success('Пакет создан');
      }
      handleCloseModal();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при сохранении');
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    try {
      await deleteBundleMutation.mutateAsync(bundleId);
      message.success('Пакет удален');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  const handleAddTechnique = async (bundleId: string, techniqueId: string, bundleTechniquesCount: number) => {
    try {
      await addTechniqueMutation.mutateAsync({
        bundle_id: bundleId,
        technique_id: techniqueId,
        order_num: bundleTechniquesCount + 1,
      });
      message.success('Техника добавлена');
      setDraggedTechnique(null);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при добавлении');
    }
  };

  const handleRemoveTechnique = async (bundleTechniqueId: string) => {
    try {
      await removeTechniqueMutation.mutateAsync(bundleTechniqueId);
      message.success('Техника удалена');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  if (bundlesLoading || techniquesLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          {bundlesLoading && <div>Загрузка пакетов...</div>}
          {techniquesLoading && <div>Загрузка техник...</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>Управление пакетами</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Создать пакет
          </Button>
        </div>

        {/* Список пакетов */}
        {!bundles || bundles.length === 0 ? (
          <Empty description="Пакетов пока нет" />
        ) : (
          <Collapse
            activeKey={expandedBundles}
            onChange={(keys) => setExpandedBundles(keys as string[])}
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          >
            {bundles.map((bundle) => (
              <Panel
                key={bundle.id}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong style={{ fontSize: 16 }}>{bundle.name}</Text>
                      {bundle.description && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{bundle.description}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                }
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(bundle)} />
                    <Popconfirm
                      title="Удалить пакет?"
                      description="Все назначения пользователям также будут удалены"
                      onConfirm={() => handleDeleteBundle(bundle.id)}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                <BundlePanelContent
                  bundle={bundle}
                  allTechniques={allTechniques || []}
                  draggedTechnique={draggedTechnique}
                  onDragStart={setDraggedTechnique}
                  onDragEnd={() => setDraggedTechnique(null)}
                  onAddTechnique={handleAddTechnique}
                  onRemoveTechnique={handleRemoveTechnique}
                />
              </Panel>
            ))}
          </Collapse>
        )}
      </Space>

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={editingBundle ? 'Редактировать пакет' : 'Создать пакет'}
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название пакета"
            rules={[{ required: true, message: 'Введите название пакета' }]}
          >
            <Input placeholder="Базовый набор техник" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea rows={3} placeholder="Описание пакета..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createBundleMutation.isPending || updateBundleMutation.isPending}>
                {editingBundle ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={handleCloseModal}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

interface BundlePanelContentProps {
  bundle: Bundle;
  allTechniques: Technique[];
  draggedTechnique: Technique | null;
  onDragStart: (technique: Technique) => void;
  onDragEnd: () => void;
  onAddTechnique: (bundleId: string, techniqueId: string, bundleTechniquesCount: number) => void;
  onRemoveTechnique: (bundleTechniqueId: string) => void;
}

const BundlePanelContent: React.FC<BundlePanelContentProps> = ({
  bundle,
  allTechniques,
  draggedTechnique,
  onDragStart,
  onDragEnd,
  onAddTechnique,
  onRemoveTechnique,
}) => {
  const { data: bundleTechniques, isLoading } = useBundleTechniques(bundle.id);

  const availableTechniques = useMemo(() => {
    if (!allTechniques) return [];
    if (!bundleTechniques) return allTechniques; // Если техники пакета ещё не загружены, показываем все
    const addedIds = new Set(bundleTechniques.map(bt => bt.technique_id));
    return allTechniques.filter(t => !addedIds.has(t.id));
  }, [allTechniques, bundleTechniques]);

  // Добавим логирование для отладки
  console.log('BundlePanelContent:', {
    bundleId: bundle.id,
    bundleName: bundle.name,
    allTechniquesCount: allTechniques?.length,
    bundleTechniquesCount: bundleTechniques?.length,
    availableTechniquesCount: availableTechniques.length
  });

  if (isLoading) {
    return <Spin />;
  }

  return (
        <Row gutter={24}>
          {/* Доступные техники */}
          <Col span={8}>
            <Card size="small" title="Доступные техники">
              {availableTechniques.length === 0 ? (
                <Empty description="Все техники добавлены" />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {availableTechniques.map((technique) => (
                    <Card
                      key={technique.id}
                      size="small"
                      draggable
                      onDragStart={() => onDragStart(technique)}
                      onDragEnd={onDragEnd}
                      style={{ cursor: 'grab' }}
                      bodyStyle={{ padding: 8 }}
                    >
                      <Space>
                        <DragOutlined />
                        {technique.material_type === 'audio' ? '🎵' : '🎬'}
                        <Text ellipsis style={{ maxWidth: 150 }}>
                          {technique.name}
                        </Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </Col>

          {/* Техники в пакете */}
          <Col span={16}>
            <Card
              size="small"
              title="Техники в пакете"
              style={{
                minHeight: 200,
                border: draggedTechnique ? '2px dashed #1890ff' : undefined,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedTechnique) {
                  onAddTechnique(bundle.id, draggedTechnique.id, bundleTechniques?.length || 0);
                }
              }}
            >
              {!bundleTechniques || bundleTechniques.length === 0 ? (
                <Empty description="Перетащите техники сюда" />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {bundleTechniques.map((bt) => (
                    <Card
                      key={bt.id}
                      size="small"
                      bodyStyle={{ padding: 8 }}
                    >
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          {bt.technique?.material_type === 'audio' ? '🎵' : '🎬'}
                          <Text>{bt.technique?.name}</Text>
                        </Space>
                        <Popconfirm
                          title="Удалить технику?"
                          onConfirm={() => onRemoveTechnique(bt.id)}
                          okText="Да"
                          cancelText="Нет"
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </Col>
        </Row>
  );
};

export default BundlesManager;
