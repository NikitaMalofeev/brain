import React, { useState, useEffect } from 'react';
import { useLessonsAdmin } from '@/lib/supabase/hooks';
import DraggableLessonRow from './DraggableLessonRow';

interface LessonsManagerProps {
    courseId: string;
    stageId: number;
    onBack: () => void;
    onLessonSelect: (lessonId: number, lessonName: string) => void;
}

// Функции для работы с часовыми поясами
const utcToLocal = (utcDateString?: string): string => {
    if (!utcDateString) return '';
    const date = new Date(utcDateString);
    // Получаем локальное время в формате YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const localToUtc = (localDateString?: string): string | undefined => {
    if (!localDateString) return undefined;
    // Создаем дату как локальную и конвертируем в UTC
    const date = new Date(localDateString);
    return date.toISOString();
};

// Функция для автоматического расчета дедлайна (дата открытия + 2 дня)
const calculateDeadline = (openAtString: string): string => {
    if (!openAtString) return '';

    const openDate = new Date(openAtString);
    // Добавляем 2 дня (48 часов)
    const deadlineDate = new Date(openDate.getTime() + (2 * 24 * 60 * 60 * 1000));

    // Возвращаем в формате YYYY-MM-DDTHH:mm для datetime-local инпута
    const year = deadlineDate.getFullYear();
    const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
    const day = String(deadlineDate.getDate()).padStart(2, '0');
    const hours = String(deadlineDate.getHours()).padStart(2, '0');
    const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Функция для получения завтрашней даты с временем 9:00 утра
const getDefaultOpenTime = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Завтра
    tomorrow.setHours(9, 0, 0, 0); // 9:00 утра

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}T09:00`;
};

const LessonsManager: React.FC<LessonsManagerProps> = ({ courseId, stageId, onBack, onLessonSelect }) => {
    const { lessons, loading, error, refetch, createLesson, updateLesson, deleteLesson } = useLessonsAdmin(stageId);
    const [updateLoading, setUpdateLoading] = useState<boolean>(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Новый урок
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newOrderNum, setNewOrderNum] = useState(1);
    const [newHasAssignment, setNewHasAssignment] = useState(false);
    const [newOpenAt, setNewOpenAt] = useState('');
    const [newDeadlineAt, setNewDeadlineAt] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // Редактируемый урок
    const [editingLesson, setEditingLesson] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editOrderNum, setEditOrderNum] = useState(1);
    const [editHasAssignment, setEditHasAssignment] = useState(false);
    const [editOpenAt, setEditOpenAt] = useState('');
    const [editDeadlineAt, setEditDeadlineAt] = useState('');

    // Автоматически обновляем newOrderNum при изменении списка уроков
    useEffect(() => {
        if (lessons.length > 0) {
            const maxOrderNum = Math.max(...lessons.map(lesson => lesson.order_num));
            setNewOrderNum(maxOrderNum + 1);
        } else {
            setNewOrderNum(1);
        }
    }, [lessons]);

    // Устанавливаем время открытия по умолчанию при первом рендере
    useEffect(() => {
        if (!newOpenAt) {
            const defaultTime = getDefaultOpenTime();
            setNewOpenAt(defaultTime);
        }
    }, []); // Пустая зависимость - выполняется только при монтировании

    // Автоматически устанавливаем дедлайн при изменении даты открытия для нового урока
    useEffect(() => {
        if (newOpenAt) {
            const calculatedDeadline = calculateDeadline(newOpenAt);
            if (calculatedDeadline !== newDeadlineAt) {
                setNewDeadlineAt(calculatedDeadline);
            }
        }
    }, [newOpenAt]);

    // Автоматически устанавливаем дедлайн при изменении даты открытия для редактируемого урока
    useEffect(() => {
        if (editOpenAt && editingLesson) {
            const calculatedDeadline = calculateDeadline(editOpenAt);
            if (calculatedDeadline !== editDeadlineAt) {
                setEditDeadlineAt(calculatedDeadline);
            }
        }
    }, [editOpenAt, editingLesson]);

    // Добавление урока
    const handleAddLesson = async () => {
        if (!newName.trim()) {
            alert('Введите название урока');
            return;
        }

        try {
            setAddLoading(true);
            setUpdateError(null);

            await createLesson({
                stage_id: stageId,
                name: newName.trim(),
                description: newDescription.trim() || undefined,
                order_num: newOrderNum,
                has_assignment: newHasAssignment,
                open_at: localToUtc(newOpenAt),
                deadline_at: localToUtc(newDeadlineAt),
            });

            // Очищаем форму
            setNewName('');
            setNewDescription('');
            setNewHasAssignment(false);
            setNewOpenAt(getDefaultOpenTime()); // Устанавливаем время по умолчанию
            setNewDeadlineAt('');

        } catch (error: any) {
            console.error('Ошибка при добавлении урока:', error);
            setUpdateError(error.message || 'Произошла ошибка при добавлении урока');
        } finally {
            setAddLoading(false);
        }
    };

    // Удаление урока
    const handleDeleteLesson = async (id: number, name: string) => {
        if (!confirm(`Вы уверены, что хотите удалить урок "${name}"? Это также удалит все блоки урока и прогресс пользователей.`)) {
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);
            await deleteLesson(id);
        } catch (error: any) {
            console.error('Ошибка при удалении урока:', error);
            setUpdateError(error.message || 'Произошла ошибка при удалении урока');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Начать редактирование урока
    const startEditing = (lesson: any) => {
        setEditingLesson(lesson);
        setEditName(lesson.name);
        setEditDescription(lesson.description || '');
        setEditOrderNum(lesson.order_num);
        setEditHasAssignment(lesson.has_assignment || false);
        setEditOpenAt(utcToLocal(lesson.open_at));
        setEditDeadlineAt(utcToLocal(lesson.deadline_at));
    };

    // Отмена редактирования
    const cancelEditing = () => {
        setEditingLesson(null);
        setEditName('');
        setEditDescription('');
        setEditOrderNum(1);
        setEditHasAssignment(false);
        setEditOpenAt('');
        setEditDeadlineAt('');
    };

    // Сохранение отредактированного урока
    const saveLesson = async () => {
        if (!editingLesson) return;
        if (!editName.trim()) {
            alert('Название урока обязательно');
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);

            await updateLesson(editingLesson.id, {
                name: editName.trim(),
                description: editDescription.trim() || undefined,
                order_num: editOrderNum,
                has_assignment: editHasAssignment,
                open_at: localToUtc(editOpenAt),
                deadline_at: localToUtc(editDeadlineAt),
            });

            cancelEditing();

        } catch (error: any) {
            console.error('Ошибка при сохранении урока:', error);
            setUpdateError(error.message || 'Произошла ошибка при сохранении урока');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Drag & Drop функционал для уроков
    const handleLessonReorder = async (draggedLessonId: number, targetLessonId: number) => {
        try {
            setUpdateLoading(true);
            setUpdateError(null);

            // Находим урок, который перетаскиваем, и целевой урок
            const draggedLesson = lessons.find(lesson => lesson.id === draggedLessonId);
            const targetLesson = lessons.find(lesson => lesson.id === targetLessonId);

            if (!draggedLesson || !targetLesson) {
                console.error('Не найден урок для перестановки');
                return;
            }

            // Создаем копию массива уроков для локального пересчета
            const updatedLessons = [...lessons];

            // Убираем перетаскиваемый урок из массива
            const draggedIndex = updatedLessons.findIndex(lesson => lesson.id === draggedLessonId);
            const removedLesson = updatedLessons.splice(draggedIndex, 1)[0];

            // Находим новую позицию (перед целевым уроком)
            const targetIndex = updatedLessons.findIndex(lesson => lesson.id === targetLessonId);
            updatedLessons.splice(targetIndex, 0, removedLesson);

            // Пересчитываем order_num для всех уроков
            const updates = updatedLessons.map((lesson, index) => ({
                id: lesson.id,
                order_num: index + 1
            }));

            // Выполняем обновления в БД
            for (const update of updates) {
                await updateLesson(update.id, { order_num: update.order_num });
            }

            console.log('✅ Порядок уроков успешно обновлен');

        } catch (error: any) {
            console.error('Ошибка при изменении порядка уроков:', error);
            setUpdateError(error.message || 'Произошла ошибка при изменении порядка уроков');
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Управление уроками</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="admin-refresh-btn"
                        onClick={refetch}
                        disabled={loading}
                    >
                        Обновить
                    </button>
                    <button
                        className="admin-add-btn"
                        onClick={onBack}
                    >
                        ← Назад к ступеням
                    </button>
                </div>
            </div>

            {/* Форма добавления урока */}
            <div className="lesson-add-form">
                <h3>Добавить урок</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <input
                        className="admin-input"
                        placeholder="Название урока"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        style={{ flex: '2 1 200px' }}
                    />
                    <input
                        className="admin-input"
                        placeholder="Описание (опционально)"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        style={{ flex: '3 1 300px' }}
                    />
                    <input
                        className="admin-input"
                        type="number"
                        placeholder="Порядок"
                        value={newOrderNum}
                        onChange={e => setNewOrderNum(parseInt(e.target.value) || 1)}
                        style={{ flex: '0 0 80px' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 0 120px' }}>
                        <input
                            type="checkbox"
                            checked={newHasAssignment}
                            onChange={e => setNewHasAssignment(e.target.checked)}
                        />
                        Есть ДЗ
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 220px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                            Время открытия:
                        </label>
                        <input
                            className="admin-input"
                            type="datetime-local"
                            value={newOpenAt}
                            onChange={e => setNewOpenAt(e.target.value)}
                            style={{ width: '100%', minWidth: '200px' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 220px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                            Дедлайн сдачи:
                        </label>
                        <input
                            className="admin-input"
                            type="datetime-local"
                            value={newDeadlineAt}
                            onChange={e => setNewDeadlineAt(e.target.value)}
                            style={{ width: '100%', minWidth: '200px' }}
                        />
                    </div>
                    <div style={{ flex: '0 0 120px', alignSelf: 'flex-end' }}>
                        <button
                            className="admin-button"
                            onClick={handleAddLesson}
                            disabled={addLoading || !newName.trim()}
                            style={{ width: '100%' }}
                        >
                            {addLoading ? 'Добавление...' : 'Добавить'}
                        </button>
                    </div>
                </div>
            </div>

            {updateError && (
                <div className="admin-error admin-update-error">
                    {updateError}
                </div>
            )}

            {loading ? (
                <div className="admin-loading">Загрузка уроков...</div>
            ) : error ? (
                <div className="admin-error">Ошибка: {error.message}</div>
            ) : lessons.length === 0 ? (
                <div className="empty-table">Уроки не найдены</div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Описание</th>
                                <th>Порядок</th>
                                <th>Блоков</th>
                                <th>Есть ДЗ</th>
                                <th>Открытие</th>
                                <th>Дедлайн</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lessons.map((lesson) => (
                                <DraggableLessonRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    editingLesson={editingLesson}
                                    editName={editName}
                                    editDescription={editDescription}
                                    editOrderNum={editOrderNum}
                                    editHasAssignment={editHasAssignment}
                                    editOpenAt={editOpenAt}
                                    editDeadlineAt={editDeadlineAt}
                                    onEditNameChange={setEditName}
                                    onEditDescriptionChange={setEditDescription}
                                    onEditOrderChange={setEditOrderNum}
                                    onEditHasAssignmentChange={setEditHasAssignment}
                                    onEditOpenAtChange={setEditOpenAt}
                                    onEditDeadlineAtChange={setEditDeadlineAt}
                                    onStartEditing={startEditing}
                                    onSaveLesson={saveLesson}
                                    onCancelEditing={cancelEditing}
                                    onLessonSelect={onLessonSelect}
                                    onDeleteLesson={handleDeleteLesson}
                                    updateLoading={updateLoading}
                                    onReorder={handleLessonReorder}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LessonsManager; 