import React, { useState } from 'react';
import { Card, Button, Space, Empty, Modal, Form, Input, InputNumber, message, Popconfirm, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useModuleLessons,
  useCreateLessonInModule,
  useUpdateModuleLesson,
  useDeleteModuleLesson,
} from '@/lib/supabase/hooks/useModuleLessons';
import { Lesson } from '@/lib/supabase/types';

const { TextArea } = Input;

interface ModuleLessonsManagerProps {
  streamModuleId: string;
  streamId: string;
  courseId: string;
  moduleName: string;
}

const ModuleLessonsManager: React.FC<ModuleLessonsManagerProps> = ({
  streamModuleId,
  streamId,
  moduleName,
}) => {
  const [lessonForm] = Form.useForm();
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Хуки для работы с уроками напрямую (без ступеней)
  const { data: lessons, isLoading } = useModuleLessons(streamModuleId);
  const createLessonMutation = useCreateLessonInModule();
  const updateLessonMutation = useUpdateModuleLesson();
  const deleteLessonMutation = useDeleteModuleLesson();

  // Открыть модальное окно создания/редактирования урока
  const handleOpenLessonModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      lessonForm.setFieldsValue({
        name: lesson.name,
        description: lesson.description,
        order_num: lesson.order_num,
        has_assignment: lesson.has_assignment,
      });
    } else {
      setEditingLesson(null);
      lessonForm.setFieldsValue({
        order_num: (lessons?.length || 0) + 1,
        has_assignment: false,
      });
    }
    setLessonModalVisible(true);
  };

  // Закрыть модальное окно урока
  const handleCloseLessonModal = () => {
    setLessonModalVisible(false);
    setEditingLesson(null);
    lessonForm.resetFields();
  };

  // Сохранить урок
  const handleSaveLesson = async (values: {
    name: string;
    description?: string;
    order_num: number;
    has_assignment: boolean;
  }) => {
    try {
      if (editingLesson) {
        await updateLessonMutation.mutateAsync({
          id: editingLesson.id,
          name: values.name,
          description: values.description,
          order_num: values.order_num,
          has_assignment: values.has_assignment,
          stream_module_id: streamModuleId,
        });
        message.success('Урок обновлен');
      } else {
        await createLessonMutation.mutateAsync({
          stream_module_id: streamModuleId,
          stream_id: streamId,
          name: values.name,
          description: values.description,
          order_num: values.order_num,
          has_assignment: values.has_assignment || false,
        });
        message.success('Урок создан');
      }
      handleCloseLessonModal();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при сохранении урока');
    }
  };

  // Удалить урок
  const handleDeleteLesson = async (lessonId: number) => {
    try {
      await deleteLessonMutation.mutateAsync({ id: lessonId, stream_module_id: streamModuleId });
      message.success('Урок удален');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении урока');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Загрузка уроков...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Уроки модуля: {moduleName}</h3>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenLessonModal()}>
            Создать урок
          </Button>
        </div>

        {/* Список уроков */}
        {!lessons || lessons.length === 0 ? (
          <Empty description="Уроков пока нет" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {lessons
              .sort((a, b) => a.order_num - b.order_num)
              .map(lesson => (
                <Card key={lesson.id} size="small">
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{lesson.name}</strong>
                      {lesson.description && <div style={{ fontSize: 12, color: '#888' }}>{lesson.description}</div>}
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Порядок: {lesson.order_num}
                        {lesson.has_assignment && ' | Есть ДЗ'}
                      </div>
                    </div>
                    <Space>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenLessonModal(lesson)}
                      />
                      <Popconfirm
                        title="Удалить урок?"
                        description="Это также удалит все блоки урока"
                        onConfirm={() => handleDeleteLesson(lesson.id)}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </Space>
                </Card>
              ))}
          </Space>
        )}
      </Space>

      {/* Модальное окно урока */}
      <Modal
        title={editingLesson ? 'Редактировать урок' : 'Создать урок'}
        open={lessonModalVisible}
        onCancel={handleCloseLessonModal}
        footer={null}
      >
        <Form form={lessonForm} layout="vertical" onFinish={handleSaveLesson}>
          <Form.Item name="name" label="Название урока" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="День 1" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <TextArea rows={2} placeholder="Описание урока..." />
          </Form.Item>
          <Form.Item name="order_num" label="Порядковый номер" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="has_assignment" label="Есть домашнее задание" valuePropName="checked">
            <input type="checkbox" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createLessonMutation.isPending || updateLessonMutation.isPending}
              >
                {editingLesson ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={handleCloseLessonModal}>Отмена</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModuleLessonsManager;
