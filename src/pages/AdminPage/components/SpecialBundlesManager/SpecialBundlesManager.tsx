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
  InputNumber,
  message,
  Popconfirm,
  Row,
  Col,
  Collapse,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  CaretRightOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  useSpecialBundles,
  useSpecialBundleTechniques,
  useCreateSpecialBundle,
  useUpdateSpecialBundle,
  useDeleteSpecialBundle,
  useAddTechniqueToSpecialBundle,
  useRemoveTechniqueFromSpecialBundle,
  useUpdateSpecialBundleTechnique,
  SpecialBundle,
  SpecialBundleTechniqueWithDetails,
} from '@/lib/supabase/hooks/useSpecialBundles';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface Technique {
  id: string;
  name: string;
  material_type: 'video' | 'audio';
  cover_image: string | null;
}

const SpecialBundlesManager: React.FC = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBundle, setEditingBundle] = useState<SpecialBundle | null>(null);
  const [expandedBundles, setExpandedBundles] = useState<string[]>([]);
  const [draggedTechnique, setDraggedTechnique] = useState<Technique | null>(null);

  // Хуки
  const { data: bundles, isLoading: bundlesLoading } = useSpecialBundles();
  const createBundleMutation = useCreateSpecialBundle();
  const updateBundleMutation = useUpdateSpecialBundle();
  const deleteBundleMutation = useDeleteSpecialBundle();

  // Загрузка специальных техник (с флагом is_special = true)
  const { data: allTechniques, isLoading: techniquesLoading } = useQuery({
    queryKey: ['special-techniques-for-bundles'],
    queryFn: async (): Promise<Technique[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, material_type, cover_image_path')
        .eq('is_special', true)
        .order('name');
      if (error) {
        console.error('Error loading special techniques:', error);
        throw error;
      }
      return (data || []).map(item => ({
        ...item,
        cover_image: item.cover_image_path
      }));
    },
  });

  const handleOpenModal = (bundle?: SpecialBundle) => {
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
        message.success('Специальный пакет обновлен');
      } else {
        await createBundleMutation.mutateAsync({
          name: values.name,
          description: values.description,
          order_num: (bundles?.length || 0) + 1,
        });
        message.success('Специальный пакет создан');
      }
      handleCloseModal();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при сохранении');
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    try {
      await deleteBundleMutation.mutateAsync(bundleId);
      message.success('Специальный пакет удален');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  if (bundlesLoading || techniquesLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          {bundlesLoading && <div>Загрузка специальных пакетов...</div>}
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
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>Специальные пакеты</Title>
            <Text type="secondary">
              Пакеты с цепочкой разблокировок. Каждая техника открывается через N дней после предыдущей и требует отдельной оплаты.
            </Text>
          </div>
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
          <Empty description="Специальных пакетов пока нет" />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Tag color="purple">Спец. пакет</Tag>
                    <Text strong style={{ fontSize: 16 }}>{bundle.name}</Text>
                    {bundle.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>— {bundle.description}</Text>
                    )}
                  </div>
                }
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(bundle)} />
                    <Popconfirm
                      title="Удалить специальный пакет?"
                      description="Все размещения и оплаты будут удалены"
                      onConfirm={() => handleDeleteBundle(bundle.id)}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                <SpecialBundlePanelContent
                  bundle={bundle}
                  allTechniques={allTechniques || []}
                  draggedTechnique={draggedTechnique}
                  onDragStart={setDraggedTechnique}
                  onDragEnd={() => setDraggedTechnique(null)}
                />
              </Panel>
            ))}
          </Collapse>
        )}
      </Space>

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={editingBundle ? 'Редактировать специальный пакет' : 'Создать специальный пакет'}
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
            <Input placeholder="Императрица" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea rows={3} placeholder="Описание цепочки техник..." />
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

interface SpecialBundlePanelContentProps {
  bundle: SpecialBundle;
  allTechniques: Technique[];
  draggedTechnique: Technique | null;
  onDragStart: (technique: Technique) => void;
  onDragEnd: () => void;
}

const SpecialBundlePanelContent: React.FC<SpecialBundlePanelContentProps> = ({
  bundle,
  allTechniques,
  draggedTechnique,
  onDragStart,
  onDragEnd,
}) => {
  const { data: bundleTechniques, isLoading } = useSpecialBundleTechniques(bundle.id);
  const addTechniqueMutation = useAddTechniqueToSpecialBundle();
  const removeTechniqueMutation = useRemoveTechniqueFromSpecialBundle();
  const updateTechniqueMutation = useUpdateSpecialBundleTechnique();

  const [editingDelay, setEditingDelay] = useState<string | null>(null);
  const [delayValue, setDelayValue] = useState<number>(30);

  const availableTechniques = useMemo(() => {
    if (!allTechniques) return [];
    if (!bundleTechniques) return allTechniques;
    const addedIds = new Set(bundleTechniques.map(bt => bt.technique_id));
    return allTechniques.filter(t => !addedIds.has(t.id));
  }, [allTechniques, bundleTechniques]);

  const handleAddTechnique = async (techniqueId: string) => {
    try {
      await addTechniqueMutation.mutateAsync({
        special_bundle_id: bundle.id,
        technique_id: techniqueId,
      });
      message.success('Техника добавлена в цепочку');
      onDragEnd();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при добавлении');
    }
  };

  const handleRemoveTechnique = async (techniqueId: string) => {
    try {
      await removeTechniqueMutation.mutateAsync(techniqueId);
      message.success('Техника удалена из цепочки');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  const handleUpdateDelay = async (techniqueId: string, newDelay: number) => {
    try {
      await updateTechniqueMutation.mutateAsync({
        id: techniqueId,
        delay_days: newDelay,
      });
      message.success('Задержка обновлена');
      setEditingDelay(null);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при обновлении');
    }
  };

  if (isLoading) {
    return <Spin />;
  }

  return (
    <Row gutter={24}>
      {/* Доступные техники */}
      <Col span={8}>
        <Card size="small" title="Доступные техники" style={{ height: '100%' }}>
          {availableTechniques.length === 0 ? (
            <Empty description="Все техники добавлены" />
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
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
            </div>
          )}
        </Card>
      </Col>

      {/* Цепочка техник */}
      <Col span={16}>
        <Card
          size="small"
          title={
            <Space>
              <span>Цепочка разблокировок</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                (перетащите техники сюда)
              </Text>
            </Space>
          }
          style={{
            minHeight: 300,
            border: draggedTechnique ? '2px dashed #722ed1' : undefined,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (draggedTechnique) {
              handleAddTechnique(draggedTechnique.id);
            }
          }}
        >
          {!bundleTechniques || bundleTechniques.length === 0 ? (
            <Empty description="Перетащите техники для создания цепочки" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bundleTechniques.map((bt, index) => (
                <React.Fragment key={bt.id}>
                  {/* Стрелка с задержкой между техниками */}
                  {index > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '4px 0',
                    }}>
                      <ArrowRightOutlined style={{ transform: 'rotate(90deg)', color: '#722ed1' }} />
                      {editingDelay === bt.id ? (
                        <Space size="small">
                          <InputNumber
                            size="small"
                            min={1}
                            max={365}
                            value={delayValue}
                            onChange={(v) => setDelayValue(v || 30)}
                            style={{ width: 70 }}
                          />
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => handleUpdateDelay(bt.id, delayValue)}
                            loading={updateTechniqueMutation.isPending}
                          >
                            OK
                          </Button>
                          <Button size="small" onClick={() => setEditingDelay(null)}>
                            ✕
                          </Button>
                        </Space>
                      ) : (
                        <Tag
                          color="purple"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setDelayValue(bt.delay_days);
                            setEditingDelay(bt.id);
                          }}
                        >
                          <ClockCircleOutlined /> через {bt.delay_days} дн.
                        </Tag>
                      )}
                    </div>
                  )}

                  {/* Карточка техники */}
                  <Card
                    size="small"
                    style={{
                      background: index === 0 ? '#f9f0ff' : undefined,
                      borderColor: '#722ed1',
                    }}
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space>
                        <Tag color={index === 0 ? 'green' : 'default'}>
                          #{bt.technique_position}
                        </Tag>
                        {bt.technique?.material_type === 'audio' ? '🎵' : '🎬'}
                        <Text strong>{bt.technique?.name}</Text>
                        {index === 0 && (
                          <Tag color="green">Первая техника</Tag>
                        )}
                      </Space>
                      <Popconfirm
                        title="Удалить технику из цепочки?"
                        onConfirm={() => handleRemoveTechnique(bt.id)}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </Card>
                </React.Fragment>
              ))}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default SpecialBundlesManager;
