import React, { useState } from 'react';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';

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
    onEditAccess?: (lesson: any) => void;
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
    onEditCover,
    onEditAccess
}) => {
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const isEditing = editingLesson?.id === lesson.id;
    const isDraggedOver = false; // Это будет управляться извне

    return (
        <>
            <tr
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
                                src={buildFileUrl(lesson.cover_image_path) || ''}
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
                        >
                            {lesson.cover_image_path && lesson.cover_image_path.trim() ? 'Изменить' : 'Добавить'}
                        </button>
                    </div>
                </td>
                <td>
                    {isEditing ? (
                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                            Название редактируется ниже
                        </div>
                    ) : (
                        lesson.name
                    )}
                </td>
                <td>
                    {isEditing ? (
                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                            Описание редактируется ниже
                        </div>
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
                    <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        Время редактируется ниже
                    </div>
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
                    <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        Дедлайн редактируется ниже
                    </div>
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
                        <div className="actions-dropdown">
                            {/* Основные действия - всегда видимые */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                
                                {/* Выпадающее меню для дополнительных действий */}
                                <button
                                    className="action-btn actions-more-btn"
                                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                                    title="Дополнительные действия"
                                >
                                    ⋯
                                </button>
                                
                                {showActionsMenu && (
                                    <div className="actions-dropdown-menu">
                                        {onEditAccess && (
                                            <button
                                                className="actions-dropdown-item access"
                                                onClick={() => {
                                                    onEditAccess(lesson);
                                                    setShowActionsMenu(false);
                                                }}
                                                title="Управление доступом"
                                            >
                                                🔒 Доступ
                                            </button>
                                        )}
                                        <button
                                            className="actions-dropdown-item delete"
                                            onClick={() => {
                                                onDeleteLesson(lesson.id, lesson.name);
                                                setShowActionsMenu(false);
                                            }}
                                            disabled={updateLoading}
                                            title="Удалить урок"
                                        >
                                            🗑️ Удалить
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Закрытие меню при клике вне его */}
                            {showActionsMenu && (
                                <div 
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 999
                                    }}
                                    onClick={() => setShowActionsMenu(false)}
                                />
                            )}
                        </div>
                    )}
                </td>
            </tr>
            
            {/* Дополнительная строка для редактирования названия, описания и времени */}
            {isEditing && (
                <tr style={{ backgroundColor: 'rgba(99, 171, 230, 0.05)' }}>
                    <td colSpan={7}>
                        <div style={{ padding: '16px', borderTop: '1px solid var(--admin-border)' }}>
                            {/* Первый ряд: название и описание */}
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                {/* Название урока */}
                                <div style={{ flex: '1' }}>
                                    <div style={{ marginBottom: '8px', fontWeight: '500', color: 'var(--admin-text-primary)' }}>
                                        Название урока:
                                    </div>
                                    <textarea
                                        className="admin-input"
                                        value={editName}
                                        onChange={e => onEditNameChange(e.target.value)}
                                        placeholder="Введите название урока..."
                                        style={{
                                            width: '100%',
                                            minHeight: '60px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            fontSize: '14px',
                                            lineHeight: '1.4'
                                        }}
                                    />
                                </div>
                                
                                {/* Описание урока */}
                                <div style={{ flex: '1' }}>
                                    <div style={{ marginBottom: '8px', fontWeight: '500', color: 'var(--admin-text-primary)' }}>
                                        Описание урока:
                                    </div>
                                    <textarea
                                        className="admin-input"
                                        value={editDescription}
                                        onChange={e => onEditDescriptionChange(e.target.value)}
                                        placeholder="Введите описание урока..."
                                        style={{
                                            width: '100%',
                                            minHeight: '60px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            fontSize: '14px',
                                            lineHeight: '1.4'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Второй ряд: время открытия и дедлайн */}
                            <div style={{ display: 'flex', gap: '24px' }}>
                                {/* Время открытия */}
                                <div style={{ flex: '1' }}>
                                    <div style={{ marginBottom: '8px', fontWeight: '500', color: 'var(--admin-text-primary)' }}>
                                        Время открытия:
                                    </div>
                                    <input
                                        className="admin-input"
                                        type="datetime-local"
                                        value={editOpenAt}
                                        onChange={e => onEditOpenAtChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: '14px'
                                        }}
                                    />
                                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Оставьте пустым для немедленного открытия
                                    </small>
                                </div>
                                
                                {/* Дедлайн */}
                                <div style={{ flex: '1' }}>
                                    <div style={{ marginBottom: '8px', fontWeight: '500', color: 'var(--admin-text-primary)' }}>
                                        Дедлайн:
                                    </div>
                                    <input
                                        className="admin-input"
                                        type="datetime-local"
                                        value={editDeadlineAt}
                                        onChange={e => onEditDeadlineAtChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: '14px'
                                        }}
                                    />
                                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Оставьте пустым для отсутствия дедлайна
                                    </small>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default DraggableLessonRow; 