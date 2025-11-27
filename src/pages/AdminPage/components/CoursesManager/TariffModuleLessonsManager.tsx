import React, { useState, useMemo } from 'react';
import { Card, Button, Collapse, Space, Empty, Modal, Form, Input, InputNumber, message, Popconfirm, Spin, DatePicker, Checkbox, Select, Alert, Typography, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CaretRightOutlined, LinkOutlined, DisconnectOutlined, BlockOutlined, DragOutlined, SearchOutlined } from '@ant-design/icons';
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
import BlocksManager from '../BlocksManager/BlocksManager';

const { Panel } = Collapse;
const { TextArea } = Input;
const { Text } = Typography;

interface ModuleLessonsManagerProps {
  streamModuleId: string;
  streamId: string;
  courseId: string;
  moduleName: string;
  moduleDurationDays?: number;
}

const ModuleLessonsManager: React.FC<ModuleLessonsManagerProps> = ({
  streamModuleId,
  streamId,
  courseId,
  moduleName,
  moduleDurationDays,
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

  // Состояние для просмотра блоков урока
  const [selectedLessonForBlocks, setSelectedLessonForBlocks] = useState<{ lesson: Lesson; stageId: number } | null>(null);

  // Drag-and-drop состояние
  const [viewMode, setViewMode] = useState<'list' | 'schedule'>('schedule');
  const [draggedLesson, setDraggedLesson] = useState<{ lesson: Lesson; stageId: number } | null>(null);
  const [customModuleDays, setCustomModuleDays] = useState<number>(21);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const moduleDaysCount = moduleDurationDays || customModuleDays;

  // Хуки
  const { data: stages, isLoading } = useModuleStages(streamModuleId);
  const { data: unassignedStages, isLoading: unassignedLoading } = useUnassignedStages(courseId);
  const createStageMutation = useCreateStageInModule();
  const assignStageMutation = useAssignStageToModule();
  const unassignStageMutation = useUnassignStageFromModule();

  const updateStageMutation = useUpdateStage();
  const deleteStageMutation = useDeleteStage();
  const createLessonMutation = useCreateLessonInStage();
  const updateLessonMutation = useUpdateLesson();
  const deleteLessonMutation = useDeleteLesson();

  // Все уроки из всех ступеней плоским списком
  const allLessons = useMemo(() => {
    if (!stages) return [];
    return stages.flatMap(stage =>
      (stage.lessons || []).map(lesson => ({
        lesson,
        stageId: stage.id,
        stageName: stage.name
      }))
    );
  }, [stages]);

  // Уроки сгруппированные по дням открытия
  const lessonsByDay = useMemo(() => {
    const result: Record<number, { lesson: Lesson; stageId: number; stageName: string }[]> = {};
    for (const item of allLessons) {
      const day = item.lesson.open_day_offset ?? 0;
      if (!result[day]) result[day] = [];
      result[day].push(item);
    }
    return result;
  }, [allLessons]);

  // Уроки без назначенного дня (open_day_offset = null или undefined)
  const unscheduledLessons = useMemo(() => {
    return allLessons.filter(item =>
      item.lesson.open_day_offset === null || item.lesson.open_day_offset === undefined
    );
  }, [allLessons]);

  // Отфильтрованные уроки по поисковому запросу
  const filteredUnscheduledLessons = useMemo(() => {
    if (!searchQuery.trim()) return unscheduledLessons;
    const lowerQuery = searchQuery.toLowerCase();
    return unscheduledLessons.filter(item =>
      item.lesson.name.toLowerCase().includes(lowerQuery) ||
      item.stageName.toLowerCase().includes(lowerQuery)
    );
  }, [unscheduledLessons, searchQuery]);

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
        open_day_offset: lesson.open_day_offset ?? 0,
        deadline_day_offset: lesson.deadline_day_offset,
        open_at: lesson.open_at ? dayjs(lesson.open_at) : null,
        deadline_at: lesson.deadline_at ? dayjs(lesson.deadline_at) : null,
        estimated_duration_minutes: lesson.estimated_duration_minutes,
      });
    } else {
      setEditingLesson(null);
      const stage = stages?.find(s => s.id === stageId);
      const nextOrderNum = (stage?.lessons?.length || 0) + 1;
      lessonForm.setFieldsValue({
        order_num: nextOrderNum,
        has_assignment: false,
        open_day_offset: nextOrderNum - 1, // По умолчанию: урок 1 = день 0, урок 2 = день 1 и т.д.
        deadline_day_offset: null,
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
      open_day_offset: values.open_day_offset ?? 0,
      deadline_day_offset: values.deadline_day_offset || null,
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

  // Drag-and-drop: перетащить урок на день
  const handleDropOnDay = async (day: number) => {
    if (!draggedLesson) return;

    try {
      await updateLessonMutation.mutateAsync({
        id: draggedLesson.lesson.id,
        open_day_offset: day,
        stream_module_id: streamModuleId,
      });
      message.success(`Урок "${draggedLesson.lesson.name}" назначен на день ${day}`);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при обновлении');
    }
    setDraggedLesson(null);
  };

  // Убрать урок из расписания (сбросить open_day_offset)
  const handleUnscheduleLesson = async (lessonId: number) => {
    try {
      await updateLessonMutation.mutateAsync({
        id: lessonId,
        open_day_offset: undefined,
        stream_module_id: streamModuleId,
      });
      message.success('Урок убран из расписания');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении из расписания');
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

  // Если выбран урок для просмотра блоков - показываем BlocksManager
  if (selectedLessonForBlocks) {
    return (
      <BlocksManager
        courseId={courseId}
        stageId={selectedLessonForBlocks.stageId}
        lessonId={selectedLessonForBlocks.lesson.id}
        onBack={() => setSelectedLessonForBlocks(null)}
      />
    );
  }

  // Рендер списка уроков (классический вид)
  const renderListView = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
                              {' | '}
                              {lesson.open_day_offset === 0 || lesson.open_day_offset === undefined || lesson.open_day_offset === null
                                ? 'Открыт сразу'
                                : `С ${lesson.open_day_offset} дня`}
                              {lesson.deadline_day_offset && ` | Дедлайн: ${lesson.deadline_day_offset} день`}
                              {lesson.has_assignment && ' | Есть ДЗ'}
                            </div>
                          </div>
                          <Space>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<BlockOutlined />}
                              onClick={() => setSelectedLessonForBlocks({ lesson, stageId: stage.id })}
                            >
                              Блоки
                            </Button>
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
  );

  // Рендер расписания (drag-and-drop вид)
  const renderScheduleView = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Инпут для количества дней если не указано */}
      {!moduleDurationDays && (
        <Card size="small">
          <Space>
            <Text strong>Количество дней в модуле:</Text>
            <InputNumber
              min={1}
              max={365}
              value={customModuleDays}
              onChange={(value) => setCustomModuleDays(value || 21)}
              style={{ width: 100 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              (не задано в конфигурации, используется для отображения сетки)
            </Text>
          </Space>
        </Card>
      )}

      <Row gutter={24}>
        {/* Уроки без назначенного дня */}
        <Col span={6}>
          <Card size="small" title="Уроки (перетащите на день)">
            <Input
              placeholder="Поиск по названию"
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 12 }}
              allowClear
            />
            {allLessons.length === 0 ? (
              <Empty description="Нет уроков. Создайте ступени и уроки." />
            ) : (
              <Space direction="vertical" style={{ width: '100%', maxHeight: 400, overflowY: 'auto' }}>
                {(searchQuery ? filteredUnscheduledLessons : allLessons).map((item) => (
                  <Card
                    key={item.lesson.id}
                    size="small"
                    draggable
                    onDragStart={() => setDraggedLesson(item)}
                    onDragEnd={() => setDraggedLesson(null)}
                    style={{
                      cursor: 'grab',
                      background: item.lesson.open_day_offset !== null && item.lesson.open_day_offset !== undefined
                        ? '#f6ffed'
                        : '#fff'
                    }}
                    bodyStyle={{ padding: 8 }}
                  >
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space>
                        <DragOutlined />
                        <Text ellipsis style={{ maxWidth: 140 }}>
                          {item.lesson.name}
                        </Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {item.stageName}
                        {item.lesson.open_day_offset !== null && item.lesson.open_day_offset !== undefined && (
                          <> | День {item.lesson.open_day_offset}</>
                        )}
                      </Text>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        {/* Сетка дней */}
        <Col span={18}>
          <Card size="small" title="Расписание уроков по дням модуля">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 8,
              }}
            >
              {Array.from({ length: moduleDaysCount }, (_, i) => i).map((day) => (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnDay(day)}
                  style={{
                    minHeight: 100,
                    padding: 8,
                    borderRadius: 6,
                    border: `2px solid ${
                      draggedLesson
                        ? '#1890ff'
                        : lessonsByDay[day]?.length
                        ? '#52c41a'
                        : '#d9d9d9'
                    }`,
                    background: draggedLesson
                      ? '#e6f7ff'
                      : lessonsByDay[day]?.length
                      ? '#f6ffed'
                      : '#fafafa',
                  }}
                >
                  <Text strong style={{ fontSize: 12 }}>
                    День {day}
                  </Text>
                  {lessonsByDay[day]?.map((item) => (
                    <Card
                      key={item.lesson.id}
                      size="small"
                      style={{ marginTop: 4 }}
                      bodyStyle={{ padding: 4 }}
                    >
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Space size={2} style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text ellipsis style={{ fontSize: 11, maxWidth: 70 }}>
                            {item.lesson.name}
                          </Text>
                          <Space size={2}>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenLessonModal(item.stageId, item.lesson)}
                            />
                            <Popconfirm
                              title="Убрать из расписания?"
                              onConfirm={() => handleUnscheduleLesson(item.lesson.id)}
                              okText="Да"
                              cancelText="Нет"
                            >
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 9 }}>
                          {item.stageName}
                        </Text>
                      </Space>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Ступени и уроки модуля: {moduleName}</h3>
          <Space>
            <Button
              type={viewMode === 'schedule' ? 'primary' : 'default'}
              onClick={() => setViewMode('schedule')}
            >
              Расписание
            </Button>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              Список
            </Button>
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

        {/* Контент в зависимости от режима */}
        {viewMode === 'list' ? renderListView() : renderScheduleView()}
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
          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="open_day_offset"
              label="Открыть с дня модуля"
              tooltip="0 = сразу после открытия модуля, 1 = на следующий день и т.д."
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: 150 }} placeholder="0" />
            </Form.Item>
            <Form.Item
              name="deadline_day_offset"
              label="Дедлайн (день модуля)"
              tooltip="День модуля когда наступает дедлайн. Пусто = без дедлайна"
            >
              <InputNumber min={0} style={{ width: 150 }} placeholder="Без дедлайна" />
            </Form.Item>
          </Space>
          <Form.Item name="has_assignment" label="Есть домашнее задание" valuePropName="checked">
            <Checkbox>Есть ДЗ</Checkbox>
          </Form.Item>
          <Form.Item name="open_at" label="Точная дата открытия (опционально)">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Если нужна конкретная дата вместо offset"
            />
          </Form.Item>
          <Form.Item name="deadline_at" label="Точная дата дедлайна (опционально)">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Если нужна конкретная дата вместо offset"
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
