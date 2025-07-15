import React, { useState, useEffect, useRef } from 'react';
import { FileUploader, type FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { useBlocksAdmin } from '@/lib/supabase/hooks';
import DraggableBlockRow from '../DraggableBlockRow';
import { logger } from '@/lib/logger';

// Типы для блоков
interface BlockModalData {
    id?: number;
    title: string;
    block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
    content_text: string;
    content_url: string;
    order_num: number;
}

export interface BlocksManagerProps {
    courseId: string;
    stageId: number;
    lessonId: number;
    onBack: () => void;
}

// Компонент для управления блоками урока
const BlocksManager: React.FC<BlocksManagerProps> = ({ courseId, stageId, lessonId, onBack }) => {
    const { blocks, loading, error, refetch, createBlock, updateBlock, deleteBlock } = useBlocksAdmin(lessonId);
    const [updateLoading, setUpdateLoading] = useState<boolean>(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Модальное окно
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<BlockModalData>({
        title: '',
        block_type: 'text',
        content_text: '',
        content_url: '',
        order_num: 1,
    });
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    // Редактирование блока
    const [editingBlock, setEditingBlock] = useState<any | null>(null);

    // Состояние для загрузки файлов
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Состояние для локального редактирования порядка
    const [localOrderValues, setLocalOrderValues] = useState<{ [key: number]: number }>({});
    const [orderUpdateTimeouts, setOrderUpdateTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});

    // Обработчики для загрузки файлов
    const handleFileUploadComplete = (filePath: string, fileUrl: string) => {
        setModalData(prev => ({ ...prev, content_url: fileUrl }));
        setUploadError(null);
    };

    const handleFileUploadError = (error: string) => {
        setUploadError(error);
    };

    // Открыть модал для добавления
    const openAddModal = () => {
        const nextOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order_num)) + 1 : 1;
        setModalData({
            title: '',
            block_type: 'text',
            content_text: '',
            content_url: '',
            order_num: nextOrder,
        });
        setModalMode('add');
        setUploadError(null);
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    // Открыть модал для редактирования
    const openEditModal = (block: any) => {
        setModalData({
            id: block.id,
            title: block.title || '',
            block_type: block.block_type,
            content_text: block.content_text || '',
            content_url: block.content_url || '',
            order_num: block.order_num,
        });
        setModalMode('edit');
        setUploadError(null);
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    // Закрыть модал
    const closeModal = () => {
        setIsModalOpen(false);
        setUploadError(null);
        setSelectedFile(null);
        setModalData({
            title: '',
            block_type: 'text',
            content_text: '',
            content_url: '',
            order_num: 1,
        });
    };

    // Ref для FileUploader
    const fileUploaderRef = useRef<FileUploaderRef>(null);

    // Сохранить блок
    const saveBlock = async () => {
        try {
            setUpdateLoading(true);
            setUpdateError(null);

            let finalContentUrl = modalData.content_url.trim() || undefined;

            // Если выбран новый файл, загружаем его и используем его путь
            if (selectedFile) {
                const uploadResult = await fileUploaderRef.current?.uploadFile();
                if (uploadResult && uploadResult.filePath) {
                    finalContentUrl = uploadResult.filePath;
                } else {
                    alert('Ошибка загрузки файла. Попробуйте еще раз.');
                    setUpdateLoading(false);
                    return;
                }
            }

            // Валидация в зависимости от типа блока
            const hasText = modalData.content_text && modalData.content_text.trim();
            const hasUrl = finalContentUrl;

            if (modalData.block_type === 'text') {
                // Для текстового блока нужен хотя бы заголовок или контент
                const hasTitle = modalData.title && modalData.title.trim();
                if (!hasText && !hasTitle) {
                    alert('Для текстового блока необходимо заполнить заголовок или содержимое');
                    setUpdateLoading(false);
                    return;
                }
            } else if (modalData.block_type === 'video') {
                // Для видео нужен хотя бы URL или описание
                if (!hasText && !hasUrl) {
                    alert('Для видео блока необходимо заполнить URL или описание');
                    setUpdateLoading(false);
                    return;
                }
            } else {
                // Для файловых блоков (audio, image, pdf) нужен только файл/URL, описание опционально
                if (!hasUrl) {
                    alert(`Для блока типа "${getBlockTypeName(modalData.block_type)}" необходимо загрузить файл или указать URL`);
                    setUpdateLoading(false);
                    return;
                }
            }

            if (modalMode === 'add') {
                // Просто создаем новый блок без проверки конфликтов
                await createBlock({
                    lesson_id: lessonId,
                    title: modalData.title?.trim() || '',
                    block_type: modalData.block_type,
                    content_text: modalData.content_text?.trim() || '',
                    content_url: finalContentUrl,
                    order_num: modalData.order_num,
                });
            } else {
                // Просто обновляем блок без проверки конфликтов
                await updateBlock(modalData.id!, {
                    title: modalData.title?.trim() || '',
                    block_type: modalData.block_type,
                    content_text: modalData.content_text?.trim() || '',
                    content_url: finalContentUrl,
                    order_num: modalData.order_num,
                });
            }

            closeModal();
        } catch (error: any) {
            console.error('Ошибка при сохранении блока:', error);
            setUpdateError(error.message || 'Произошла ошибка при сохранении блока');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Удаление блока
    const handleDeleteBlock = async (id: number, title?: string) => {
        const blockName = title || 'Безымянный блок';
        if (!confirm(`Вы уверены, что хотите удалить блок "${blockName}"?`)) {
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);

            await deleteBlock(id);
        } catch (error: any) {
            console.error('Ошибка при удалении блока:', error);
            setUpdateError(error.message || 'Произошла ошибка при удалении блока');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Инлайн-редактирование порядка с debounce
    const handleOrderInputChange = (blockId: number, newOrder: number) => {
        // Обновляем локальное значение немедленно
        setLocalOrderValues(prev => ({ ...prev, [blockId]: newOrder }));

        // Очищаем предыдущий таймер если есть
        if (orderUpdateTimeouts[blockId]) {
            clearTimeout(orderUpdateTimeouts[blockId]);
        }

        // Устанавливаем новый таймер для отложенного обновления
        const timeoutId = setTimeout(() => {
            handleOrderChange(blockId, newOrder);
        }, 1000); // 1 секунда задержки

        setOrderUpdateTimeouts(prev => ({ ...prev, [blockId]: timeoutId }));
    };

    const handleOrderChange = async (blockId: number, newOrder: number) => {
        try {
            // Просто обновляем порядок без проверки конфликтов
            await updateBlock(blockId, { order_num: newOrder });

            // Очищаем локальное значение после успешного обновления
            setLocalOrderValues(prev => {
                const newValues = { ...prev };
                delete newValues[blockId];
                return newValues;
            });
        } catch (error: any) {
            console.error('Ошибка при изменении порядка:', error);
            setUpdateError(error.message || 'Произошла ошибка при изменении порядка');

            // Возвращаем локальное значение к исходному
            setLocalOrderValues(prev => {
                const newValues = { ...prev };
                delete newValues[blockId];
                return newValues;
            });
        }
    };

    // Обработка drag & drop перестановки блоков
    const handleBlockReorder = async (draggedBlockId: number, targetBlockId: number) => {
        try {
            setUpdateLoading(true);
            setUpdateError(null);

            // Находим блоки в текущем массиве
            const draggedBlock = blocks.find(b => b.id === draggedBlockId);
            const targetBlock = blocks.find(b => b.id === targetBlockId);

            if (!draggedBlock || !targetBlock) {
                throw new Error('Блоки не найдены');
            }

            // Создаем копию массива блоков для расчета новых позиций
            const sortedBlocks = [...blocks].sort((a, b) => a.order_num - b.order_num);
            const draggedIndex = sortedBlocks.findIndex(b => b.id === draggedBlockId);
            const targetIndex = sortedBlocks.findIndex(b => b.id === targetBlockId);

            if (draggedIndex === -1 || targetIndex === -1) {
                throw new Error('Индексы блоков не найдены');
            }

            // Перемещаем элемент в новую позицию
            const reorderedBlocks = [...sortedBlocks];
            const [movedBlock] = reorderedBlocks.splice(draggedIndex, 1);
            reorderedBlocks.splice(targetIndex, 0, movedBlock);

            // Обновляем order_num для всех затронутых блоков
            const updates = [];
            for (let i = 0; i < reorderedBlocks.length; i++) {
                const newOrderNum = i + 1;
                if (reorderedBlocks[i].order_num !== newOrderNum) {
                    updates.push(updateBlock(reorderedBlocks[i].id, { order_num: newOrderNum }));
                }
            }

            // Выполняем все обновления
            await Promise.all(updates);

            // Перезагружаем данные для отображения обновленного порядка
            await refetch();

        } catch (error: any) {
            console.error('Ошибка при перестановке блоков:', error);
            setUpdateError(error.message || 'Произошла ошибка при перестановке блоков');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Получение названия типа блока для отображения
    const getBlockTypeName = (type: string) => {
        const types: Record<string, string> = {
            text: 'Текст',
            video: 'Видео',
            audio: 'Аудио',
            image: 'Изображение',
            pdf: 'PDF',
        };
        return types[type] || type;
    };

    // Рендер контента блока
    const renderBlockContent = (block: any) => {
        const hasText = block.content_text && block.content_text.trim();
        const hasUrl = block.content_url && block.content_url.trim();

        switch (block.block_type) {
            case 'text':
                return (
                    <div className="block-content-preview">
                        {hasText ?
                            (block.content_text.substring(0, 100) + (block.content_text.length > 100 ? '...' : ''))
                            : <span className="empty-value">Нет текста</span>
                        }
                    </div>
                );
            case 'video':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🎥 {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            case 'audio':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🔊 {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            case 'image':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🖼️ {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            case 'pdf':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>📄 {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            default:
                return <span className="empty-value">Неизвестный тип</span>;
        }
    };

    const handleFileSelected = (file: File | null) => {
        setSelectedFile(file);
    };

    // Проверка валидности формы для активации кнопки
    const isFormValid = () => {
        if (!modalData.block_type) return false;
        if (updateLoading || fileUploaderRef.current?.isUploading?.()) return false;

        switch (modalData.block_type) {
            case 'text':
                // Для текстового блока нужен хотя бы заголовок или контент
                const hasTitle = modalData.title && modalData.title.trim();
                const hasText = modalData.content_text && modalData.content_text.trim();
                return hasTitle || hasText;
            case 'video':
                // Для видео нужен хотя бы URL или описание
                const hasVideoUrl = modalData.content_url && modalData.content_url.trim();
                const hasVideoText = modalData.content_text && modalData.content_text.trim();
                return hasVideoUrl || hasVideoText;
            case 'audio':
            case 'image':
            case 'pdf':
                // Для файловых блоков нужен файл/URL, заголовок и описание опциональны
                return modalData.content_url.trim().length > 0 || fileUploaderRef.current?.hasSelectedFile();
            default:
                return false;
        }
    };

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Блоки урока</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="admin-refresh-btn"
                        onClick={refetch}
                        disabled={loading}
                    >
                        Обновить
                    </button>
                    <button
                        className="admin-add-btn"
                        onClick={openAddModal}
                        disabled={loading}
                    >
                        + Добавить блок
                    </button>
                    <button
                        className="admin-button"
                        onClick={onBack}
                        style={{ background: 'var(--admin-secondary)' }}
                    >
                        ← Назад к урокам
                    </button>
                </div>
            </div>

            {updateError && (
                <div className="admin-error admin-update-error">
                    {updateError}
                </div>
            )}

            {loading ? (
                <div className="admin-loading">Загрузка блоков...</div>
            ) : error ? (
                <div className="admin-error">Ошибка: {error.message}</div>
            ) : blocks.length === 0 ? (
                <div className="empty-table">
                    Блоки не найдены. Добавьте первый блок урока.
                </div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Порядок</th>
                                <th>Заголовок</th>
                                <th>Тип</th>
                                <th>Контент/URL</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {blocks.map((block) => (
                                <DraggableBlockRow
                                    key={block.id}
                                    block={block}
                                    localOrderValues={localOrderValues}
                                    onOrderInputChange={handleOrderInputChange}
                                    getBlockTypeName={getBlockTypeName}
                                    renderBlockContent={renderBlockContent}
                                    onEdit={openEditModal}
                                    onDelete={handleDeleteBlock}
                                    onReorder={handleBlockReorder}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Модальное окно редактирования блока */}
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={closeModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeModal}>×</button>

                        <h3>{modalMode === 'add' ? 'Добавить блок' : 'Редактировать блок'}</h3>

                        <div className="form-group">
                            <label>Заголовок блока (опционально):</label>
                            <input
                                className="admin-input"
                                value={modalData.title}
                                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                                placeholder="Заголовок блока..."
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Тип блока:</label>
                                <select
                                    className="admin-input"
                                    value={modalData.block_type}
                                    onChange={(e) => setModalData({ ...modalData, block_type: e.target.value as any })}
                                >
                                    <option value="text">📝 Текст</option>
                                    <option value="video">🎥 Видео</option>
                                    <option value="audio">🔊 Аудио</option>
                                    <option value="image">🖼️ Изображение</option>
                                    <option value="pdf">📄 PDF</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Порядковый номер:</label>
                                <input
                                    className="admin-input"
                                    type="number"
                                    value={modalData.order_num}
                                    onChange={(e) => setModalData({ ...modalData, order_num: parseInt(e.target.value) || 1 })}
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* Контент в зависимости от типа блока */}
                        {modalData.block_type === 'text' ? (
                            // Для текстового блока - только текст
                            <div className="form-group">
                                <label>Текстовое содержимое:</label>
                                <textarea
                                    className="admin-input"
                                    value={modalData.content_text}
                                    onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                                    rows={6}
                                    placeholder="Введите текстовое содержимое блока..."
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        ) : modalData.block_type === 'video' ? (
                            // Для видео - только URL (Kinescope)
                            <>
                                <div className="form-group">
                                    <label>URL видео (Kinescope и др.):</label>
                                    <input
                                        className="admin-input"
                                        value={modalData.content_url}
                                        onChange={(e) => setModalData({ ...modalData, content_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                    <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                                        💡 Вставьте ссылку на видео Kinescope
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label>Описание видео (опционально):</label>
                                    <textarea
                                        className="admin-input"
                                        value={modalData.content_text}
                                        onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                                        rows={3}
                                        placeholder="Введите описание к видео..."
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </>
                        ) : (
                            // Для файлов (audio, image, pdf) - FileUploader + текст
                            <>
                                <div className="form-group">
                                    <label>
                                        Загрузка файла ({getBlockTypeName(modalData.block_type).toLowerCase()}):
                                    </label>
                                    {uploadError && (
                                        <div className="admin-error" style={{ marginBottom: '12px' }}>
                                            {uploadError}
                                        </div>
                                    )}
                                    <FileUploader
                                        ref={fileUploaderRef}
                                        onFileSelected={handleFileSelected}
                                        onUploadComplete={handleFileUploadComplete}
                                        onUploadError={handleFileUploadError}
                                        acceptedTypes={
                                            modalData.block_type === 'audio' ? 'audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/m4a,audio/aac,audio/flac' :
                                                modalData.block_type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml' :
                                                    modalData.block_type === 'pdf' ? 'application/pdf' : '*/*'
                                        }
                                        filePrefix={
                                            modalData.block_type === 'audio' ? 'audio/' :
                                                modalData.block_type === 'image' ? 'images/' :
                                                    modalData.block_type === 'pdf' ? 'documents/' : 'documents/'
                                        }
                                        currentFileUrl={modalData.content_url ? buildFileUrl(modalData.content_url) || undefined : undefined}
                                        disabled={updateLoading}
                                    />
                                    <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                                        💡 Или вставьте готовый URL файла:
                                    </small>
                                    <input
                                        className="admin-input"
                                        style={{ marginTop: '8px' }}
                                        value={modalData.content_url}
                                        onChange={(e) => setModalData({ ...modalData, content_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        {modalData.block_type === 'image' ? 'Подпись к изображению' : 'Описание'} (опционально):
                                    </label>
                                    <textarea
                                        className="admin-input"
                                        value={modalData.content_text}
                                        onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                                        rows={3}
                                        placeholder={`Введите ${modalData.block_type === 'image' ? 'подпись к изображению' : 'описание'}...`}
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={saveBlock}
                                disabled={!isFormValid()}
                            >
                                {fileUploaderRef.current?.isUploading?.() ? 'Загрузка файла...' :
                                    updateLoading ? 'Сохранение...' :
                                        (modalMode === 'add' ? 'Добавить' : 'Сохранить')}
                            </button>
                            <button
                                className="admin-button"
                                onClick={closeModal}
                                disabled={updateLoading}
                                style={{ background: 'var(--admin-danger)' }}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlocksManager; 