import React, { useState, useEffect, useRef } from 'react';
import { FileUploader, type FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { useBlocksAdmin } from '@/lib/supabase/hooks';
import DraggableBlockRow from '../DraggableBlockRow';
import { supabase } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import { useQuery } from '@tanstack/react-query';
import { useSpecialBundleTechniquesAcrossModules, ModuleInfo } from '@/lib/supabase/hooks/useSpecialBundles';

// Типы для блоков
interface BlockModalData {
    id?: number;
    title: string;
    block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf' | 'material';
    content_text: string;
    content_url: string;
    material_id?: string;
    technique_ids?: string[]; // ID техник привязанных к блоку (множественный выбор)
    order_num: number;
}

interface Material {
    id: string;
    name: string;
    description?: string | null;
    material_type: 'video' | 'audio' | 'article' | 'link' | 'file';
}

// Техника (из module_materials)
interface Technique {
    id: string;
    name: string;
    description?: string | null;
    material_type: string;
}

export interface BlocksManagerProps {
    courseId: string;
    stageId: number;
    lessonId: number;
    onBack: () => void;
    // Новые пропсы для фильтрации техник по дню открытия
    streamModuleId?: string;
    tariffStreamModuleId?: string;
    openDayOffset?: number | null;
    // Информация о всех модулях для спец.пакетов
    allModulesInfo?: ModuleInfo[];
}

// Компонент для управления блоками урока
const BlocksManager: React.FC<BlocksManagerProps> = ({ courseId, stageId, lessonId, onBack, streamModuleId, tariffStreamModuleId, openDayOffset, allModulesInfo }) => {
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

    // Получаем техники спец.пакетов по всем модулям
    const { data: specialBundleTechniques } = useSpecialBundleTechniquesAcrossModules(allModulesInfo || []);

    // Логируем входные параметры
    console.log('=== [BlocksManager] COMPONENT RENDER ===');
    console.log('[BlocksManager] Props:', {
        tariffStreamModuleId,
        openDayOffset,
        streamModuleId,
        lessonId,
        courseId
    });

    // Загружаем техники через React Query для автоматической инвалидации кэша
    const queryEnabled = !!tariffStreamModuleId && openDayOffset !== null && openDayOffset !== undefined;
    console.log('[BlocksManager] Query enabled:', queryEnabled);

    const { data: materialsFromQuery, isLoading: materialsLoading } = useQuery({
        queryKey: ['tariff-module-materials', tariffStreamModuleId, openDayOffset],
        queryFn: async () => {
            console.log('=== [BlocksManager] useQuery EXECUTING ===');
            console.log('[BlocksManager] Params:', { tariffStreamModuleId, openDayOffset });

            const { data, error } = await supabase
                .from('tariff_module_materials')
                .select(`
                    id,
                    unlock_offset_days,
                    material:materials(
                        id,
                        name,
                        description,
                        material_type
                    )
                `)
                .eq('tariff_stream_module_id', tariffStreamModuleId)
                .eq('unlock_offset_days', openDayOffset);

            console.log('[BlocksManager] Raw DB response:', { data, error });

            if (error) throw error;

            // Преобразуем данные в формат Material[]
            const materialsFromModule = (data || [])
                .filter(item => item.material)
                .map(item => ({
                    id: (item.material as any).id,
                    name: (item.material as any).name,
                    description: (item.material as any).description,
                    material_type: (item.material as any).material_type,
                }));

            console.log('[BlocksManager] Techniques from tariff_module_materials:', materialsFromModule);
            return materialsFromModule;
        },
        enabled: !!tariffStreamModuleId && openDayOffset !== null && openDayOffset !== undefined,
    });

    // Комбинируем техники из tariff_module_materials и спец.пакетов
    const techniques = React.useMemo(() => {
        const result: Technique[] = [...(materialsFromQuery || [])];

        // Добавляем техники из спец.пакетов для этого дня
        // day_in_target_module и openDayOffset оба 1-indexed
        if (specialBundleTechniques && tariffStreamModuleId && openDayOffset !== null && openDayOffset !== undefined) {
            const specialForDay = specialBundleTechniques
                .filter(t => t.target_module_id === tariffStreamModuleId && t.day_in_target_module === openDayOffset)
                .map(t => ({
                    id: t.technique_id,
                    name: `[СП] ${t.technique?.name || 'Техника'}`,
                    description: `Из пакета "${t.special_bundle_name}"`,
                    material_type: t.technique?.material_type || 'audio',
                }));
            console.log('[BlocksManager] Special techniques for this day:', specialForDay);
            result.push(...specialForDay);
        }

        console.log('[BlocksManager] FINAL techniques list:', result);
        return result;
    }, [materialsFromQuery, specialBundleTechniques, tariffStreamModuleId, openDayOffset]);

    // Для обратной совместимости (используется в renderBlockContent)
    const materials = techniques;

    // Состояние для предпросмотра markdown в модалке
    const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

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
            material_id: '',
            technique_ids: [],
            order_num: nextOrder,
        });
        setModalMode('add');
        setUploadError(null);
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    // Открыть модал для редактирования
    const openEditModal = (block: any) => {
        // Поддержка как старого формата (technique_id), так и нового (technique_ids)
        let techniqueIds: string[] = [];
        if (block.technique_ids && Array.isArray(block.technique_ids)) {
            techniqueIds = block.technique_ids;
        } else if (block.technique_id) {
            techniqueIds = [block.technique_id];
        }

        setModalData({
            id: block.id,
            title: block.title || '',
            block_type: block.block_type,
            content_text: block.content_text || '',
            content_url: block.content_url || '',
            material_id: block.material_id || '',
            technique_ids: techniqueIds,
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
            material_id: '',
            technique_ids: [],
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
            } else if (modalData.block_type === 'material') {
                // Для material блока нужен только выбранный материал
                if (!modalData.material_id || !modalData.material_id.trim()) {
                    alert('Для блока типа "Материал" необходимо выбрать материал из библиотеки');
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

            // Сохраняем выбранные техники
            const techniqueIds = modalData.technique_ids || [];
            // Для обратной совместимости: если выбрана одна техника, также сохраняем в technique_id
            const techniqueId = techniqueIds.length > 0 ? techniqueIds[0] : undefined;

            if (modalMode === 'add') {
                // Просто создаем новый блок без проверки конфликтов
                await createBlock({
                    lesson_id: lessonId,
                    title: modalData.title?.trim() || '',
                    block_type: modalData.block_type,
                    content_text: modalData.content_text?.trim() || '',
                    content_url: finalContentUrl,
                    material_id: modalData.material_id || undefined,
                    technique_id: techniqueId,
                    technique_ids: techniqueIds.length > 0 ? techniqueIds : undefined,
                    order_num: modalData.order_num,
                });
            } else {
                // Просто обновляем блок без проверки конфликтов
                await updateBlock(modalData.id!, {
                    title: modalData.title?.trim() || '',
                    block_type: modalData.block_type,
                    content_text: modalData.content_text?.trim() || '',
                    content_url: finalContentUrl,
                    material_id: modalData.material_id || undefined,
                    technique_id: techniqueId,
                    technique_ids: techniqueIds.length > 0 ? techniqueIds : [],
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
            material: 'Материал',
        };
        return types[type] || type;
    };

    // Рендер контента блока
    const renderBlockContent = (block: any) => {
        const hasText = block.content_text && block.content_text.trim();
        const hasUrl = block.content_url && block.content_url.trim();

        // Поддержка как старого формата (technique_id), так и нового (technique_ids)
        let techniqueIds: string[] = [];
        if (block.technique_ids && Array.isArray(block.technique_ids)) {
            techniqueIds = block.technique_ids;
        } else if (block.technique_id) {
            techniqueIds = [block.technique_id];
        }
        const hasTechniques = techniqueIds.length > 0;

        // Компонент для отображения привязанных техник
        const TechniqueTag = () => hasTechniques ? (
            <div style={{ marginTop: 4 }}>
                {techniqueIds.map(techId => {
                    const techniqueName = techniques.find(t => t.id === techId)?.name || 'Техника';
                    return (
                        <div key={techId} style={{ display: 'inline-block', background: '#f6ffed', color: '#52c41a', padding: '2px 8px', borderRadius: 4, fontSize: 11, marginRight: 4, marginBottom: 2 }}>
                            🎯 {techniqueName}
                        </div>
                    );
                })}
            </div>
        ) : null;

        switch (block.block_type) {
            case 'text':
                return (
                    <div className="block-content-preview">
                        {hasText ?
                            (block.content_text.substring(0, 100) + (block.content_text.length > 100 ? '...' : ''))
                            : <span className="empty-value">Нет текста</span>
                        }
                        <TechniqueTag />
                    </div>
                );
            case 'video':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🎥 {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                        <TechniqueTag />
                    </div>
                );
            case 'audio':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🔊 {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                        <TechniqueTag />
                    </div>
                );
            case 'image':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🖼️ {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                        <TechniqueTag />
                    </div>
                );
            case 'pdf':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>📄 {block.content_url.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                        <TechniqueTag />
                    </div>
                );
            case 'material':
                const materialName = materials.find(m => m.id === block.material_id)?.name || 'Неизвестный материал';
                return (
                    <div className="block-content-preview">
                        <div>📚 {materialName}</div>
                        {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
                        {!hasText && <span className="empty-value">Нет описания</span>}
                        <TechniqueTag />
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
            case 'material':
                // Для material блока нужен выбранный материал и урок должен быть назначен на день
                if (!streamModuleId || openDayOffset === null || openDayOffset === undefined) {
                    return false; // Нельзя добавить технику если урок не назначен на день
                }
                return modalData.material_id && modalData.material_id.trim().length > 0;
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
                <div className="blocks-header-buttons">
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
                        Добавить блок
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
                                    <option value="material">📚 Материал</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Порядковый номер:</label>
                                <input
                                    className="admin-input"
                                    type="text"
                                    value={modalData.order_num === 0 ? '' : modalData.order_num}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Разрешаем только цифры
                                        if (value === '' || /^\d+$/.test(value)) {
                                            setModalData({ ...modalData, order_num: value === '' ? 0 : parseInt(value) });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Контент в зависимости от типа блока */}
                        {modalData.block_type === 'text' ? (
                            // Для текстового блока - только текст
                            <div className="form-group">
                                <label>
                                    Текстовое содержимое (Markdown):
                                    <button
                                        type="button"
                                        onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                                        style={{
                                            marginLeft: '10px',
                                            background: 'none',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            color: '#666'
                                        }}
                                    >
                                        {showMarkdownPreview ? 'Скрыть предпросмотр' : 'Предпросмотр'}
                                    </button>
                                </label>
                                
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                                    <textarea
                                        className="admin-input"
                                        value={modalData.content_text}
                                        onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                                        rows={10}
                                        placeholder="Введите текст с поддержкой Markdown..."
                                        style={{ 
                                            resize: 'vertical',
                                            flex: showMarkdownPreview ? '1' : '1 1 100%',
                                            fontFamily: 'monospace',
                                            fontSize: '14px'
                                        }}
                                    />
                                    
                                    {showMarkdownPreview && (
                                        <div style={{
                                            flex: '1',
                                            background: '#f8f9fa',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e9ecef',
                                            overflowY: 'auto',
                                            fontSize: '14px',
                                            lineHeight: '1.6'
                                        }}>
                                            <ReactMarkdown
                                                className="text-[#242424] leading-relaxed"
                                                components={{
                                                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                                                    p: ({ node, ...props }) => <p className="my-3" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside my-3 space-y-1" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-3 space-y-1" {...props} />,
                                                    li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                                                    code: ({ node, inline, ...props }) => 
                                                        inline ? (
                                                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} />
                                                        ) : (
                                                            <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto my-3" {...props} />
                                                        ),
                                                    pre: ({ node, ...props }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-3" {...props} />,
                                                    blockquote: ({ node, ...props }) => (
                                                        <blockquote className="border-l-4 border-gray-300 pl-4 my-4 text-gray-600 italic" {...props} />
                                                    ),
                                                    a: ({ node, ...props }) => (
                                                        <a className="text-[#B862EA] underline hover:no-underline" {...props} target="_blank" rel="noopener noreferrer" />
                                                    ),
                                                    hr: ({ node, ...props }) => <hr className="border-t border-gray-300 my-8" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                                                    img: ({ node, ...props }) => <img className="max-w-full h-auto my-4 rounded-lg" {...props} />,
                                                    table: ({ node, ...props }) => <table className="w-full border-collapse my-4" {...props} />,
                                                    th: ({ node, ...props }) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left" {...props} />,
                                                    td: ({ node, ...props }) => <td className="border border-gray-300 px-4 py-2" {...props} />,
                                                }}
                                            >
                                                {modalData.content_text || '*Начните вводить текст для предпросмотра...*'}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : modalData.block_type === 'material' ? (
                            // Для material блока - выбор техники, доступной в этот день модуля
                            <>
                                <div className="form-group">
                                    <label>
                                        Выберите технику
                                        {openDayOffset !== null && openDayOffset !== undefined && (
                                            <span style={{ color: '#888', fontWeight: 'normal' }}> (день {openDayOffset})</span>
                                        )}
                                        :
                                    </label>
                                    {streamModuleId && openDayOffset !== null && openDayOffset !== undefined ? (
                                        <>
                                            <select
                                                className="admin-input"
                                                value={modalData.material_id || ''}
                                                onChange={(e) => setModalData({ ...modalData, material_id: e.target.value })}
                                                disabled={materialsLoading}
                                            >
                                                <option value="">Выберите технику...</option>
                                                {materials.map((material) => (
                                                    <option key={material.id} value={material.id}>
                                                        {material.name} ({material.material_type})
                                                    </option>
                                                ))}
                                            </select>
                                            {materialsLoading && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Загрузка техник...</div>}
                                            {!materialsLoading && materials.length === 0 && (
                                                <div style={{ fontSize: '12px', color: '#f5222d', marginTop: '4px' }}>
                                                    ⚠️ Нет техник назначенных на день {openDayOffset} в этом модуле.
                                                    Добавьте технику в расписание модуля.
                                                </div>
                                            )}
                                            <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                                                💡 Отображаются только техники, назначенные на день {openDayOffset} в расписании модуля
                                            </small>
                                        </>
                                    ) : (
                                        <div style={{ padding: '12px', background: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591' }}>
                                            <div style={{ color: '#ad6800', fontSize: '14px' }}>
                                                ⚠️ Для добавления техники урок должен быть назначен на определённый день модуля.
                                            </div>
                                            <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px' }}>
                                                Установите "День открытия" урока в настройках урока.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Описание (опционально):</label>
                                    <textarea
                                        className="admin-input"
                                        value={modalData.content_text}
                                        onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                                        rows={3}
                                        placeholder="Введите описание..."
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </>
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

                        {/* Поле для привязки техник к блоку (для любого типа блока) */}
                        {streamModuleId && openDayOffset !== null && openDayOffset !== undefined && (
                            <div className="form-group" style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>🎯 Привязать техники</span>
                                    <span style={{ color: '#888', fontWeight: 'normal', fontSize: 12 }}>(день {openDayOffset})</span>
                                </label>
                                {materialsLoading && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Загрузка техник...</div>}
                                {!materialsLoading && techniques.length === 0 && (
                                    <div style={{ fontSize: 12, color: '#faad14', marginTop: 8 }}>
                                        Нет техник назначенных на день {openDayOffset}
                                    </div>
                                )}
                                {!materialsLoading && techniques.length > 0 && (
                                    <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                                        {techniques.map((technique) => {
                                            const isChecked = modalData.technique_ids?.includes(technique.id) || false;
                                            return (
                                                <label
                                                    key={technique.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '6px 8px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer',
                                                        background: isChecked ? '#d9f7be' : 'transparent',
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const currentIds = modalData.technique_ids || [];
                                                            if (e.target.checked) {
                                                                setModalData({ ...modalData, technique_ids: [...currentIds, technique.id] });
                                                            } else {
                                                                setModalData({ ...modalData, technique_ids: currentIds.filter(id => id !== technique.id) });
                                                            }
                                                        }}
                                                        style={{ width: 16, height: 16 }}
                                                    />
                                                    <span style={{ fontSize: 13 }}>
                                                        {technique.name}
                                                        <span style={{ color: '#888', marginLeft: 4 }}>({technique.material_type})</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                <small style={{ color: '#52c41a', marginTop: 8, display: 'block', fontSize: 11 }}>
                                    💡 Выбранные техники будут показаны пользователю при просмотре этого блока
                                </small>
                            </div>
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