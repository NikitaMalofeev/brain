import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  message,
  Popconfirm,
  Avatar,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import TechniqueEditor from './TechniqueEditor';
import TechniqueBlocksManager from './TechniqueBlocksManager';

const { Title, Text } = Typography;

interface Technique {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image: string | null;
  duration_seconds: number | null;
  status: 'free' | 'purchasable' | 'locked';
  purchase_url: string | null;
  upgrade_tariff_chat_url: string | null;
  available_from_module: string | null;
  unlock_condition_type: string | null;
  unlock_condition_value: any;
  order_num: number;
}

const TechniquesManager: React.FC = () => {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [blocksView, setBlocksView] = useState<{ techniqueId: string; title: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch techniques
  const { data: techniques, isLoading } = useQuery({
    queryKey: ['admin-techniques'],
    queryFn: async (): Promise<Technique[]> => {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await supabase
        .from('techniques')
        .select('*')
        .order('order_num', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Delete mutation
  const deleteTechniqueMutation = useMutation({
    mutationFn: async (techniqueId: string) => {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { error } = await supabase.from('techniques').delete().eq('id', techniqueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-techniques'] });
    },
  });

  const handleDelete = async (techniqueId: string) => {
    try {
      await deleteTechniqueMutation.mutateAsync(techniqueId);
      message.success('Техника удалена');
    } catch (error: any) {
      message.error(error?.message || 'Ошибка при удалении');
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedTechniqueId(null);
  };

  const handleEdit = (techniqueId: string) => {
    setSelectedTechniqueId(techniqueId);
    setIsCreating(false);
  };

  const handleCloseEditor = () => {
    setSelectedTechniqueId(null);
    setIsCreating(false);
  };

  const handleManageBlocks = (techniqueId: string, title: string) => {
    setBlocksView({ techniqueId, title });
  };

  const handleCloseBlocks = () => {
    setBlocksView(null);
  };

  const getStatusTag = (status: Technique['status']) => {
    const config = {
      free: { color: 'success', text: 'Бесплатная' },
      purchasable: { color: 'processing', text: 'К покупке' },
      locked: { color: 'default', text: 'Заблокирована' },
    };
    const { color, text } = config[status];
    return <Tag color={color}>{text}</Tag>;
  };

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Загрузка техник...</Text>
          </div>
        </div>
      </Card>
    );
  }

  // Blocks view
  if (blocksView) {
    return (
      <TechniqueBlocksManager
        techniqueId={blocksView.techniqueId}
        techniqueTitle={blocksView.title}
        onBack={handleCloseBlocks}
      />
    );
  }

  // Editor view
  if (isCreating || selectedTechniqueId) {
    return (
      <TechniqueEditor
        techniqueId={selectedTechniqueId}
        onClose={handleCloseEditor}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-techniques'] });
          handleCloseEditor();
        }}
      />
    );
  }

  // Table columns
  const columns = [
    {
      title: '#',
      dataIndex: 'order_num',
      width: 60,
      render: (num: number) => <Text type="secondary">{num}</Text>,
    },
    {
      title: 'Название',
      dataIndex: 'title',
      render: (title: string, record: Technique) => (
        <Space>
          {record.cover_image && (
            <Avatar shape="square" size={40} src={record.cover_image} />
          )}
          <div>
            <Text strong>{title}</Text>
            {record.available_from_module && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  С модуля: {record.available_from_module}
                </Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 120,
      render: (status: Technique['status']) => getStatusTag(status),
    },
    {
      title: 'Длительность',
      dataIndex: 'duration_seconds',
      width: 120,
      render: (seconds: number | null) =>
        seconds ? `${Math.floor(seconds / 60)} мин` : '—',
    },
    {
      title: 'Условие доступа',
      dataIndex: 'unlock_condition_type',
      width: 150,
      render: (type: string | null, record: Technique) =>
        type === 'after_technique' ? (
          <Space>
            <LockOutlined />
            <Text>Через {record.unlock_condition_value?.duration_days || 0} дней</Text>
          </Space>
        ) : (
          <Space>
            <UnlockOutlined />
            <Text type="secondary">Без условий</Text>
          </Space>
        ),
    },
    {
      title: 'Действия',
      width: 180,
      render: (_: any, record: Technique) => (
        <Space>
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            onClick={() => handleManageBlocks(record.id, record.title)}
          >
            Блоки
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          />
          <Popconfirm
            title="Удалить технику?"
            description={`Вы уверены, что хотите удалить "${record.title}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Управление техниками</Title>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать технику
        </Button>
      }
    >
      {techniques && techniques.length > 0 ? (
        <Table
          dataSource={techniques}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Text type="secondary">Нет созданных техник</Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleCreate}>
              Создать первую технику
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TechniquesManager;
