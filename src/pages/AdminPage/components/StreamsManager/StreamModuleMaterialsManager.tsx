import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DragOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ========== INTERFACES ==========
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
  stream_id: string | null;
  tariff_id: string | null;
  release_day: number;
  active_days: number | null;
  order_num: number;
  material?: Material;
}

interface StreamModuleMaterialsManagerProps {
  streamId: string;
  streamName: string;
  tariffId: string;
  tariffName: string;
  moduleId: string;
  moduleName: string;
  onBack: () => void;
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

function useModuleMaterials(streamId: string, tariffId: string, moduleId: string) {
  return useQuery({
    queryKey: ['module-materials', streamId, tariffId, moduleId],
    queryFn: async (): Promise<ModuleMaterial[]> => {
      if (!supabase || !streamId || !tariffId || !moduleId) return [];
      const { data, error } = await supabase
        .from('module_materials')
        .select(`
          id, module_id, material_id, stream_id, tariff_id, order_num, release_day, active_days,
          material:materials(id, name, description, material_type)
        `)
        .eq('module_id', moduleId)
        .eq('stream_id', streamId)
        .eq('tariff_id', tariffId)
        .order('release_day', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        material: item.material as unknown as Material
      }));
    },
    enabled: !!streamId && !!tariffId && !!moduleId,
  });
}

function useAddModuleMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      module_id: string;
      material_id: string;
      stream_id: string;
      tariff_id: string;
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
          stream_id: params.stream_id,
          tariff_id: params.tariff_id,
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
      queryClient.invalidateQueries({
        queryKey: ['module-materials', variables.stream_id, variables.tariff_id, variables.module_id],
      });
    },
  });
}

function useRemoveModuleMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; stream_id: string; tariff_id: string; module_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.from('module_materials').delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['module-materials', variables.stream_id, variables.tariff_id, variables.module_id],
      });
    },
  });
}

// ========== COMPONENT ==========
const StreamModuleMaterialsManager: React.FC<StreamModuleMaterialsManagerProps> = ({
  streamId,
  streamName,
  tariffId,
  tariffName,
  moduleId,
  moduleName,
  onBack,
}) => {
  const [draggedMaterial, setDraggedMaterial] = useState<Material | null>(null);
  const [activeDaysModal, setActiveDaysModal] = useState<{
    materialId: string;
    materialName: string;
    targetDay: number;
  } | null>(null);
  const [activeDaysValue, setActiveDaysValue] = useState<string>('');
  const [moduleDaysCount, setModuleDaysCount] = useState(14);

  // Hooks
  const { data: allMaterials } = useAllMaterials();
  const { data: moduleMaterials, isLoading: materialsLoading } = useModuleMaterials(
    streamId,
    tariffId,
    moduleId
  );

  const addModuleMaterialMutation = useAddModuleMaterial();
  const removeModuleMaterialMutation = useRemoveModuleMaterial();

  // Computed - все материалы всегда доступны (одна техника может быть в нескольких днях)
  const availableMaterials = useMemo(() => {
    return allMaterials || [];
  }, [allMaterials]);

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

  const isMutating =
    addModuleMaterialMutation.isPending || removeModuleMaterialMutation.isPending;

  // Handlers
  const handleDrop = (day: number) => {
    if (!draggedMaterial) return;
    setActiveDaysModal({
      materialId: draggedMaterial.id,
      materialName: draggedMaterial.name,
      targetDay: day,
    });
    setActiveDaysValue('');
    setDraggedMaterial(null);
  };

  const handleConfirmAddMaterial = async () => {
    if (!activeDaysModal) return;
    try {
      await addModuleMaterialMutation.mutateAsync({
        module_id: moduleId,
        material_id: activeDaysModal.materialId,
        stream_id: streamId,
        tariff_id: tariffId,
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
      await removeModuleMaterialMutation.mutateAsync({
        id: mm.id,
        stream_id: streamId,
        tariff_id: tariffId,
        module_id: mm.module_id,
      });
      message.success('Материал удалён');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Назад
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Материалы модуля
            </Title>
            <Space size={4} split="→">
              <Text type="secondary">{streamName}</Text>
              <Text type="secondary">{tariffName}</Text>
              <Text type="secondary">{moduleName}</Text>
            </Space>
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
                <Empty description="Нет доступных материалов" />
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
                        🎵
                        <Text ellipsis style={{ maxWidth: 120 }}>
                          {material.name}
                        </Text>
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 8,
                }}
              >
                {Array.from({ length: moduleDaysCount }, (_, i) => i + 1).map((day) => (
                  <div
                    key={day}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(day)}
                    style={{
                      minHeight: 100,
                      padding: 8,
                      borderRadius: 6,
                      border: `2px solid ${
                        draggedMaterial
                          ? '#1890ff'
                          : materialsByDay[day]?.length
                          ? '#722ed1'
                          : '#d9d9d9'
                      }`,
                      background: draggedMaterial
                        ? '#e6f7ff'
                        : materialsByDay[day]?.length
                        ? '#f9f0ff'
                        : '#fafafa',
                    }}
                  >
                    <Text strong style={{ fontSize: 12 }}>
                      День {day}
                    </Text>
                    {materialsByDay[day]?.map((mm) => (
                      <Card
                        key={mm.id}
                        size="small"
                        style={{ marginTop: 4 }}
                        bodyStyle={{ padding: 4 }}
                      >
                        <Space size={2}>
                          🎵
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
                          <div>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {mm.active_days} дн.
                            </Text>
                          </div>
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
        <p>
          "{activeDaysModal?.materialName}" на день {activeDaysModal?.targetDay}
        </p>
        <Form layout="vertical">
          <Form.Item
            label="Сколько дней будет активен?"
            help="Оставьте пустым для бессрочного доступа"
          >
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
};

export default StreamModuleMaterialsManager;
