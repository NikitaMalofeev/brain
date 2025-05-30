import React, { useRef, useEffect, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

interface DraggableBlockRowProps {
    block: any;
    localOrderValues: { [key: number]: number };
    onOrderInputChange: (blockId: number, newOrder: number) => void;
    getBlockTypeName: (type: string) => string;
    renderBlockContent: (block: any) => React.ReactNode;
    onEdit: (block: any) => void;
    onDelete: (blockId: number, title?: string) => void;
    onReorder: (draggedBlockId: number, targetBlockId: number) => void;
}

const DraggableBlockRow: React.FC<DraggableBlockRowProps> = ({
    block,
    localOrderValues,
    onOrderInputChange,
    getBlockTypeName,
    renderBlockContent,
    onEdit,
    onDelete,
    onReorder
}) => {
    const ref = useRef<HTMLTableRowElement>(null);
    const [isDraggedOver, setIsDraggedOver] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        return combine(
            draggable({
                element,
                getInitialData: () => ({
                    type: 'block',
                    blockId: block.id,
                    orderNum: block.order_num
                }),
            }),
            dropTargetForElements({
                element,
                canDrop: ({ source }) => source.data.type === 'block' && source.data.blockId !== block.id,
                onDragEnter: () => setIsDraggedOver(true),
                onDragLeave: () => setIsDraggedOver(false),
                onDrop: ({ source }) => {
                    setIsDraggedOver(false);
                    if (source.data.type === 'block') {
                        onReorder(source.data.blockId as number, block.id);
                    }
                },
            }),
        );
    }, [block.id, block.order_num, onReorder]);

    return (
        <tr
            ref={ref}
            style={{
                cursor: 'grab',
                backgroundColor: isDraggedOver ? 'rgba(99, 171, 230, 0.1)' : undefined,
                transition: 'background-color 0.2s ease'
            }}
            className={isDraggedOver ? 'drag-over' : ''}
        >
            <td>
                <input
                    type="number"
                    value={localOrderValues[block.id] ?? block.order_num}
                    onChange={(e) => onOrderInputChange(block.id, parseInt(e.target.value) || 1)}
                    style={{ width: '60px', textAlign: 'center' }}
                    className="admin-input"
                    min="1"
                />
            </td>
            <td>{block.title || <span className="empty-value">Без заголовка</span>}</td>
            <td>
                <span className={`admin-status admin-yes`}>
                    {getBlockTypeName(block.block_type)}
                </span>
            </td>
            <td>{renderBlockContent(block)}</td>
            <td className="actions-cell">
                <button
                    className="action-btn edit-btn"
                    onClick={() => onEdit(block)}
                    title="Редактировать блок"
                >
                    Изменить
                </button>
                <button
                    className="action-btn delete-btn"
                    onClick={() => onDelete(block.id, block.title)}
                    title="Удалить блок"
                >
                    Удалить
                </button>
            </td>
        </tr>
    );
};

export default DraggableBlockRow; 