import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  Card,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Spin,
  Empty,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import StreamEditorNew from './StreamEditorNew';
import StreamTariffModuleMaterialsManager from './StreamTariffModuleMaterialsManager';

const { Title, Text, Paragraph } = Typography;

interface Stream {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

const StreamsManager: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [materialsStreamId, setMaterialsStreamId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: streams, isLoading } = useQuery({
    queryKey: ['admin-streams'],
    queryFn: async (): Promise<Stream[]> => {
      if (!supabase) throw new Error('Supabase client not initialized');

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        logger.error('Error fetching streams', { error });
        throw error;
      }

      return data || [];
    },
  });

  const deleteStreamMutation = useMutation({
    mutationFn: async (streamId: string) => {
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error } = await supabase.from('streams').delete().eq('id', streamId);

      if (error) {
        logger.error('Error deleting stream', { streamId, error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
    },
  });

  const handleDelete = async (streamId: string) => {
    try {
      await deleteStreamMutation.mutateAsync(streamId);
      message.success('Поток удалён');
    } catch (error) {
      message.error('Ошибка при удалении потока');
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedStreamId(null);
  };

  const handleEdit = (streamId: string) => {
    setSelectedStreamId(streamId);
    setIsCreating(false);
  };

  const handleCloseEditor = () => {
    setSelectedStreamId(null);
    setIsCreating(false);
  };

  const handleManageMaterials = (streamId: string) => {
    setMaterialsStreamId(streamId);
  };

  const handleCloseMaterials = () => {
    setMaterialsStreamId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Загрузка потоков...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (isCreating || selectedStreamId) {
    return (
      <StreamEditorNew
        streamId={selectedStreamId}
        onClose={handleCloseEditor}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
          handleCloseEditor();
        }}
      />
    );
  }

  if (materialsStreamId) {
    return (
      <StreamTariffModuleMaterialsManager
        streamId={materialsStreamId}
        onBack={handleCloseMaterials}
      />
    );
  }

  return (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>Управление потоками</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Потоки — это группы учеников с общим графиком обучения
          </Text>
        </div>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать поток
        </Button>
      }
    >
      {streams && streams.length > 0 ? (
        <Row gutter={[16, 16]}>
          {streams.map((stream) => (
            <Col key={stream.id} xs={24} md={12} lg={8}>
              <Card
                size="small"
                hoverable
                actions={[
                  <Button
                    key="edit"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(stream.id)}
                  >
                    Редактировать
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="Удалить поток?"
                    description={
                      <span>
                        Вы уверены, что хотите удалить поток <strong>"{stream.name}"</strong>?
                        <br />
                        <Text type="danger">ВСЕ модули и события также будут удалены!</Text>
                      </span>
                    }
                    onConfirm={() => handleDelete(stream.id)}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <div style={{ minHeight: 100 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <Text strong style={{ fontSize: 16 }}>{stream.name}</Text>
                      {stream.description && (
                        <Paragraph
                          type="secondary"
                          style={{ marginTop: 4, marginBottom: 0, fontSize: 13 }}
                          ellipsis={{ rows: 2 }}
                        >
                          {stream.description}
                        </Paragraph>
                      )}
                    </div>
                    <TeamOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
                  </div>

                  <Space direction="vertical" size={4}>
                    <div>
                      <CalendarOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                      <Text type="secondary">Начало: </Text>
                      <Text>{formatDate(stream.start_date)}</Text>
                    </div>
                    {stream.end_date && (
                      <div>
                        <CalendarOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                        <Text type="secondary">Конец: </Text>
                        <Text>{formatDate(stream.end_date)}</Text>
                      </div>
                    )}
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          image={<TeamOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="Нет созданных потоков"
        >
          <Button type="primary" onClick={handleCreate}>
            Создать первый поток
          </Button>
        </Empty>
      )}
    </Card>
  );
};

export default StreamsManager;
