import React, { useState, useMemo } from 'react';
import { Card, Button, Space, Empty, Modal, Form, Input, InputNumber, message, Popconfirm, Spin, DatePicker, Checkbox, Alert, Typography, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BlockOutlined, DragOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useModuleLessons,
  useCreateLessonInModule,
  useUpdateModuleLesson,
  useDeleteModuleLesson,
} from '@/lib/supabase/hooks/useModuleLessons';
import { Lesson } from '@/lib/supabase/types';
import BlocksManager from '../BlocksManager/BlocksManager';

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
  const [lessonForm] = Form.useForm();
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Состояние для просмотра блоков урока
  const [selectedLessonForBlocks, setSelectedLessonForBlocks] = useState<Lesson | null>(null);

  // Drag-and-drop состояние
  const [viewMode, setViewMode] = useState<'list' | 'schedule'>('schedule');
  const [draggedLesson, setDraggedLesson] = useState<Lesson | null>(null);
  const [customModuleDays, setCustomModuleDays] = useState<number>(21);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const moduleDaysCount = moduleDurationDays || customModuleDays;

  // Хуки для работы с уроками напрямую (без ступеней)
  const { data: lessons, isLoading } = useModuleLessons(streamModuleId);
  const createLessonMutation = useCreateLessonInModule();
  const updateLessonMutation = useUpdateModuleLesson();
  const deleteLessonMutation = useDeleteModuleLesson();

  // Уроки сгруппированные по дням открытия (только распределённые)
  const lessonsByDay = useMemo(() => {
    if (!lessons) return {};
    const result: Record<number, Lesson[]> = {};
    for (const lesson of lessons) {
      // Пропускаем нераспределённые уроки (null/undefined)
      if (lesson.open_day_offset === null || lesson.open_day_offset === undefined) {
        continue;
      }
      const day = lesson.open_day_offset;
      if (!result[day]) result[day] = [];
      result[day].push(lesson);
    }
    return result;
  }, [lessons]);

  // Уроки без назначенного дня (open_day_offset = null или undefined)
  const unscheduledLessons = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter(lesson =>
      lesson.open_day_offset === null || lesson.open_day_offset === undefined
    );
  }, [lessons]);

  // Отфильтрованные уроки по поисковому запросу
  const filteredUnscheduledLessons = useMemo(() => {
    if (!searchQuery.trim()) return unscheduledLessons;
    const lowerQuery = searchQuery.toLowerCase();
    return unscheduledLessons.filter(lesson =>
      lesson.name.toLowerCase().includes(lowerQuery)
    );
  }, [unscheduledLessons, searchQuery]);

  // Уроки с аномально высоким open_day_offset (вне видимой сетки)
  const anomalousLessons = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter(lesson =>
      lesson.open_day_offset !== null &&
      lesson.open_day_offset !== undefined &&
      lesson.open_day_offset > moduleDaysCount
    );
  }, [lessons, moduleDaysCount]);

  // Функция для сброса open_day_offset у аномальных уроков
  const handleFixAnomalousLessons = async () => {
    if (anomalousLessons.length === 0) return;
    try {
      for (const lesson of anomalousLessons) {
        await updateLessonMutation.mutateAsync({
          id: lesson.id,
          open_day_offset: null,
          stream_module_id: streamModuleId,
        });
      }
      message.success(`Исправлено ${anomalousLessons.length} уроков - сброшены в нераспределённые`);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при исправлении');
    }
  };

  // Открыть модальное окно создания/редактирования урока
  const handleOpenLessonModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      lessonForm.setFieldsValue({
        name: lesson.name,
        description: lesson.description,
        order_num: lesson.order_num,
        has_assignment: lesson.has_assignment,
        open_day_offset: lesson.open_day_offset,
        deadline_day_offset: lesson.deadline_day_offset,
        open_at: lesson.open_at ? dayjs(lesson.open_at) : null,
        deadline_at: lesson.deadline_at ? dayjs(lesson.deadline_at) : null,
        estimated_duration_minutes: lesson.estimated_duration_minutes,
      });
    } else {
      setEditingLesson(null);
      const nextOrderNum = (lessons?.length || 0) + 1;
      lessonForm.setFieldsValue({
        order_num: nextOrderNum,
        has_assignment: false,
        open_day_offset: null, // По умолчанию: не распределён
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
    lessonForm.resetFields();
  };

  // Сохранить урок
  const handleSaveLesson = async (values: any) => {
    const lessonData = {
      name: values.name,
      description: values.description,
      order_num: values.order_num,
      has_assignment: values.has_assignment,
      open_day_offset: values.open_day_offset ?? null,
      deadline_day_offset: values.deadline_day_offset || null,
      open_at: values.open_at ? dayjs(values.open_at).toISOString() : undefined,
      deadline_at: values.deadline_at ? dayjs(values.deadline_at).toISOString() : undefined,
      estimated_duration_minutes: values.estimated_duration_minutes || undefined,
    };

    try {
      if (editingLesson) {
        await updateLessonMutation.mutateAsync({
          id: editingLesson.id,
          ...lessonData,
          stream_module_id: streamModuleId,
        });
        message.success('Урок обновлен');
      } else {
        await createLessonMutation.mutateAsync({
          stream_module_id: streamModuleId,
          stream_id: streamId,
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
        id: draggedLesson.id,
        open_day_offset: day,
        stream_module_id: streamModuleId,
      });
      message.success(`Урок "${draggedLesson.name}" назначен на день ${day}`);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при обновлении');
    }
    setDraggedLesson(null);
  };

  // Убрать урок из расписания (сбросить open_day_offset на null)
  const handleUnscheduleLesson = async (lessonId: number) => {
    try {
      await updateLessonMutation.mutateAsync({
        id: lessonId,
        open_day_offset: null,
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
        <div style={{ marginTop: 16 }}>Загрузка уроков...</div>
      </div>
    );
  }

  // Если выбран урок для просмотра блоков - показываем BlocksManager
  if (selectedLessonForBlocks) {
    return (
      <BlocksManager
        courseId={courseId}
        stageId={selectedLessonForBlocks.stage_id || 0}
        lessonId={selectedLessonForBlocks.id}
        onBack={() => setSelectedLessonForBlocks(null)}
      />
    );
  }

  // Рендер списка уроков (классический вид)
  const renderListView = () => {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {!lessons || lessons.length === 0 ? (
          <Empty description="Уроков пока нет. Создайте новый урок." />
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
                        {' | '}
                        {lesson.open_day_offset === null || lesson.open_day_offset === undefined
                          ? 'Не распределён'
                          : lesson.open_day_offset === 0
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
                        onClick={() => setSelectedLessonForBlocks(lesson)}
                      >
                        Блоки
                      </Button>
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
    );
  };

  // Рендер расписания (drag-and-drop вид)
  const renderScheduleView = () => {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Предупреждение о уроках с неправильными днями */}
        {anomalousLessons.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`Найдено ${anomalousLessons.length} уроков с некорректным днём открытия (вне сетки ${moduleDaysCount} дней)`}
            description={
              <div>
                <div style={{ marginBottom: 8 }}>
                  Эти уроки не отображаются в расписании:
                  {anomalousLessons.slice(0, 5).map(lesson => (
                    <div key={lesson.id} style={{ fontSize: 12 }}>
                      • "{lesson.name}" (день {lesson.open_day_offset})
                    </div>
                  ))}
                  {anomalousLessons.length > 5 && <div style={{ fontSize: 12 }}>...и ещё {anomalousLessons.length - 5}</div>}
                </div>
                <Button
                  size="small"
                  type="primary"
                  danger
                  onClick={handleFixAnomalousLessons}
                  loading={updateLessonMutation.isPending}
                >
                  Сбросить в нераспределённые
                </Button>
              </div>
            }
          />
        )}

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
              {unscheduledLessons.length === 0 ? (
                <Empty description="Все уроки распределены в расписании" />
              ) : (
                <Space direction="vertical" style={{ width: '100%', maxHeight: 400, overflowY: 'auto' }}>
                  {(searchQuery ? filteredUnscheduledLessons : unscheduledLessons).map((lesson) => (
                    <Card
                      key={lesson.id}
                      size="small"
                      draggable
                      onDragStart={() => setDraggedLesson(lesson)}
                      onDragEnd={() => setDraggedLesson(null)}
                      style={{
                        cursor: 'grab',
                        background: '#fff'
                      }}
                      bodyStyle={{ padding: 8 }}
                    >
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Space>
                          <DragOutlined />
                          <Text ellipsis style={{ maxWidth: 140 }}>
                            {lesson.name}
                          </Text>
                        </Space>
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
                {Array.from({ length: moduleDaysCount }, (_, i) => i + 1).map((day) => (
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
                    {lessonsByDay[day]?.map((lesson) => (
                      <Card
                        key={lesson.id}
                        size="small"
                        style={{ marginTop: 4 }}
                        bodyStyle={{ padding: 4 }}
                      >
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space size={2} style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text ellipsis style={{ fontSize: 11, maxWidth: 70 }}>
                              {lesson.name}
                            </Text>
                            <Space size={2}>
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenLessonModal(lesson)}
                              />
                              <Popconfirm
                                title="Убрать из расписания?"
                                onConfirm={() => handleUnscheduleLesson(lesson.id)}
                                okText="Да"
                                cancelText="Нет"
                              >
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          </Space>
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
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Уроки модуля: {moduleName}</h3>
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenLessonModal()}>
              Создать урок
            </Button>
          </Space>
        </div>

        {/* Контент в зависимости от режима */}
        {viewMode === 'list' ? renderListView() : renderScheduleView()}
      </Space>

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
              tooltip="1 = первый день модуля, 2 = второй день и т.д. Пусто = не распределён"
            >
              <InputNumber min={1} style={{ width: 150 }} placeholder="Не распределён" />
            </Form.Item>
            <Form.Item
              name="deadline_day_offset"
              label="Дедлайн (день модуля)"
              tooltip="День модуля когда наступает дедлайн. Пусто = без дедлайна"
            >
              <InputNumber min={1} style={{ width: 150 }} placeholder="Без дедлайна" />
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
    </div>
  );
};

export default ModuleLessonsManager;
