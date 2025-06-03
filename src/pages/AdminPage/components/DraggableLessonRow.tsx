import React, { useRef, useEffect, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { buildFileUrl } from '@/lib/cloudflareR2Service';

interface DraggableLessonRowProps {
    lesson: any;
    editingLesson: any | null;
    editName: string;
    editDescription: string;
    editOrderNum: number;
    editHasAssignment: boolean;
    editOpenAt: string;
    editDeadlineAt: string;
    onEditNameChange: (value: string) => void;
    onEditDescriptionChange: (value: string) => void;
    onEditOrderChange: (value: number) => void;
    onEditHasAssignmentChange: (value: boolean) => void;
    onEditOpenAtChange: (value: string) => void;
    onEditDeadlineAtChange: (value: string) => void;
    onStartEditing: (lesson: any) => void;
    onSaveLesson: () => void;
    onCancelEditing: () => void;
    onLessonSelect: (lessonId: number, lessonName: string) => void;
    onDeleteLesson: (id: number, name: string) => void;
    updateLoading: boolean;
    onReorder: (draggedLessonId: number, targetLessonId: number) => void;
    onEditCover: (lesson: any) => void;
}

const DraggableLessonRow: React.FC<DraggableLessonRowProps> = ({
    lesson,
    editingLesson,
    editName,
    editDescription,
    editOrderNum,
    editHasAssignment,
    editOpenAt,
    editDeadlineAt,
    onEditNameChange,
    onEditDescriptionChange,
    onEditOrderChange,
    onEditHasAssignmentChange,
    onEditOpenAtChange,
    onEditDeadlineAtChange,
    onStartEditing,
    onSaveLesson,
    onCancelEditing,
    onLessonSelect,
    onDeleteLesson,
    updateLoading,
    onReorder,
    onEditCover
}) => {
    const ref = useRef<HTMLTableRowElement>(null);
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const isEditing = editingLesson?.id === lesson.id;

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Не включаем drag & drop если в режиме редактирования
        if (isEditing) return;

        return combine(
            draggable({
                element,
                getInitialData: () => ({
                    type: 'lesson',
                    lessonId: lesson.id,
                    orderNum: lesson.order_num
                }),
            }),
            dropTargetForElements({
                element,
                canDrop: ({ source }) => source.data.type === 'lesson' && source.data.lessonId !== lesson.id,
                onDragEnter: () => setIsDraggedOver(true),
                onDragLeave: () => setIsDraggedOver(false),
                onDrop: ({ source }) => {
                    setIsDraggedOver(false);
                    if (source.data.type === 'lesson') {
                        onReorder(source.data.lessonId as number, lesson.id);
                    }
                },
            }),
        );
    }, [lesson.id, lesson.order_num, isEditing, onReorder]);

    return (
        <tr
            ref={ref}
            style={{
                cursor: isEditing ? 'default' : 'grab',
                backgroundColor: isDraggedOver ? 'rgba(184, 98, 234, 0.1)' : undefined,
                transition: 'background-color 0.2s ease'
            }}
            className={isDraggedOver ? 'drag-over' : ''}
        >
            <td>
                {/* Столбец обложки урока */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {lesson.cover_image_path ? (
                        <img
                            src={buildFileUrl(lesson.cover_image_path)}
                            alt="Обложка урока"
                            style={{
                                width: '40px',
                                height: '40px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid var(--admin-border)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#f0f0f0',
                            border: '1px dashed #ccc',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#999'
                        }}>
                            📷
                        </div>
                    )}
                    <button
                        className="action-btn edit-btn"
                        onClick={() => onEditCover(lesson)}
                        title="Редактировать обложку"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                        {lesson.cover_image_path && lesson.cover_image_path.trim() ? 'Изменить' : 'Добавить'}
                    </button>
                </div>
            </td>
            <td>
                {isEditing ? (
                    <input
                        className="admin-input"
                        value={editName}
                        onChange={e => onEditNameChange(e.target.value)}
                        style={{ width: '100%' }}
                    />
                ) : (
                    lesson.name
                )}
            </td>
            <td>
                {isEditing ? (
                    <input
                        className="admin-input"
                        value={editDescription}
                        onChange={e => onEditDescriptionChange(e.target.value)}
                        style={{ width: '100%' }}
                    />
                ) : (
                    lesson.description || '-'
                )}
            </td>
            <td>
                {isEditing ? (
                    <input
                        className="admin-input"
                        type="number"
                        value={editOrderNum}
                        onChange={e => onEditOrderChange(parseInt(e.target.value) || 1)}
                        style={{ width: '80px' }}
                    />
                ) : (
                    lesson.order_num
                )}
            </td>
            <td>
                {isEditing ? (
                    <input
                        type="checkbox"
                        checked={editHasAssignment}
                        onChange={e => onEditHasAssignmentChange(e.target.checked)}
                    />
                ) : (
                    <span className={`admin-status ${lesson.has_assignment ? 'admin-yes' : 'admin-no'}`}>
                        {lesson.has_assignment ? 'Да' : 'Нет'}
                    </span>
                )}
            </td>
            <td>
                {isEditing ? (
                    <input
                        className="admin-input"
                        type="datetime-local"
                        value={editOpenAt}
                        onChange={e => onEditOpenAtChange(e.target.value)}
                        style={{ width: '200px' }}
                    />
                ) : (
                    lesson.open_at ? new Date(lesson.open_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : '-'
                )}
            </td>
            <td>
                {isEditing ? (
                    <input
                        className="admin-input"
                        type="datetime-local"
                        value={editDeadlineAt}
                        onChange={e => onEditDeadlineAtChange(e.target.value)}
                        style={{ width: '200px' }}
                    />
                ) : (
                    lesson.deadline_at ? new Date(lesson.deadline_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : '-'
                )}
            </td>
            <td className="actions-cell">
                {isEditing ? (
                    <>
                        <button
                            className="action-btn edit-btn"
                            onClick={onSaveLesson}
                            disabled={updateLoading}
                        >
                            Сохранить
                        </button>
                        <button
                            className="action-btn delete-btn"
                            onClick={onCancelEditing}
                            disabled={updateLoading}
                        >
                            Отмена
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="action-btn edit-btn"
                            onClick={() => onLessonSelect(lesson.id, lesson.name)}
                            title="Управление блоками"
                        >
                            Блоки
                        </button>
                        <button
                            className="action-btn edit-btn"
                            onClick={() => onStartEditing(lesson)}
                            title="Редактировать урок"
                        >
                            Изменить
                        </button>
                        <button
                            className="action-btn delete-btn"
                            onClick={() => onDeleteLesson(lesson.id, lesson.name)}
                            disabled={updateLoading}
                            title="Удалить урок"
                        >
                            Удалить
                        </button>
                    </>
                )}
            </td>
        </tr>
    );
};

export default DraggableLessonRow; 