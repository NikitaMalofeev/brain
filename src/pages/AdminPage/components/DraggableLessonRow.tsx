import React, { useRef, useEffect, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

interface DraggableLessonRowProps {
    lesson: any;
    editingLesson: any | null;
    editName: string;
    editDescription: string;
    editOrderNum: number;
    editHasAssignment: boolean;
    onEditNameChange: (value: string) => void;
    onEditDescriptionChange: (value: string) => void;
    onEditOrderChange: (value: number) => void;
    onEditHasAssignmentChange: (value: boolean) => void;
    onStartEditing: (lesson: any) => void;
    onSaveLesson: () => void;
    onCancelEditing: () => void;
    onLessonSelect: (lessonId: number, lessonName: string) => void;
    onDeleteLesson: (id: number, name: string) => void;
    updateLoading: boolean;
    onReorder: (draggedLessonId: number, targetLessonId: number) => void;
}

const DraggableLessonRow: React.FC<DraggableLessonRowProps> = ({
    lesson,
    editingLesson,
    editName,
    editDescription,
    editOrderNum,
    editHasAssignment,
    onEditNameChange,
    onEditDescriptionChange,
    onEditOrderChange,
    onEditHasAssignmentChange,
    onStartEditing,
    onSaveLesson,
    onCancelEditing,
    onLessonSelect,
    onDeleteLesson,
    updateLoading,
    onReorder
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
            <td>{(lesson as any).lesson_blocks?.count || 0}</td>
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