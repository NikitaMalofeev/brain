import React, { useState } from 'react';

interface DraggableMaterialBlockRowProps {
    block: any;
    localOrderValues: { [key: number]: number };
    onOrderInputChange: (blockId: number, newOrder: number) => void;
    getBlockTypeLabel: (type: string) => string;
    renderBlockContent: (block: any) => React.ReactNode;
    onEdit: (block: any) => void;
    onDelete: (blockId: number, title?: string) => void;
    onReorder: (draggedBlockId: number, targetBlockId: number) => void;
}

const DraggableMaterialBlockRow: React.FC<DraggableMaterialBlockRowProps> = ({
    block,
    localOrderValues,
    onOrderInputChange,
    getBlockTypeLabel,
    renderBlockContent,
    onEdit,
    onDelete,
    onReorder
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', block.id.toString());
        e.dataTransfer.effectAllowed = 'move';

        // Добавляем стиль для перетаскиваемого элемента
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

        // Определяем, в какую часть элемента перетаскиваем
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setDragOver(e.clientY < midY ? 'top' : 'bottom');
    };

    const handleDragLeave = () => {
        setDragOver(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const draggedBlockId = parseInt(e.dataTransfer.getData('text/plain'));

        if (draggedBlockId !== block.id) {
            onReorder(draggedBlockId, block.id);
        }

        setDragOver(null);
    };

    // Определяем значение порядка для отображения
    const displayOrderValue = localOrderValues[block.id] ?? block.order_num;

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
                <input
                    type="number"
                    className="admin-input"
                    style={{ width: '70px', fontSize: '14px' }}
                    value={displayOrderValue}
                    onChange={(e) => onOrderInputChange(block.id, parseInt(e.target.value) || 1)}
                    min="1"
                    onClick={(e) => e.stopPropagation()}
                />
            </td>
            <td>{block.title || <span className="empty-value">Без заголовка</span>}</td>
            <td>{getBlockTypeLabel(block.block_type)}</td>
            <td>{renderBlockContent(block)}</td>
            <td className="actions-cell">
                <button
                    className="action-btn edit-btn"
                    onClick={() => onEdit(block)}
                    title="Редактировать блок"
                >
                    ✎
                </button>
                <button
                    className="action-btn delete-btn"
                    onClick={() => onDelete(block.id, block.title)}
                    title="Удалить блок"
                >
                    ✕
                </button>
            </td>
        </tr>
    );
};

export default DraggableMaterialBlockRow; 