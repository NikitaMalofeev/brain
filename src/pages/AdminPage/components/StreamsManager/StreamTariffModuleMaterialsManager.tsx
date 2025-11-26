import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  AppstoreOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import StreamModuleMaterialsManager from './StreamModuleMaterialsManager';

const { Title, Text } = Typography;

// ========== INTERFACES ==========
interface Stream {
  id: string;
  name: string;
}

interface Tariff {
  id: string;
  name: string;
  description: string | null;
}

interface StreamModule {
  id: string;
  stream_id: string;
  name: string;
  color: string | null;
  order_num: number;
}

interface StreamTariffModuleMaterialsManagerProps {
  streamId: string;
  onBack: () => void;
}

// ========== HOOKS ==========
function useStream(streamId: string) {
  return useQuery({
    queryKey: ['stream', streamId],
    queryFn: async (): Promise<Stream | null> => {
      if (!supabase || !streamId) return null;
      const { data, error } = await supabase
        .from('streams')
        .select('id, name')
        .eq('id', streamId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!streamId,
  });
}

function useTariffs() {
  return useQuery({
    queryKey: ['tariffs'],
    queryFn: async (): Promise<Tariff[]> => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('tariffs')
        .select('id, name, description')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

function useStreamModules(streamId: string) {
  return useQuery({
    queryKey: ['stream-modules', streamId],
    queryFn: async (): Promise<StreamModule[]> => {
      if (!supabase || !streamId) return [];
      const { data, error } = await supabase
        .from('stream_modules')
        .select('*')
        .eq('stream_id', streamId)
        .order('order_num');
      if (error) throw error;
      return data || [];
    },
    enabled: !!streamId,
  });
}

// ========== COMPONENT ==========
const StreamTariffModuleMaterialsManager: React.FC<StreamTariffModuleMaterialsManagerProps> = ({
  streamId,
  onBack,
}) => {
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [selectedModule, setSelectedModule] = useState<StreamModule | null>(null);

  const { data: stream, isLoading: streamLoading } = useStream(streamId);
  const { data: tariffs, isLoading: tariffsLoading } = useTariffs();
  const { data: modules, isLoading: modulesLoading } = useStreamModules(streamId);

  // If viewing materials for a specific module
  if (selectedModule && selectedTariff) {
    return (
      <StreamModuleMaterialsManager
        streamId={streamId}
        streamName={stream?.name || ''}
        tariffId={selectedTariff.id}
        tariffName={selectedTariff.name}
        moduleId={selectedModule.id}
        moduleName={selectedModule.name}
        onBack={() => setSelectedModule(null)}
      />
    );
  }

  // If viewing modules for a tariff
  if (selectedTariff) {
    return (
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedTariff(null)}>
              Назад к тарифам
            </Button>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Модули потока
              </Title>
              <Space size={4} split="→">
                <Text type="secondary">{stream?.name}</Text>
                <Text type="secondary">{selectedTariff.name}</Text>
              </Space>
            </div>
          </Space>

          {modulesLoading ? (
            <Spin />
          ) : !modules || modules.length === 0 ? (
            <Empty description="Нет модулей в этом потоке">
              <Text type="secondary">
                Модули настраиваются в разделе "Модули"
              </Text>
            </Empty>
          ) : (
            <Row gutter={[16, 16]}>
              {modules.map((module) => (
                <Col key={module.id} xs={24} md={12} lg={8}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      borderLeft: `4px solid ${module.color || '#d9d9d9'}`,
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            background: module.color || '#d9d9d9',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 14 }}>
                            {module.name}
                          </Text>
                          <div>
                            <Tag color="default">Порядок: {module.order_num}</Tag>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="primary"
                        icon={<BookOutlined />}
                        onClick={() => setSelectedModule(module)}
                        block
                      >
                        Настроить материалы
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Space>
      </Card>
    );
  }

  // Main view: select tariff
  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Назад к потокам
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Материалы модулей потока
            </Title>
            <Text type="secondary">{stream?.name}</Text>
          </div>
        </Space>

        <div>
          <Title level={5}>
            <TagsOutlined /> Выберите тариф
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Материалы модулей настраиваются отдельно для каждого тарифа
          </Text>

          {tariffsLoading ? (
            <Spin />
          ) : !tariffs || tariffs.length === 0 ? (
            <Empty description="Нет тарифов">
              <Text type="secondary">
                Тарифы настраиваются в разделе "Тарифы и конфигурация"
              </Text>
            </Empty>
          ) : (
            <Row gutter={[16, 16]}>
              {tariffs.map((tariff) => (
                <Col key={tariff.id} xs={24} md={12} lg={8}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => setSelectedTariff(tariff)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong style={{ fontSize: 16 }}>
                        {tariff.name}
                      </Text>
                      {tariff.description && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {tariff.description}
                        </Text>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Нажмите для настройки →
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default StreamTariffModuleMaterialsManager;
