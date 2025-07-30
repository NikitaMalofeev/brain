import React, { useState } from 'react';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';

// TODO: Использовать глобальный тип Material, когда он будет определен
interface Material {
    id: string;
    name: string;
    description?: string | null;
    cover_image_path?: string | null;
    material_type: 'video' | 'audio';
    order_num: number;
    course_id?: string | null;
    release_date?: string | null;
    created_at: string;
    updated_at: string;
}

interface DraggableMaterialRowProps {
    material: Material;
    getMaterialTypeLabel: (type: string) => string;
    formatDate: (dateString: string) => string;
    onEdit: (material: Material) => void;
    onEditCover: (material: Material) => void;
    onManageBlocks: (material: Material) => void;
    onDelete: (material: Material) => void;
    onReorder: (draggedMaterialId: string, targetMaterialId: string) => void;
    courses?: { id: string; title: string }[];
}

const DraggableMaterialRow: React.FC<DraggableMaterialRowProps> = ({
    material,
    getMaterialTypeLabel,
    formatDate,
    onEdit,
    onEditCover,
    onManageBlocks,
    onDelete,
    onReorder,
    courses = []
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        // Используем ID материала (string)
        e.dataTransfer.setData('text/plain', material.id);
        e.dataTransfer.effectAllowed = 'move';
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.cursor = 'grabbing';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);
        setDragOver(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.cursor = 'grab';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setDragOver(e.clientY < midY ? 'top' : 'bottom');
    };

    const handleDragLeave = () => {
        setDragOver(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const draggedMaterialId = e.dataTransfer.getData('text/plain');

        if (draggedMaterialId !== material.id) {
            onReorder(draggedMaterialId, material.id);
        }

        setDragOver(null);
    };

    return (
        <tr
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                cursor: 'grab',
                opacity: isDragging ? 0.5 : 1,
                borderTop: dragOver === 'top' ? '2px solid var(--admin-primary)' : undefined,
                borderBottom: dragOver === 'bottom' ? '2px solid var(--admin-primary)' : undefined,
            }}
            className={`${isDragging ? 'dragging' : ''} ${dragOver ? 'drop-target' : ''}`}
        >
            <td>
                {material.cover_image_path ? (
                    <img
                        src={buildFileUrl(material.cover_image_path) || ''}
                        alt={material.name}
                        className="admin-image-preview"
                    />
                ) : (
                    <div className="admin-status">Нет обложки</div>
                )}
            </td>
            <td>{material.name}</td>
            <td>
                <p className={'line-clamp-3'}>{material.description || <span className="empty-value">Нет описания</span>}</p>
            </td>
            <td>
                {material.course_id ? (
                    courses.find(c => c.id === material.course_id)?.title || material.course_id
                ) : (
                    <span className="empty-value">Не привязан</span>
                )}
            </td>
            <td>{getMaterialTypeLabel(material.material_type)}</td>
            <td style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                {material.release_date ? formatDate(material.release_date) : <span className="empty-value">Не указана</span>}
            </td>
            <td>{material.order_num}</td>
            <td className="actions-cell">
                <button
                    className="action-btn edit-btn"
                    onClick={() => onEditCover(material)}
                    title="Редактировать обложку"
                >
                    🖼️
                </button>
                <button
                    className="action-btn edit-btn"
                    onClick={() => onEdit(material)}
                    title="Редактировать материал"
                >
                    ✏️
                </button>
                <button
                    className="action-btn"
                    onClick={() => onManageBlocks(material)}
                    title="Управление блоками"
                    style={{ background: 'rgba(75, 181, 67, 0.1)', color: '#4BB543' }}
                >
                    📋
                </button>
                <button
                    className="action-btn delete-btn"
                    onClick={() => onDelete(material)}
                    title="Удалить материал"
                >
                    🗑️
                </button>
            </td>
        </tr>
    );
};

export default DraggableMaterialRow; 