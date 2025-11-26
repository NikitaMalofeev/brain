import React, { useState } from 'react';
import { Card, Button, Collapse, Space, Empty, Modal, Form, Input, InputNumber, message, Popconfirm, Spin, DatePicker, Checkbox, Select, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CaretRightOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useModuleStages,
  useCreateStageInModule,
  useUpdateStage,
  useDeleteStage,
  useCreateLessonInStage,
  useUpdateLesson,
  useDeleteLesson,
  useUnassignedStages,
  useAssignStageToModule,
  useUnassignStageFromModule,
  StageWithLessons,
} from '@/lib/supabase/hooks/useModuleStages';
import { Lesson } from '@/lib/supabase/types';

const { Panel } = Collapse;
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
  courseId,
  moduleName,
}) => {
  const [stageForm] = Form.useForm();
  const [lessonForm] = Form.useForm();
  const [stageModalVisible, setStageModalVisible] = useState(false);
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [assignStageModalVisible, setAssignStageModalVisible] = useState(false);
  const [selectedStageToAssign, setSelectedStageToAssign] = useState<number | null>(null);
  const [editingStage, setEditingStage] = useState<StageWithLessons | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson; stageId: number } | null>(null);
  const [currentStageForLesson, setCurrentStageForLesson] = useState<number | null>(null);

  // Хуки
  const { data: stages, isLoading } = useModuleStages(streamModuleId);
  const { data: unassignedStages, isLoading: unassignedLoading } = useUnassignedStages(courseId);
  const createStageMutation = useCreateStageInModule();
  const assignStageMutation = useAssignStageToModule();
  const unassignStageMutation = useUnassignStageFromModule();

  // Debug: выводим информацию в консоль
  console.log('[TariffModuleLessonsManager] streamModuleId:', streamModuleId);
  console.log('[TariffModuleLessonsManager] courseId:', courseId);
  console.log('[TariffModuleLessonsManager] stages:', stages);
  console.log('[TariffModuleLessonsManager] unassignedStages:', unassignedStages);
  console.log('[TariffModuleLessonsManager] isLoading:', isLoading);
  const updateStageMutation = useUpdateStage();
  const deleteStageMutation = useDeleteStage();
  const createLessonMutation = useCreateLessonInStage();
  const updateLessonMutation = useUpdateLesson();
  const deleteLessonMutation = useDeleteLesson();

  // Открыть модальное окно создания/редактирования ступени
  const handleOpenStageModal = (stage?: StageWithLessons) => {
    if (stage) {
      setEditingStage(stage);
      stageForm.setFieldsValue({
        name: stage.name,
        description: stage.description,
        order_num: stage.order_num,
      });
    } else {
      setEditingStage(null);
      stageForm.setFieldsValue({
        order_num: (stages?.length || 0) + 1,
      });
    }
    setStageModalVisible(true);
  };

  // Закрыть модальное окно ступени
  const handleCloseStageModal = () => {
    setStageModalVisible(false);
    setEditingStage(null);
    stageForm.resetFields();
  };

  // Сохранить ступень
  const handleSaveStage = async (values: { name: string; description?: string; order_num: number }) => {
    try {
      if (editingStage) {
        await updateStageMutation.mutateAsync({
          id: editingStage.id,
          name: values.name,
          description: values.description,
          order_num: values.order_num,
          stream_module_id: streamModuleId,
        });
        message.success('Ступень обновлена');
      } else {
        await createStageMutation.mutateAsync({
          stream_module_id: streamModuleId,
          course_id: courseId,
          name: values.name,
          description: values.description,
          order_num: values.order_num,
        });
        message.success('Ступень создана');
      }
      handleCloseStageModal();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при сохранении ступени');
    }
  };

  // Удалить ступень
  const handleDeleteStage = async (stageId: number) => {
    try {
      await deleteStageMutation.mutateAsync({ id: stageId, stream_module_id: streamModuleId });
      message.success('Ступень удалена');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении ступени');
    }
  };

  // Привязать существующую ступень к модулю
  const handleAssignStage = async () => {
    if (!selectedStageToAssign) {
      message.warning('Выберите ступень для привязки');
      return;
    }
    try {
      await assignStageMutation.mutateAsync({
        stage_id: selectedStageToAssign,
        stream_module_id: streamModuleId,
        course_id: courseId,
      });
      message.success('Ступень привязана к модулю');
      setAssignStageModalVisible(false);
      setSelectedStageToAssign(null);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при привязке ступени');
    }
  };

  // Отвязать ступень от модуля
  const handleUnassignStage = async (stageId: number) => {
    try {
      await unassignStageMutation.mutateAsync({
        stage_id: stageId,
        stream_module_id: streamModuleId,
        course_id: courseId,
      });
      message.success('Ступень отвязана от модуля');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при отвязке ступени');
    }
  };

  // Открыть модальное окно создания/редактирования урока
  const handleOpenLessonModal = (stageId: number, lesson?: Lesson) => {
    setCurrentStageForLesson(stageId);
    if (lesson) {
      setEditingLesson({ lesson, stageId });
      lessonForm.setFieldsValue({
        name: lesson.name,
        description: lesson.description,
        order_num: lesson.order_num,
        has_assignment: lesson.has_assignment,
        open_at: lesson.open_at ? dayjs(lesson.open_at) : null,
        deadline_at: lesson.deadline_at ? dayjs(lesson.deadline_at) : null,
        estimated_duration_minutes: lesson.estimated_duration_minutes,
      });
    } else {
      setEditingLesson(null);
      const stage = stages?.find(s => s.id === stageId);
      lessonForm.setFieldsValue({
        order_num: (stage?.lessons?.length || 0) + 1,
        has_assignment: false,
        open_at: null,
        deadline_at: null,
        estimated_duration_minutes: null,
      });
    }
    setLessonModalVisible(true);
  };

  // Закрыть модальное окно урока
  const handleCloseLessonModal = () => {
    setLessonModalVisible(false);
    setEditingLesson(null);
    setCurrentStageForLesson(null);
    lessonForm.resetFields();
  };

  // Сохранить урок
  const handleSaveLesson = async (values: any) => {
    if (!currentStageForLesson) return;

    const lessonData = {
      name: values.name,
      description: values.description,
      order_num: values.order_num,
      has_assignment: values.has_assignment,
      open_at: values.open_at ? dayjs(values.open_at).toISOString() : undefined,
      deadline_at: values.deadline_at ? dayjs(values.deadline_at).toISOString() : undefined,
      estimated_duration_minutes: values.estimated_duration_minutes || undefined,
    };

    try {
      if (editingLesson) {
        await updateLessonMutation.mutateAsync({
          id: editingLesson.lesson.id,
          ...lessonData,
          stream_module_id: streamModuleId,
        });
        message.success('Урок обновлен');
      } else {
        await createLessonMutation.mutateAsync({
          stage_id: currentStageForLesson,
          stream_id: streamId,
          stream_module_id: streamModuleId,
          ...lessonData,
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
        <div style={{ marginTop: 16 }}>Загрузка ступеней и уроков...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Ступени и уроки модуля: {moduleName}</h3>
          <Space>
            {unassignedStages && unassignedStages.length > 0 && (
              <Button
                icon={<LinkOutlined />}
                onClick={() => setAssignStageModalVisible(true)}
              >
                Привязать существующую ({unassignedStages.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenStageModal()}>
              Создать ступень
            </Button>
          </Space>
        </div>

        {/* Информация о непривязанных ступенях */}
        {unassignedStages && unassignedStages.length > 0 && (
          <Alert
            type="info"
            showIcon
            message={`Есть ${unassignedStages.length} непривязанных ступеней в курсе`}
            description={
              <span>
                Ступени: {unassignedStages.map(s => `"${s.name}" (${s.lessons?.length || 0} уроков)`).join(', ')}.
                Нажмите "Привязать существующую" чтобы добавить их в этот модуль.
              </span>
            }
          />
        )}

        {/* Список ступеней */}
        {!stages || stages.length === 0 ? (
          <Empty description="Ступеней пока нет. Создайте новую ступень или привяжите существующую из курса." />
        ) : (
          <Collapse expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}>
            {stages.map(stage => (
              <Panel
                key={stage.id}
                header={
                  <div>
                    <strong>{stage.name}</strong>
                    {stage.description && <div style={{ fontSize: 12, color: '#888' }}>{stage.description}</div>}
                    <div style={{ fontSize: 12, color: '#888' }}>
                      Уроков: {stage.lessons?.length || 0} | Порядок: {stage.order_num}
                    </div>
                  </div>
                }
                extra={
                  <Space onClick={e => e.stopPropagation()}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenStageModal(stage)} />
                    <Popconfirm
                      title="Отвязать ступень от модуля?"
                      description="Ступень останется в курсе, но не будет привязана к этому модулю"
                      onConfirm={() => handleUnassignStage(stage.id)}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button size="small" icon={<DisconnectOutlined />} title="Отвязать от модуля" />
                    </Popconfirm>
                    <Popconfirm
                      title="Удалить ступень?"
                      description="Это также удалит все уроки ступени"
                      onConfirm={() => handleDeleteStage(stage.id)}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                {/* Список уроков ступени */}
                <div style={{ marginBottom: 16 }}>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => handleOpenLessonModal(stage.id)}>
                    Добавить урок
                  </Button>
                </div>

                {!stage.lessons || stage.lessons.length === 0 ? (
                  <Empty description="Уроков пока нет" />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {stage.lessons
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
                                onClick={() => handleOpenLessonModal(stage.id, lesson)}
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
              </Panel>
            ))}
          </Collapse>
        )}
      </Space>

      {/* Модальное окно ступени */}
      <Modal
        title={editingStage ? 'Редактировать ступень' : 'Создать ступень'}
        open={stageModalVisible}
        onCancel={handleCloseStageModal}
        footer={null}
      >
        <Form form={stageForm} layout="vertical" onFinish={handleSaveStage}>
          <Form.Item name="name" label="Название ступени" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Неделя 1" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <TextArea rows={2} placeholder="Описание ступени..." />
          </Form.Item>
          <Form.Item name="order_num" label="Порядковый номер" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createStageMutation.isPending || updateStageMutation.isPending}
              >
                {editingStage ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={handleCloseStageModal}>Отмена</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно урока */}
      <Modal
        title={editingLesson ? 'Редактировать урок' : 'Создать урок'}
        open={lessonModalVisible}
        onCancel={handleCloseLessonModal}
        footer={null}
        width={600}
      >
        <Form form={lessonForm} layout="vertical" onFinish={handleSaveLesson}>
          <Form.Item name="name" label="Название урока" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="День 1" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <TextArea rows={3} placeholder="Описание урока..." />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="order_num" label="Порядковый номер" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="estimated_duration_minutes" label="Длительность (мин)">
              <InputNumber min={1} style={{ width: 120 }} placeholder="30" />
            </Form.Item>
          </Space>
          <Form.Item name="has_assignment" label="Есть домашнее задание" valuePropName="checked">
            <Checkbox>Есть ДЗ</Checkbox>
          </Form.Item>
          <Form.Item name="open_at" label="Время открытия урока">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Выберите дату и время"
            />
          </Form.Item>
          <Form.Item name="deadline_at" label="Дедлайн сдачи задания">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Выберите дату и время"
            />
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

      {/* Модальное окно привязки существующей ступени */}
      <Modal
        title="Привязать существующую ступень к модулю"
        open={assignStageModalVisible}
        onCancel={() => {
          setAssignStageModalVisible(false);
          setSelectedStageToAssign(null);
        }}
        onOk={handleAssignStage}
        okText="Привязать"
        cancelText="Отмена"
        confirmLoading={assignStageMutation.isPending}
      >
        <div style={{ marginBottom: 16 }}>
          <p>Выберите ступень из курса, которую нужно привязать к модулю "{moduleName}":</p>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите ступень..."
          value={selectedStageToAssign}
          onChange={setSelectedStageToAssign}
          loading={unassignedLoading}
          options={unassignedStages?.map(stage => ({
            value: stage.id,
            label: `${stage.name} (${stage.lessons?.length || 0} уроков, порядок: ${stage.order_num})`,
          }))}
        />
        {selectedStageToAssign && unassignedStages && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <strong>Уроки в выбранной ступени:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {unassignedStages
                .find(s => s.id === selectedStageToAssign)
                ?.lessons?.map(lesson => (
                  <li key={lesson.id}>{lesson.name}</li>
                )) || <li>Нет уроков</li>}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModuleLessonsManager;
