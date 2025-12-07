import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Button, message, Spin, Typography, Divider } from 'antd';
import { SaveOutlined, LinkOutlined } from '@ant-design/icons';
import {
  useLibraryButtonsSettings,
  useUpdateLibraryButtonsSettings,
  LibraryButtonsSettings,
} from '@/lib/supabase/hooks/useSystemSettings';

const { Title, Text } = Typography;

const LinksManager: React.FC = () => {
  const { data: settings, isLoading, error } = useLibraryButtonsSettings();
  const { updateSettings, isLoading: isSaving } = useUpdateLibraryButtonsSettings();

  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);

  // Инициализация формы при загрузке данных
  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        library_label: settings.library_button?.label || 'Библиотека',
        library_url: settings.library_button?.url || '',
        library_enabled: settings.library_button?.enabled ?? true,
        bioregulation_label: settings.bioregulation_button?.label || 'Запустить биорегулирование',
        bioregulation_url: settings.bioregulation_button?.url || '',
        bioregulation_enabled: settings.bioregulation_button?.enabled ?? true,
      });
      setHasChanges(false);
    }
  }, [settings, form]);

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const values = form.getFieldsValue();

      const newSettings: LibraryButtonsSettings = {
        library_button: {
          label: values.library_label || 'Библиотека',
          url: values.library_url || '',
          enabled: values.library_enabled ?? true,
        },
        bioregulation_button: {
          label: values.bioregulation_label || 'Запустить биорегулирование',
          url: values.bioregulation_url || '',
          enabled: values.bioregulation_enabled ?? true,
        },
      };

      await updateSettings(newSettings);
      message.success('Настройки сохранены');
      setHasChanges(false);
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      const errorDetails = (err as { code?: string })?.code;

      if (errorDetails === '42P01') {
        message.error('Таблица system_settings не существует. Примените миграцию 20251207200000_create_system_settings.sql');
      } else if (errorDetails === '42501') {
        message.error('Недостаточно прав для сохранения настроек');
      } else {
        message.error(`Ошибка при сохранении: ${errorMessage}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Загрузка настроек...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
        Ошибка загрузки: {error.message}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <LinkOutlined style={{ marginRight: '8px' }} />
            Настройка ссылок
          </Title>
          <Text type="secondary">
            Управление ссылками для кнопок на странице библиотеки техник
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
          disabled={!hasChanges}
        >
          Сохранить
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        {/* Кнопка "Библиотека" */}
        <Card
          title="Кнопка 1: Библиотека"
          style={{ marginBottom: '16px' }}
          extra={
            <Form.Item name="library_enabled" valuePropName="checked" style={{ margin: 0 }}>
              <Switch checkedChildren="Вкл" unCheckedChildren="Выкл" />
            </Form.Item>
          }
        >
          <Form.Item
            name="library_label"
            label="Текст кнопки"
            rules={[{ required: true, message: 'Введите текст кнопки' }]}
          >
            <Input placeholder="Библиотека" />
          </Form.Item>

          <Form.Item
            name="library_url"
            label="Ссылка (URL)"
            help="Оставьте пустым, если кнопка не должна вести никуда"
          >
            <Input placeholder="https://example.com или /path" />
          </Form.Item>
        </Card>

        {/* Кнопка "Запустить биорегулирование" */}
        <Card
          title="Кнопка 2: Биорегулирование"
          extra={
            <Form.Item name="bioregulation_enabled" valuePropName="checked" style={{ margin: 0 }}>
              <Switch checkedChildren="Вкл" unCheckedChildren="Выкл" />
            </Form.Item>
          }
        >
          <Form.Item
            name="bioregulation_label"
            label="Текст кнопки"
            rules={[{ required: true, message: 'Введите текст кнопки' }]}
          >
            <Input placeholder="Запустить биорегулирование" />
          </Form.Item>

          <Form.Item
            name="bioregulation_url"
            label="Ссылка (URL)"
            help="Оставьте пустым, если кнопка не должна вести никуда"
          >
            <Input placeholder="https://example.com или /path" />
          </Form.Item>
        </Card>

        <Divider />

        <Text type="secondary" style={{ display: 'block', marginTop: '16px' }}>
          Эти кнопки отображаются внизу страницы "Библиотека техник".
          Если ссылка начинается с "/", она будет открыта внутри приложения.
          Если ссылка начинается с "http", она откроется в новом окне/вкладке.
        </Text>
      </Form>
    </div>
  );
};

export default LinksManager;
