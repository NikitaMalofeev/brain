import React, { useState, useEffect, useRef } from 'react';
import { FileUploader, FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { buildFileUrl, buildImageUrl, FILE_PREFIXES, deleteFileFromR2 } from '@/lib/cloudflareR2Service';
import { supabase } from '../../../../lib/supabase/client';
import DraggableMaterialBlockRow from './DraggableMaterialBlockRow';

// TODO: Определить типы для Material и MaterialBlock на основе db_schema.md
interface Material {
    id: string; // uuid
    name: string;
    description?: string | null;
    cover_image_path?: string | null;
    material_type: 'video' | 'audio'; // Пока только эти типы
    order_num: number;
    created_at: string; // timestamptz
    // ... другие поля из таблицы materials, если нужны для отображения
}

interface MaterialBlock {
    id: number; // bigserial
    material_id: string; // uuid
    order_num: number;
    title?: string | null;
    block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
    content_text?: string | null;
    content_url?: string | null;
    // meta_json - убрали для MVP
    created_at: string; // timestamptz
}

type ViewMode = 'materials' | 'blocks';

interface MaterialFormData {
    name: string;
    description: string;
    material_type: 'video' | 'audio';
    order_num: number;
}

interface BlockFormData {
    title: string;
    block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
    content_text: string;
    content_url: string;
    order_num: number;
}

const MaterialsManager: React.FC = () => {
    const fileUploaderRef = useRef<FileUploaderRef>(null);
    const blockFileUploaderRef = useRef<FileUploaderRef>(null);

    // Материалы
    const [materials, setMaterials] = useState<Material[]>([]);
    const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
    const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');

    // Блоки материалов
    const [materialBlocks, setMaterialBlocks] = useState<MaterialBlock[]>([]);

    // Добавляю состояния для drag&drop и инлайн-редактирования - КАК В УРОКАХ
    const [localOrderValues, setLocalOrderValues] = useState<{ [key: number]: number }>({});
    const [orderUpdateTimeouts, setOrderUpdateTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});

    // UI состояния
    const [viewMode, setViewMode] = useState<ViewMode>('materials');
    const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
    const [currentMaterialName, setCurrentMaterialName] = useState<string>('');

    // Модальные окна
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [coverModalOpen, setCoverModalOpen] = useState(false);

    // Редактируемые элементы
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [editingBlock, setEditingBlock] = useState<MaterialBlock | null>(null);
    const [selectedMaterialForCover, setSelectedMaterialForCover] = useState<Material | null>(null);

    // Формы
    const [materialForm, setMaterialForm] = useState<MaterialFormData>({
        name: '',
        description: '',
        material_type: 'video',
        order_num: 1
    });

    const [blockForm, setBlockForm] = useState<BlockFormData>({
        title: '',
        block_type: 'text',
        content_text: '',
        content_url: '',
        order_num: 1
    });

    // Файлы
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');

    // Загрузка и ошибки
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [coverSaving, setCoverSaving] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Загрузка материалов
    const loadMaterials = async () => {
        setLoading(true);
        setError('');

        if (!supabase) {
            setError('Supabase не инициализирован');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('order_num', { ascending: true });

            if (error) throw error;
            setMaterials(data || []);
        } catch (err: any) {
            setError(`Ошибка загрузки материалов: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка блоков материала
    const loadMaterialBlocks = async (materialId: string) => {
        setUpdateLoading(true);
        setError('');

        if (!supabase) {
            setError('Supabase не инициализирован');
            setUpdateLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('material_blocks')
                .select('*')
                .eq('material_id', materialId)
                .order('order_num', { ascending: true });

            if (error) throw error;
            setMaterialBlocks(data || []);
        } catch (err: any) {
            setError(`Ошибка загрузки блоков: ${err.message}`);
        } finally {
            setUpdateLoading(false);
        }
    };

    useEffect(() => {
        loadMaterials();
    }, []);

    useEffect(() => {
        if (viewMode === 'blocks' && currentMaterialId) {
            loadMaterialBlocks(currentMaterialId);
        }
    }, [viewMode, currentMaterialId]);

    // Применяем фильтры при изменении материалов или фильтров
    useEffect(() => {
        filterMaterials();
    }, [materials, materialTypeFilter]);

    // Фильтрация материалов
    const filterMaterials = () => {
        let filtered = [...materials];

        if (materialTypeFilter !== 'all') {
            filtered = filtered.filter(material => material.material_type === materialTypeFilter);
        }

        setFilteredMaterials(filtered);
    };

    // Форматирование даты создания
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // === МАТЕРИАЛЫ ===
    const handleOpenMaterialModal = (material: Material | null = null) => {
        if (material) {
            setEditingMaterial(material);
            setMaterialForm({
                name: material.name,
                description: material.description || '',
                material_type: material.material_type,
                order_num: material.order_num
            });
        } else {
            setEditingMaterial(null);
            setMaterialForm({
                name: '',
                description: '',
                material_type: 'video',
                order_num: materials.length + 1
            });
        }
        setMaterialModalOpen(true);
        setError('');
        setSuccess('');
    };

    const handleCloseMaterialModal = () => {
        setMaterialModalOpen(false);
        setEditingMaterial(null);
        setError('');
        setSuccess('');
    };

    const handleSaveMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            const materialData = {
                name: materialForm.name.trim(),
                description: materialForm.description.trim() || null,
                material_type: materialForm.material_type,
                order_num: materialForm.order_num
            };

            if (editingMaterial) {
                // Обновление (БЕЗ обложки - она обновляется отдельно)
                const { error } = await supabase
                    .from('materials')
                    .update(materialData)
                    .eq('id', editingMaterial.id);

                if (error) throw error;
                setSuccess('Материал успешно обновлен!');
            } else {
                // Создание (БЕЗ обложки - она добавляется отдельно)
                const { error } = await supabase
                    .from('materials')
                    .insert(materialData);

                if (error) throw error;
                setSuccess('Материал успешно создан!');
            }

            await loadMaterials();
            setTimeout(() => {
                handleCloseMaterialModal();
            }, 1000);

        } catch (err: any) {
            setError(`Ошибка сохранения: ${err.message}`);
        }
    };

    const handleDeleteMaterial = async (material: Material) => {
        if (!confirm(`Вы уверены, что хотите удалить материал "${material.name}"? Это также удалит все связанные блоки контента.`)) {
            return;
        }

        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', material.id);

            if (error) throw error;
            setSuccess('Материал успешно удален!');
            await loadMaterials();

        } catch (err: any) {
            setError(`Ошибка удаления: ${err.message}`);
        }
    };

    // === ОБЛОЖКА МАТЕРИАЛА ===
    const openCoverModal = (material: Material) => {
        setSelectedMaterialForCover(material);
        setCoverModalOpen(true);
    };

    const closeCoverModal = () => {
        setCoverModalOpen(false);
        setSelectedMaterialForCover(null);
    };

    const saveMaterialCover = async () => {
        if (!selectedMaterialForCover || !fileUploaderRef.current?.hasSelectedFile()) {
            closeCoverModal();
            return;
        }

        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            setCoverSaving(true);

            // Загружаем файл в R2
            const uploadResult = await fileUploaderRef.current.uploadFile();
            if (!uploadResult) {
                throw new Error('Не удалось загрузить файл');
            }

            const { filePath } = uploadResult;

            // Сохраняем путь в базе данных
            const { error } = await supabase
                .from('materials')
                .update({ cover_image_path: filePath })
                .eq('id', selectedMaterialForCover.id);

            if (error) throw error;

            setSuccess('Обложка материала успешно сохранена!');
            await loadMaterials();
            closeCoverModal();

        } catch (error: any) {
            console.error('Ошибка сохранения обложки материала:', error);
            setError(`Ошибка сохранения обложки: ${error.message}`);
        } finally {
            setCoverSaving(false);
        }
    };

    const deleteMaterialCover = async () => {
        if (!selectedMaterialForCover || !selectedMaterialForCover.cover_image_path) return;

        const confirmDelete = confirm('Вы уверены, что хотите удалить обложку материала? Файл будет удален из CloudFlare R2.');
        if (!confirmDelete) return;

        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            setCoverSaving(true);

            // Удаляем файл из CloudFlare R2
            await deleteFileFromR2(selectedMaterialForCover.cover_image_path);

            // Удаляем путь из базы данных
            const { error } = await supabase
                .from('materials')
                .update({ cover_image_path: null })
                .eq('id', selectedMaterialForCover.id);

            if (error) throw error;

            setSuccess('Обложка материала успешно удалена!');
            await loadMaterials();
            closeCoverModal();

        } catch (error: any) {
            console.error('Ошибка удаления обложки материала:', error);
            setError(`Ошибка удаления обложки: ${error.message}`);
        } finally {
            setCoverSaving(false);
        }
    };

    // === БЛОКИ ===
    const navigateToMaterialBlocks = (material: Material) => {
        setCurrentMaterialId(material.id);
        setCurrentMaterialName(material.name);
        setViewMode('blocks');
    };

    const navigateBackToMaterials = () => {
        setViewMode('materials');
        setCurrentMaterialId(null);
        setCurrentMaterialName('');
        setMaterialBlocks([]);
    };

    const handleOpenBlockModal = (block: MaterialBlock | null = null) => {
        if (block) {
            setEditingBlock(block);
            setBlockForm({
                title: block.title || '',
                block_type: block.block_type,
                content_text: block.content_text || '',
                content_url: block.content_url || '',
                order_num: block.order_num
            });
        } else {
            setEditingBlock(null);
            setBlockForm({
                title: '',
                block_type: 'text',
                content_text: '',
                content_url: '',
                order_num: materialBlocks.length + 1
            });
        }
        setBlockModalOpen(true);
        setSelectedFile(null);
        setUploadedFileUrl('');
        setError('');
        setSuccess('');
    };

    const handleCloseBlockModal = () => {
        setBlockModalOpen(false);
        setEditingBlock(null);
        setSelectedFile(null);
        setUploadedFileUrl('');
        setError('');
        setSuccess('');
    };

    const handleSaveBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setUpdateError(null);

        if (!currentMaterialId) {
            setError('Не выбран материал');
            return;
        }

        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            setUpdateLoading(true);

            // Если файл выбран но не загружен, загружаем его сначала
            let finalUploadedFileUrl = uploadedFileUrl;
            if (selectedFile && !uploadedFileUrl && blockFileUploaderRef.current) {
                const uploadResult = await blockFileUploaderRef.current.uploadFile();
                if (uploadResult) {
                    finalUploadedFileUrl = uploadResult.filePath;
                } else {
                    alert('Ошибка загрузки файла. Попробуйте еще раз.');
                    return;
                }
            }

            // Валидация КАК В УРОКАХ: блок должен иметь хотя бы текст или URL (для не-text типов)
            const hasText = blockForm.content_text && blockForm.content_text.trim();
            const hasUrl = (finalUploadedFileUrl || blockForm.content_url) && (finalUploadedFileUrl || blockForm.content_url.trim());

            if (blockForm.block_type === 'text') {
                if (!hasText) {
                    alert('Для текстового блока необходимо заполнить содержимое');
                    return;
                }
            } else {
                if (!hasText && !hasUrl) {
                    alert(`Для блока типа "${getBlockTypeLabel(blockForm.block_type)}" необходимо заполнить URL или описание`);
                    return;
                }
            }

            const blockData = {
                material_id: currentMaterialId,
                title: blockForm.title.trim() || null,
                block_type: blockForm.block_type,
                content_text: blockForm.content_text.trim() || null,
                content_url: (finalUploadedFileUrl || blockForm.content_url.trim()) || null,
                order_num: blockForm.order_num
            };

            if (editingBlock) {
                // Обновление
                const { error } = await supabase
                    .from('material_blocks')
                    .update(blockData)
                    .eq('id', editingBlock.id);

                if (error) throw error;
                setSuccess('Блок успешно обновлен!');
            } else {
                // Создание
                const { error } = await supabase
                    .from('material_blocks')
                    .insert(blockData);

                if (error) throw error;
                setSuccess('Блок успешно создан!');
            }

            await loadMaterialBlocks(currentMaterialId);
            setTimeout(() => {
                handleCloseBlockModal();
            }, 1000);

        } catch (err: any) {
            setError(`Ошибка сохранения: ${err.message}`);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDeleteBlock = async (blockId: number, title?: string) => {
        const blockName = title || 'Безымянный блок';
        if (!confirm(`Вы уверены, что хотите удалить блок "${blockName}"?`)) {
            return;
        }

        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);

            const { error } = await supabase
                .from('material_blocks')
                .delete()
                .eq('id', blockId);

            if (error) throw error;
            setSuccess('Блок успешно удален!');

            if (currentMaterialId) {
                await loadMaterialBlocks(currentMaterialId);
            }

        } catch (err: any) {
            setError(`Ошибка удаления: ${err.message}`);
        } finally {
            setUpdateLoading(false);
        }
    };

    // === ФАЙЛЫ для блоков ===
    const handleFileSelected = (file: File | null) => {
        setSelectedFile(file);
    };

    const handleFileUploadComplete = (filePath: string, fileUrl: string) => {
        setUploadedFileUrl(filePath);
        setSuccess('Файл успешно загружен!');
    };

    const handleFileUploadError = (error: string) => {
        setError(`Ошибка загрузки файла: ${error}`);
    };

    // === УТИЛИТЫ ===
    const getBlockTypeLabel = (type: string) => {
        const types: { [key: string]: string } = {
            'text': '📝 Текст',
            'video': '🎥 Видео',
            'audio': '🎵 Аудио',
            'image': '🖼️ Изображение',
            'pdf': '📄 PDF'
        };
        return types[type] || type;
    };

    const getMaterialTypeLabel = (type: string) => {
        const types: { [key: string]: string } = {
            'video': '🎥 Видео-материал',
            'audio': '🎵 Аудио-материал'
        };
        return types[type] || type;
    };

    const renderBlockContent = (block: MaterialBlock) => {
        const hasText = block.content_text && block.content_text.trim();
        const hasUrl = block.content_url && block.content_url.trim();

        switch (block.block_type) {
            case 'text':
                return (
                    <div className="block-content-preview">
                        {hasText ?
                            (block.content_text!.substring(0, 100) + (block.content_text!.length > 100 ? '...' : ''))
                            : <span className="empty-value">Нет текста</span>
                        }
                    </div>
                );
            case 'video':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🎥 {block.content_url!.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text!.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            case 'audio':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🔊 {block.content_url!.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text!.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            case 'image':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>🖼️ {block.content_url!.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text!.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            case 'pdf':
                return (
                    <div className="block-content-preview">
                        {hasUrl && <div>📄 {block.content_url!.substring(0, 40)}...</div>}
                        {hasText && <div>📝 {block.content_text!.substring(0, 60)}...</div>}
                        {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
                    </div>
                );
            default:
                return <span className="empty-value">Неизвестный тип</span>;
        }
    };

    // === ОБРАБОТКА БЛОКОВ - DRAG&DROP И ИНЛАЙН-РЕДАКТИРОВАНИЕ ===

    // Инлайн-редактирование порядка с debounce - КАК В УРОКАХ
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
        if (!supabase) {
            setUpdateError('Supabase не инициализирован');
            return;
        }

        try {
            // Просто обновляем порядок без проверки конфликтов
            const { error } = await supabase
                .from('material_blocks')
                .update({ order_num: newOrder })
                .eq('id', blockId);

            if (error) throw error;

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

    // Обработка drag & drop перестановки блоков - КАК В УРОКАХ
    const handleBlockReorder = async (draggedBlockId: number, targetBlockId: number) => {
        if (!supabase || !currentMaterialId) {
            setUpdateError('Supabase не инициализирован или материал не выбран');
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);

            // Находим блоки в текущем массиве
            const draggedBlock = materialBlocks.find(b => b.id === draggedBlockId);
            const targetBlock = materialBlocks.find(b => b.id === targetBlockId);

            if (!draggedBlock || !targetBlock) {
                throw new Error('Блоки не найдены');
            }

            // Создаем копию массива блоков для расчета новых позиций
            const sortedBlocks = [...materialBlocks].sort((a, b) => a.order_num - b.order_num);
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
                    updates.push(
                        supabase
                            .from('material_blocks')
                            .update({ order_num: newOrderNum })
                            .eq('id', reorderedBlocks[i].id)
                    );
                }
            }

            // Выполняем все обновления
            await Promise.all(updates);

            // Перезагружаем данные для отображения обновленного порядка
            await loadMaterialBlocks(currentMaterialId);

        } catch (error: any) {
            console.error('Ошибка при перестановке блоков:', error);
            setUpdateError(error.message || 'Произошла ошибка при перестановке блоков');
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="admin-section">
            {/* Хлебные крошки */}
            {viewMode === 'blocks' && (
                <div className="admin-breadcrumb">
                    <button
                        className="breadcrumb-link"
                        onClick={navigateBackToMaterials}
                    >
                        Дополнительные материалы
                    </button>
                    <span> / </span>
                    <span>{currentMaterialName}</span>
                </div>
            )}

            {/* Заголовок и кнопки */}
            <div className="section-header">
                <h2>
                    {viewMode === 'materials'
                        ? 'Дополнительные материалы'
                        : `Блоки материала: ${currentMaterialName}`
                    }
                </h2>
                <div>
                    {viewMode === 'materials' ? (
                        <button
                            className="admin-add-btn"
                            onClick={() => handleOpenMaterialModal()}
                        >
                            Добавить материал
                        </button>
                    ) : (
                        <>
                            <button
                                className="admin-button"
                                onClick={navigateBackToMaterials}
                                style={{ marginRight: '12px' }}
                            >
                                ← Назад к материалам
                            </button>
                            <button
                                className="admin-refresh-btn"
                                onClick={() => currentMaterialId && loadMaterialBlocks(currentMaterialId)}
                                disabled={updateLoading}
                            >
                                Обновить
                            </button>
                            <button
                                className="admin-add-btn"
                                onClick={() => handleOpenBlockModal()}
                            >
                                Добавить блок
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Уведомления */}
            {error && (
                <div className="admin-error" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}
            {success && (
                <div className="admin-warning" style={{ marginBottom: '20px', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
                    {success}
                </div>
            )}

            {/* ПАНЕЛЬ ФИЛЬТРОВ (только для материалов) */}
            {viewMode === 'materials' && (
                <div className="admin-toolbar" style={{ marginBottom: '20px' }}>
                    <div className="admin-filters">
                        <div className="admin-filter-group">
                            <label htmlFor="material-type-filter">Тип материала:</label>
                            <select
                                id="material-type-filter"
                                className="admin-input"
                                value={materialTypeFilter}
                                onChange={(e) => setMaterialTypeFilter(e.target.value)}
                                style={{ minWidth: '180px' }}
                            >
                                <option value="all">🌟 Все типы</option>
                                <option value="video">🎥 Видео-материалы</option>
                                <option value="audio">🎵 Аудио-материалы</option>
                            </select>
                        </div>
                        <div className="admin-filter-info" style={{ color: 'var(--admin-text-secondary)', fontSize: '14px' }}>
                            Показано: {filteredMaterials.length} из {materials.length} материалов
                        </div>
                    </div>
                </div>
            )}

            {/* СПИСОК МАТЕРИАЛОВ */}
            {viewMode === 'materials' && (
                <div className="admin-table">
                    {loading ? (
                        <div className="admin-loading">Загрузка материалов...</div>
                    ) : filteredMaterials.length === 0 ? (
                        <div className="empty-table">
                            {materials.length === 0
                                ? 'Материалы не найдены. Создайте первый материал!'
                                : 'Нет материалов, соответствующих выбранным фильтрам.'}
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Обложка</th>
                                    <th>Название</th>
                                    <th>Описание</th>
                                    <th>Тип</th>
                                    <th>Порядок</th>
                                    <th>Дата создания</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMaterials.map((material) => (
                                    <tr key={material.id}>
                                        <td>
                                            {material.cover_image_path ? (
                                                <img
                                                    src={buildImageUrl(material.cover_image_path)}
                                                    alt={material.name}
                                                    className="admin-image-preview"
                                                />
                                            ) : (
                                                <div className="admin-status">Нет обложки</div>
                                            )}
                                        </td>
                                        <td>{material.name}</td>
                                        <td>{material.description || <span className="empty-value">Нет описания</span>}</td>
                                        <td>{getMaterialTypeLabel(material.material_type)}</td>
                                        <td>{material.order_num}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                                            {formatDate(material.created_at)}
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => openCoverModal(material)}
                                                title="Редактировать обложку"
                                            >
                                                🖼️
                                            </button>
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleOpenMaterialModal(material)}
                                                title="Редактировать материал"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="action-btn"
                                                onClick={() => navigateToMaterialBlocks(material)}
                                                title="Управление блоками"
                                                style={{ background: 'rgba(75, 181, 67, 0.1)', color: '#4BB543' }}
                                            >
                                                📋
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteMaterial(material)}
                                                title="Удалить материал"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* СПИСОК БЛОКОВ */}
            {viewMode === 'blocks' && (
                <div className="admin-table">
                    {updateLoading ? (
                        <div className="admin-loading">Загрузка блоков...</div>
                    ) : materialBlocks.length === 0 ? (
                        <div className="empty-table">
                            Блоки не найдены. Добавьте первый блок материала.
                        </div>
                    ) : (
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
                                {materialBlocks.map((block) => (
                                    <DraggableMaterialBlockRow
                                        key={block.id}
                                        block={block}
                                        localOrderValues={localOrderValues}
                                        onOrderInputChange={handleOrderInputChange}
                                        getBlockTypeLabel={getBlockTypeLabel}
                                        renderBlockContent={renderBlockContent}
                                        onEdit={handleOpenBlockModal}
                                        onDelete={handleDeleteBlock}
                                        onReorder={handleBlockReorder}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* МОДАЛЬНОЕ ОКНО МАТЕРИАЛА */}
            {materialModalOpen && (
                <div className="admin-modal-backdrop" onClick={handleCloseMaterialModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={handleCloseMaterialModal}>×</button>
                        <h3>{editingMaterial ? 'Редактирование материала' : 'Создание материала'}</h3>

                        <form onSubmit={handleSaveMaterial}>
                            <div className="form-group">
                                <label>Название материала *</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={materialForm.name}
                                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                                    required
                                    placeholder="Введите название материала"
                                />
                            </div>

                            <div className="form-group">
                                <label>Описание</label>
                                <textarea
                                    className="admin-input"
                                    rows={3}
                                    value={materialForm.description}
                                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                                    placeholder="Краткое описание материала"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Тип материала *</label>
                                    <select
                                        className="admin-input"
                                        value={materialForm.material_type}
                                        onChange={(e) => setMaterialForm({ ...materialForm, material_type: e.target.value as 'video' | 'audio' })}
                                        required
                                    >
                                        <option value="video">🎥 Видео-материал</option>
                                        <option value="audio">🎵 Аудио-материал</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Порядковый номер *</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        value={materialForm.order_num}
                                        onChange={(e) => setMaterialForm({ ...materialForm, order_num: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="admin-button">
                                    {editingMaterial ? 'Сохранить изменения' : 'Создать материал'}
                                </button>
                                <button
                                    type="button"
                                    className="admin-button"
                                    onClick={handleCloseMaterialModal}
                                    style={{ background: 'var(--admin-danger)' }}
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* МОДАЛЬНОЕ ОКНО БЛОКА */}
            {blockModalOpen && (
                <div className="admin-modal-backdrop" onClick={handleCloseBlockModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={handleCloseBlockModal}>×</button>
                        <h3>{editingBlock ? 'Редактирование блока' : 'Создание блока'}</h3>

                        <form onSubmit={handleSaveBlock}>
                            <div className="form-group">
                                <label>Заголовок блока</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={blockForm.title}
                                    onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                                    placeholder="Введите заголовок (необязательно)"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Тип блока *</label>
                                    <select
                                        className="admin-input"
                                        value={blockForm.block_type}
                                        onChange={(e) => setBlockForm({ ...blockForm, block_type: e.target.value as any })}
                                        required
                                    >
                                        <option value="text">📝 Текст</option>
                                        <option value="video">🎥 Видео (Kinescope)</option>
                                        <option value="audio">🎵 Аудио (файл)</option>
                                        <option value="image">🖼️ Изображение (файл)</option>
                                        <option value="pdf">📄 PDF (файл)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Порядковый номер *</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        value={blockForm.order_num}
                                        onChange={(e) => setBlockForm({ ...blockForm, order_num: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Контент в зависимости от типа */}
                            {blockForm.block_type === 'text' ? (
                                <div className="form-group">
                                    <label>Текст блока *</label>
                                    <textarea
                                        className="admin-input"
                                        rows={6}
                                        value={blockForm.content_text}
                                        onChange={(e) => setBlockForm({ ...blockForm, content_text: e.target.value })}
                                        required
                                        placeholder="Введите текст блока"
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            ) : blockForm.block_type === 'video' ? (
                                <>
                                    <div className="form-group">
                                        <label>URL видео (Kinescope и др.):</label>
                                        <input
                                            className="admin-input"
                                            value={blockForm.content_url}
                                            onChange={(e) => setBlockForm({ ...blockForm, content_url: e.target.value })}
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
                                            value={blockForm.content_text}
                                            onChange={(e) => setBlockForm({ ...blockForm, content_text: e.target.value })}
                                            rows={3}
                                            placeholder="Введите описание к видео..."
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                </>
                            ) : (
                                // Для файлов (audio, image, pdf) - FileUploader + альтернативный URL + описание
                                <>
                                    <div className="form-group">
                                        <label>
                                            Загрузка файла ({getBlockTypeLabel(blockForm.block_type).toLowerCase()}):
                                        </label>
                                        {error && (
                                            <div className="admin-error" style={{ marginBottom: '12px' }}>
                                                {error}
                                            </div>
                                        )}
                                        <FileUploader
                                            ref={blockFileUploaderRef}
                                            onFileSelected={handleFileSelected}
                                            onUploadComplete={handleFileUploadComplete}
                                            onUploadError={handleFileUploadError}
                                            acceptedTypes={
                                                blockForm.block_type === 'audio' ? 'audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/m4a,audio/ogg,audio/aac,audio/flac' :
                                                    blockForm.block_type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml' :
                                                        blockForm.block_type === 'pdf' ? 'application/pdf' : '*/*'
                                            }
                                            filePrefix={
                                                blockForm.block_type === 'audio' ? 'audio/' :
                                                    blockForm.block_type === 'image' ? 'images/' :
                                                        blockForm.block_type === 'pdf' ? 'documents/' : 'documents/'
                                            }
                                            currentFileUrl={editingBlock?.content_url ? buildFileUrl(editingBlock.content_url) : undefined}
                                            disabled={updateLoading}
                                        />
                                        <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                                            💡 Или вставьте готовый URL файла:
                                        </small>
                                        <input
                                            className="admin-input"
                                            style={{ marginTop: '8px' }}
                                            value={blockForm.content_url}
                                            onChange={(e) => setBlockForm({ ...blockForm, content_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            {blockForm.block_type === 'image' ? 'Подпись к изображению' : 'Описание'} (опционально):
                                        </label>
                                        <textarea
                                            className="admin-input"
                                            value={blockForm.content_text}
                                            onChange={(e) => setBlockForm({ ...blockForm, content_text: e.target.value })}
                                            rows={3}
                                            placeholder={`Введите ${blockForm.block_type === 'image' ? 'подпись к изображению' : 'описание'}...`}
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="admin-button"
                                    disabled={
                                        updateLoading ||
                                        !blockForm.block_type ||
                                        (blockForm.block_type === 'text' && !blockForm.content_text.trim()) ||
                                        (blockForm.block_type !== 'text' && !blockForm.content_text.trim() && !blockForm.content_url.trim() && !uploadedFileUrl && !selectedFile)
                                    }
                                >
                                    {updateLoading ? 'Сохранение...' : (editingBlock ? 'Сохранить' : 'Добавить')}
                                </button>
                                <button
                                    type="button"
                                    className="admin-button"
                                    onClick={handleCloseBlockModal}
                                    disabled={updateLoading}
                                    style={{ background: 'var(--admin-danger)' }}
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* МОДАЛЬНОЕ ОКНО ОБЛОЖКИ МАТЕРИАЛА */}
            {coverModalOpen && (
                <div className="admin-modal-backdrop" onClick={closeCoverModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeCoverModal}>×</button>

                        <h3>Обложка материала: {selectedMaterialForCover?.name}</h3>

                        <div className="form-group">
                            <label>Текущая обложка:</label>
                            {selectedMaterialForCover?.cover_image_path ? (
                                <div style={{ marginBottom: '16px' }}>
                                    <img
                                        src={buildImageUrl(selectedMaterialForCover.cover_image_path)}
                                        alt="Текущая обложка материала"
                                        style={{
                                            width: '200px',
                                            height: '120px',
                                            borderRadius: '8px',
                                            objectFit: 'cover',
                                            border: '1px solid #e0e0e0'
                                        }}
                                        onError={(e) => {
                                            console.warn('Ошибка загрузки обложки материала:', selectedMaterialForCover.cover_image_path);
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                        {selectedMaterialForCover.cover_image_path}
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    width: '200px',
                                    height: '120px',
                                    borderRadius: '8px',
                                    background: '#f5f5f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                    color: '#999',
                                    border: '2px dashed #ddd'
                                }}>
                                    Обложка не установлена
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Загрузить новую обложку:</label>
                            <FileUploader
                                ref={fileUploaderRef}
                                onFileSelected={() => { }} // Не нужно в этом случае
                                onUploadError={(error) => setError(`Ошибка загрузки: ${error}`)}
                                acceptedTypes="image/*"
                                filePrefix={FILE_PREFIXES.IMAGE}
                                currentFileUrl={selectedMaterialForCover?.cover_image_path ? buildImageUrl(selectedMaterialForCover.cover_image_path) : undefined}
                                disabled={coverSaving}
                            />
                            <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                                💡 Поддерживаются форматы: JPG, PNG, WEBP. Рекомендуемый размер: 380x190px<br />
                                📐 Соотношение 2:1 идеально для карточек материалов
                            </small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="admin-button"
                                onClick={saveMaterialCover}
                                disabled={coverSaving}
                            >
                                {coverSaving ? 'Сохранение...' : 'Сохранить обложку'}
                            </button>

                            {selectedMaterialForCover?.cover_image_path && (
                                <button
                                    type="button"
                                    className="admin-button"
                                    style={{ background: 'var(--admin-danger)' }}
                                    onClick={deleteMaterialCover}
                                    disabled={coverSaving}
                                >
                                    Удалить обложку
                                </button>
                            )}

                            <button
                                type="button"
                                className="admin-button"
                                style={{ background: 'var(--admin-secondary)' }}
                                onClick={closeCoverModal}
                                disabled={coverSaving}
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

export default MaterialsManager; 