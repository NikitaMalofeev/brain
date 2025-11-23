import React, { useState, useMemo } from 'react';
import { useTariffsAdmin, type Tariff, type TariffFormData } from '@/lib/supabase/hooks/useTariffsAdmin';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Tag,
  message,
  Popconfirm,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SimpleTariffsManager: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentTariff, setCurrentTariff] = useState<Tariff | null>(null);
  const [form] = Form.useForm();

  const {
    tariffs,
    loading,
    error,
    createTariff,
    createTariffLoading,
    updateTariff,
    updateTariffLoading,
    deleteTariff,
    isMutating,
  } = useTariffsAdmin();

  const sortedTariffs = useMemo(() => {
    if (!tariffs || tariffs.length === 0) return [];
    return [...tariffs].sort((a, b) => a.code.localeCompare(b.code));
  }, [tariffs]);

  const openCreateModal = () => {
    form.setFieldsValue({ name: '', code: '', description: '' });
    setModalMode('add');
    setCurrentTariff(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tariff: Tariff) => {
    form.setFieldsValue({
      name: tariff.name,
      code: tariff.code,
      description: tariff.description || '',
    });
    setModalMode('edit');
    setCurrentTariff(tariff);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTariff(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (modalMode === 'add') {
        await createTariff(values);
        message.success('Тариф создан');
      } else if (currentTariff) {
        await updateTariff(currentTariff.id, values);
        message.success('Тариф обновлён');
      }
      closeModal();
    } catch (err: any) {
      if (err?.errorFields) return; // Form validation error
      message.error(err?.message || 'Ошибка при сохранении');
    }
  };

  const handleDelete = async (tariff: Tariff) => {
    try {
      await deleteTariff(tariff.id);
      message.success('Тариф удалён');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Код',
      dataIndex: 'code',
      width: 100,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      render: (desc: string | null) => (
        <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
          {desc || '—'}
        </Text>
      ),
    },
    {
      title: 'Действия',
      width: 150,
      render: (_: any, record: Tariff) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Изменить
          </Button>
          <Popconfirm
            title="Удалить тариф?"
            description="Это удалит все связи с потоками"
            onConfirm={() => handleDelete(record)}
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
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>Тарифы</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Управление базовыми тарифами. Настройка контента в разделе "Курсы".
          </Text>
        </div>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} disabled={isMutating}>
          Создать тариф
        </Button>
      }
    >
      {error && (
        <Alert
          message={error.message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : sortedTariffs.length === 0 ? (
        <Empty description="Нет тарифов" />
      ) : (
        <Table
          dataSource={sortedTariffs}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      )}

      <Modal
        title={modalMode === 'add' ? 'Создать тариф' : 'Редактировать тариф'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={closeModal}
        confirmLoading={createTariffLoading || updateTariffLoading}
        okText={modalMode === 'add' ? 'Создать' : 'Сохранить'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название тарифа"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Название тарифа..." />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код тарифа"
            rules={[{ required: true, message: 'Введите код' }]}
            help="Краткий код для идентификации (например: T1, T2, T3)"
          >
            <Input
              placeholder="T1, T2, T3..."
              maxLength={10}
              onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())}
            />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <TextArea placeholder="Описание тарифа..." rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SimpleTariffsManager;
