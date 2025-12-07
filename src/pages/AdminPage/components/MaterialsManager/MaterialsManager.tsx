import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileUploader, FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { deleteFile } from '@/lib/supabase/supabaseStorageService';
import { FILE_PREFIXES } from '@/lib/supabase/storage_prefixes';
import { supabase } from '../../../../lib/supabase/client';
import DraggableMaterialBlockRow from './DraggableMaterialBlockRow';
import DraggableMaterialRow from './DraggableMaterialRow';
import { useTariffsAdmin, useMaterialTariffAccess, useCoursesAdmin } from '@/lib/supabase/hooks';
import { generateWaveformData } from '@/lib/audio/waveformGenerator';
import { VideoSelect } from '@/components/VideoSelect';

// Объединенный тип Material (materials + techniques)
interface Material {
    id: string; // uuid
    name: string;
    description?: string | null;
    cover_image_path?: string | null;
    material_type: 'video' | 'audio';
    order_num: number;
    course_id?: string | null;
    release_date?: string | null;

    // Поля от techniques
    audio_url?: string | null;
    animation_url?: string | null; // URL mp4 анимации для плеера
    duration_seconds?: number | null;
    status?: 'free' | 'paid' | 'default';
    purchase_url?: string | null;
    upgrade_tariff_chat_url?: string | null;
    available_from_module?: string | null;
    unlock_condition_type?: 'after_material' | 'after_duration' | null;
    unlock_condition_value?: any | null;
    is_standalone?: boolean;
    is_special?: boolean; // Для специальных пакетов

    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

interface MaterialBlock {
    id: number; // bigserial
    material_id: string; // uuid
    order_num: number;
    title?: string | null;
    block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf' | 'material';
    content_text?: string | null;
    content_url?: string | null;
    meta_json?: any | null; // jsonb для метаданных (например, audio_data)
    created_at: string; // timestamptz
}

type ViewMode = 'materials' | 'blocks';

interface MaterialFormData {
    name: string;
    description: string;
    material_type: 'video' | 'audio';
    order_num: number;
    course_id: string;
    release_date: string;

    // Поля от techniques
    audio_url: string;
    animation_url: string | null; // URL mp4 анимации для плеера
    duration_seconds: number | null;
    status: 'free' | 'paid' | 'default';
    purchase_url: string;
    upgrade_tariff_chat_url: string;
    available_from_module: string;
    unlock_condition_type: 'after_material' | 'after_duration' | null;
    unlock_condition_material_id: string;
    unlock_condition_duration_days: number;
    is_standalone: boolean;
    is_special: boolean; // Для специальных пакетов
}

interface BlockFormData {
    title: string;
    block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf' | 'material';
    content_text: string;
    content_url: string;
    material_id?: string;
    order_num: number;
}

const MaterialsManager: React.FC = () => {
    const queryClient = useQueryClient();
    const fileUploaderRef = useRef<FileUploaderRef>(null);
    const tariffsAdmin = useTariffsAdmin();
    const coursesAdmin = useCoursesAdmin();
    const blockFileUploaderRef = useRef<FileUploaderRef>(null);

    // Материалы
    const [materials, setMaterials] = useState<Material[]>([]);
    const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
    const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
    const [courseFilter, setCourseFilter] = useState<string>('all');

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

    // Хук для работы с доступами тарифов к материалу
    const materialTariffAccess = useMaterialTariffAccess(editingMaterial?.id || null);

    // Формы
    const [materialForm, setMaterialForm] = useState<MaterialFormData>({
        name: '',
        description: '',
        material_type: 'video',
        order_num: 1,
        course_id: '',
        release_date: new Date().toISOString().split('T')[0],

        // Поля от techniques
        audio_url: '',
        animation_url: null,
        duration_seconds: null,
        status: 'default',
        purchase_url: '',
        upgrade_tariff_chat_url: '',
        available_from_module: '',
        unlock_condition_type: null,
        unlock_condition_material_id: '',
        unlock_condition_duration_days: 30,
        is_standalone: false,
        is_special: false,
    });

    // Состояние для выбранных тарифов
    const [selectedTariffIds, setSelectedTariffIds] = useState<string[]>([]);

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

    // Ref для загрузчика аудио в модальном окне материала
    const materialAudioUploaderRef = useRef<FileUploaderRef>(null);
    const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);

    // Загрузка и ошибки
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [coverSaving, setCoverSaving] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [isBlockSaveDisabled, setIsBlockSaveDisabled] = useState(true);

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
    }, [materials, materialTypeFilter, courseFilter]);

    // Синхронизируем выбранные тарифы с данными из хука
    useEffect(() => {
        if (materialTariffAccess.accessibleTariffIds) {
            setSelectedTariffIds(materialTariffAccess.accessibleTariffIds);
        }
    }, [materialTariffAccess.accessibleTariffIds]);

    // Определяем, должна ли кнопка сохранения блока быть неактивной
    useEffect(() => {
        const { block_type, content_text, content_url } = blockForm;
        const hasFile = !!selectedFile;
        const hasExistingUrl = editingBlock?.content_url;

        if (block_type === 'text') {
            // Для текстового блока нужен хотя бы заголовок или контент
            const hasTitle = blockForm.title && blockForm.title.trim();
            setIsBlockSaveDisabled(!content_text.trim() && !hasTitle);
        } else if (block_type === 'video') {
            // Для видео нужен хотя бы URL или описание
            const hasUrl = content_url.trim();
            const hasText = content_text.trim();
            setIsBlockSaveDisabled(!hasUrl && !hasText);
        } else {
            // Для файловых блоков (audio, image, pdf) нужен только файл/URL, описание опционально
            const hasUrl = content_url.trim();
            setIsBlockSaveDisabled(!hasUrl && !hasFile && !hasExistingUrl);
        }

    }, [blockForm, editingBlock, selectedFile]);

    // Фильтрация материалов
    const filterMaterials = () => {
        let filtered = [...materials];

        if (materialTypeFilter !== 'all') {
            filtered = filtered.filter(material => material.material_type === materialTypeFilter);
        }

        if (courseFilter !== 'all') {
            filtered = filtered.filter(material => material.course_id === courseFilter);
        }

        setFilteredMaterials(filtered);
    };

    // Обработчик изменения чекбоксов тарифов
    const handleTariffCheckboxChange = (tariffId: string, checked: boolean) => {
        setSelectedTariffIds(prev => {
            if (checked) {
                return [...prev, tariffId];
            } else {
                return prev.filter(id => id !== tariffId);
            }
        });
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
                order_num: material.order_num,
                course_id: material.course_id || '',
                release_date: material.release_date ? new Date(material.release_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],

                // Поля от techniques
                audio_url: material.audio_url || '',
                animation_url: material.animation_url || null,
                duration_seconds: material.duration_seconds || null,
                // Маппинг старых статусов на новые
                status: material.status === 'purchasable' ? 'paid'
                    : material.status === 'locked' ? 'default'
                    : (material.status as 'free' | 'paid' | 'default') || 'default',
                purchase_url: material.purchase_url || '',
                upgrade_tariff_chat_url: material.upgrade_tariff_chat_url || '',
                available_from_module: material.available_from_module || '',
                unlock_condition_type: material.unlock_condition_type || null,
                unlock_condition_material_id: material.unlock_condition_value?.material_id || '',
                unlock_condition_duration_days: material.unlock_condition_value?.duration_days || 30,
                is_standalone: material.is_standalone || false,
                is_special: material.is_special || false,
            });
        } else {
            setEditingMaterial(null);
            setSelectedTariffIds([]); // Сбрасываем тарифы для нового материала
            setMaterialForm({
                name: '',
                description: '',
                material_type: 'video',
                order_num: materials.length + 1,
                course_id: coursesAdmin.courses.length > 0 ? coursesAdmin.courses[0].id : '',
                release_date: new Date().toISOString().split('T')[0],

                // Поля от techniques (defaults для нового материала)
                audio_url: '',
                animation_url: null,
                duration_seconds: null,
                status: 'default',
                purchase_url: '',
                upgrade_tariff_chat_url: '',
                available_from_module: '',
                unlock_condition_type: null,
                unlock_condition_material_id: '',
                unlock_condition_duration_days: 30,
                is_standalone: false,
                is_special: false,
            });
        }
        setMaterialModalOpen(true);
        setError('');
        setSuccess('');
    };

    const handleCloseMaterialModal = () => {
        setMaterialModalOpen(false);
        setEditingMaterial(null);
        setSelectedTariffIds([]);
        setSelectedAudioFile(null);
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
            // Если выбран аудио файл, загружаем его
            let finalAudioUrl = materialForm.audio_url.trim() || null;
            if (selectedAudioFile && materialAudioUploaderRef.current?.hasSelectedFile()) {
                const uploadResult = await materialAudioUploaderRef.current.uploadFile();
                if (uploadResult && uploadResult.filePath) {
                    finalAudioUrl = uploadResult.filePath;
                } else {
                    setError('Ошибка загрузки аудио файла');
                    return;
                }
            }

            const materialData: any = {
                name: materialForm.name.trim(),
                description: materialForm.description.trim() || null,
                material_type: materialForm.material_type,
                order_num: materialForm.order_num || 1,
                course_id: materialForm.course_id || null,
                release_date: materialForm.release_date ? new Date(materialForm.release_date).toISOString() : null,

                // Поля от techniques
                audio_url: finalAudioUrl,
                animation_url: materialForm.animation_url || null,
                duration_seconds: materialForm.duration_seconds,
                status: materialForm.status,
                purchase_url: materialForm.purchase_url.trim() || null,
                upgrade_tariff_chat_url: materialForm.upgrade_tariff_chat_url.trim() || null,
                available_from_module: materialForm.available_from_module.trim() || null,
                unlock_condition_type: materialForm.unlock_condition_type,
                unlock_condition_value: materialForm.unlock_condition_type === 'after_material' || materialForm.unlock_condition_type === 'after_duration'
                    ? {
                        material_id: materialForm.unlock_condition_material_id || undefined,
                        duration_days: materialForm.unlock_condition_duration_days || undefined,
                    }
                    : null,
                // is_standalone автоматически определяется по статусу:
                // paid или free = standalone (показывается в библиотеке)
                // default = НЕ standalone (только через модули/пакеты)
                is_standalone: materialForm.status === 'paid' || materialForm.status === 'free',
                is_special: materialForm.is_special,
            };

            let materialId: string;

            if (editingMaterial) {
                // Обновление (БЕЗ обложки - она обновляется отдельно)
                const { error } = await supabase
                    .from('materials')
                    .update(materialData)
                    .eq('id', editingMaterial.id);

                if (error) throw error;
                materialId = editingMaterial.id;
                setSuccess('Материал успешно обновлен!');
            } else {
                // Создание (БЕЗ обложки - она добавляется отдельно)
                const { data, error } = await supabase
                    .from('materials')
                    .insert(materialData)
                    .select('id')
                    .single();

                if (error) throw error;
                materialId = data.id;
                setSuccess('Материал успешно создан!');
            }

            // Сохраняем доступы тарифов
            if (materialTariffAccess.saveTariffAccess) {
                await materialTariffAccess.saveTariffAccess(selectedTariffIds);
            }

            // Обновляем локальное состояние материалов
            if (editingMaterial) {
                // Для редактирования - обновляем существующий материал
                setMaterials(prev => prev.map(material =>
                    material.id === editingMaterial.id
                        ? { ...material, ...materialData }
                        : material
                ).sort((a, b) => a.order_num - b.order_num));
            } else {
                // Для создания - добавляем новый материал
                setMaterials(prev => [...prev, {
                    id: materialId,
                    ...materialData,
                    created_at: new Date().toISOString()
                }].sort((a, b) => a.order_num - b.order_num));
            }

            // Инвалидируем кэш специальных техник (для SpecialBundlesManager)
            queryClient.invalidateQueries({ queryKey: ['special-techniques-for-bundles'] });

            // Сразу закрываем модальное окно
            handleCloseMaterialModal();

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

            // Обновляем локальное состояние - удаляем материал
            setMaterials(prev => prev.filter(mat => mat.id !== material.id));

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

            // Обновляем локальное состояние - обновляем обложку материала
            setMaterials(prev => prev.map(material =>
                material.id === selectedMaterialForCover.id
                    ? { ...material, cover_image_path: filePath }
                    : material
            ));

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
            await deleteFile(selectedMaterialForCover.cover_image_path);

            // Удаляем путь из базы данных
            const { error } = await supabase
                .from('materials')
                .update({ cover_image_path: null })
                .eq('id', selectedMaterialForCover.id);

            if (error) throw error;

            setSuccess('Обложка материала успешно удалена!');

            // Обновляем локальное состояние - убираем обложку материала
            setMaterials(prev => prev.map(material =>
                material.id === selectedMaterialForCover.id
                    ? { ...material, cover_image_path: null }
                    : material
            ));

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

            let finalContentUrl = blockForm.content_url.trim() || null;

            // Если выбран новый файл, загружаем его и используем его путь
            if (selectedFile) {
                const uploadResult = await blockFileUploaderRef.current?.uploadFile();
                if (uploadResult && uploadResult.filePath) {
                    finalContentUrl = uploadResult.filePath;
                } else {
                    alert('Ошибка загрузки файла. Попробуйте еще раз.');
                    setUpdateLoading(false);
                    return;
                }
            }

            let blockData: any = {
                material_id: currentMaterialId,
                title: blockForm.title.trim() || '',
                block_type: blockForm.block_type,
                content_text: blockForm.content_text.trim() || '',
                content_url: finalContentUrl,
                order_num: blockForm.order_num
            };

            // Если это аудио блок с URL, генерируем данные волны
            if (blockForm.block_type === 'audio' && finalContentUrl) {
                try {
                    const audioUrl = buildFileUrl(finalContentUrl);
                    if (audioUrl) {
                        console.log('Генерируем волну для аудио материала:', audioUrl);
                        const waveformData = await generateWaveformData(audioUrl);

                        // Добавляем audio_data в meta_json
                        blockData.meta_json = {
                            audio_data: waveformData
                        };
                        console.log('Данные волны сгенерированы для материала:', waveformData);
                    }
                } catch (waveformError) {
                    console.error('Не удалось сгенерировать волну для материала:', waveformError);
                    // Продолжаем без волны
                }
            }

            if (editingBlock) {
                // Обновление - проверяем, изменился ли URL
                if (blockForm.block_type === 'audio' && finalContentUrl && editingBlock.content_url !== finalContentUrl) {
                    // URL изменился, генерируем новую волну (уже сделано выше)
                } else if (editingBlock.meta_json && !blockData.meta_json) {
                    // Сохраняем существующие метаданные если не генерировали новые
                    blockData.meta_json = editingBlock.meta_json;
                }

                const { error } = await supabase
                    .from('material_blocks')
                    .update(blockData)
                    .eq('id', editingBlock.id);

                if (error) throw error;
                setSuccess('Блок успешно обновлен!');

                // Обновляем локальное состояние - существующий блок
                setMaterialBlocks(prev => prev.map(block =>
                    block.id === editingBlock.id
                        ? { ...block, ...blockData }
                        : block
                ).sort((a, b) => a.order_num - b.order_num));
            } else {
                // Создание - получаем ID из ответа БД
                const { data: newBlockData, error: insertError } = await supabase
                    .from('material_blocks')
                    .insert(blockData)
                    .select()
                    .single();

                if (insertError) throw insertError;
                setSuccess('Блок успешно создан!');

                // Обновляем локальное состояние - добавляем новый блок
                setMaterialBlocks(prev => [...prev, newBlockData].sort((a, b) => a.order_num - b.order_num));
            }

            // Сразу закрываем модальное окно
            handleCloseBlockModal();

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

            // Обновляем локальное состояние - удаляем блок
            setMaterialBlocks(prev => prev.filter(block => block.id !== blockId));

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
            case 'material':
                return (
                    <div className="block-content-preview">
                        <div>📚 Материал из библиотеки</div>
                        {hasText && <div>📝 {block.content_text!.substring(0, 60)}...</div>}
                        {!hasText && <span className="empty-value">Нет описания</span>}
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

    // === ОБРАБОТКА МАТЕРИАЛОВ - DRAG&DROP ===
    const handleMaterialReorder = async (draggedMaterialId: string, targetMaterialId: string) => {
        if (!supabase) {
            setError('Supabase не инициализирован');
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Находим материалы в текущем массиве
            const draggedMaterial = materials.find(m => m.id === draggedMaterialId);
            const targetMaterial = materials.find(m => m.id === targetMaterialId);

            if (!draggedMaterial || !targetMaterial) {
                throw new Error('Материалы не найдены');
            }

            // Создаем копию массива материалов для расчета новых позиций
            const sortedMaterials = [...materials].sort((a, b) => a.order_num - b.order_num);
            const draggedIndex = sortedMaterials.findIndex(m => m.id === draggedMaterialId);
            const targetIndex = sortedMaterials.findIndex(m => m.id === targetMaterialId);

            if (draggedIndex === -1 || targetIndex === -1) {
                throw new Error('Индексы материалов не найдены');
            }

            // Перемещаем элемент в новую позицию
            const reorderedMaterials = [...sortedMaterials];
            const [movedMaterial] = reorderedMaterials.splice(draggedIndex, 1);
            reorderedMaterials.splice(targetIndex, 0, movedMaterial);

            // Обновляем order_num для всех затронутых материалов
            const updates = [];
            for (let i = 0; i < reorderedMaterials.length; i++) {
                const newOrderNum = i + 1;
                if (reorderedMaterials[i].order_num !== newOrderNum) {
                    updates.push(
                        supabase
                            .from('materials')
                            .update({ order_num: newOrderNum })
                            .eq('id', reorderedMaterials[i].id)
                    );
                }
            }

            // Выполняем все обновления
            await Promise.all(updates);

            // Перезагружаем данные для отображения обновленного порядка
            await loadMaterials();

        } catch (error: any) {
            console.error('Ошибка при перестановке материалов:', error);
            setError(error.message || 'Произошла ошибка при перестановке материалов');
        } finally {
            setLoading(false);
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
                        Библиотека
                    </button>
                    <span> / </span>
                    <span>{currentMaterialName}</span>
                </div>
            )}

            {/* Заголовок и кнопки */}
            <div className="section-header">
                <h2>
                    {viewMode === 'materials'
                        ? 'Библиотека'
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
                            <label htmlFor="course-filter">Курс:</label>
                            <select
                                id="course-filter"
                                className="admin-input"
                                value={courseFilter}
                                onChange={(e) => setCourseFilter(e.target.value)}
                                style={{ minWidth: '200px' }}
                            >
                                <option value="all">🌟 Все курсы</option>
                                {coursesAdmin.courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                                    <th>Курс</th>
                                    <th>Тип</th>
                                    <th>Дата открытия</th>
                                    <th>Порядок</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMaterials.map((material) => (
                                    <DraggableMaterialRow
                                        key={material.id}
                                        material={material}
                                        getMaterialTypeLabel={getMaterialTypeLabel}
                                        formatDate={formatDate}
                                        onEdit={handleOpenMaterialModal}
                                        onEditCover={openCoverModal}
                                        onManageBlocks={navigateToMaterialBlocks}
                                        onDelete={handleDeleteMaterial}
                                        onReorder={handleMaterialReorder}
                                        courses={coursesAdmin.courses}
                                    />
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

                            </div>

                            {/* Аудио и анимация */}
                            <div style={{
                                marginTop: '24px',
                                padding: '20px',
                                backgroundColor: 'var(--admin-bg-lighter)',
                                borderRadius: '12px',
                                border: '1px solid var(--admin-border)'
                            }}>
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                                        Аудио файл
                                    </label>
                                    <FileUploader
                                        ref={materialAudioUploaderRef}
                                        onFileSelected={(file) => setSelectedAudioFile(file)}
                                        onUploadError={(error) => setError(`Ошибка загрузки аудио: ${error}`)}
                                        acceptedTypes="audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/m4a,audio/aac,audio/flac"
                                        filePrefix={FILE_PREFIXES.AUDIO}
                                        currentFileUrl={materialForm.audio_url ? buildFileUrl(materialForm.audio_url) || undefined : undefined}
                                        disabled={false}
                                    />

                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        backgroundColor: 'var(--admin-bg)',
                                        borderRadius: '8px'
                                    }}>
                                        <label style={{ fontSize: '13px', color: '#666', marginBottom: '8px', display: 'block' }}>
                                            Или вставьте ссылку вручную:
                                        </label>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={materialForm.audio_url}
                                            onChange={(e) => setMaterialForm({ ...materialForm, audio_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <VideoSelect
                                        value={materialForm.animation_url}
                                        onChange={(url) => setMaterialForm({ ...materialForm, animation_url: url })}
                                        label="Анимация для плеера (MP4)"
                                    />
                                    <small style={{ color: '#888', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                                        Видео будет проигрываться на фоне аудио плеера
                                    </small>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Длительность (секунды)</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        value={materialForm.duration_seconds || ''}
                                        onChange={(e) => setMaterialForm({ ...materialForm, duration_seconds: e.target.value ? parseInt(e.target.value) : null })}
                                        placeholder="120"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Статус доступа</label>
                                    <select
                                        className="admin-input"
                                        value={materialForm.status}
                                        onChange={(e) => setMaterialForm({ ...materialForm, status: e.target.value as 'free' | 'paid' | 'default' })}
                                    >
                                        <option value="default">📦 По умолчанию (только через модули/пакеты)</option>
                                        <option value="paid">💰 Платная (в библиотеке, требует оплаты)</option>
                                        <option value="free">🎁 Бесплатная (в библиотеке, доступна всем)</option>
                                    </select>
                                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        {materialForm.status === 'default' && 'Техника доступна только через модули, пакеты или специальные пакеты. Не показывается в библиотеке отдельно.'}
                                        {materialForm.status === 'paid' && 'Техника показывается в библиотеке. Требуется отметка оплаты в карточке ученика.'}
                                        {materialForm.status === 'free' && 'Техника показывается в библиотеке. Доступна всем пользователям.'}
                                    </small>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>URL для покупки</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={materialForm.purchase_url}
                                    onChange={(e) => setMaterialForm({ ...materialForm, purchase_url: e.target.value })}
                                    placeholder="https://..."
                                />
                                <small style={{ color: '#666', fontSize: '12px' }}>
                                    Ссылка на страницу покупки (для purchasable материалов)
                                </small>
                            </div>

                            <div className="form-group">
                                <label>URL чата с отделом продаж</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={materialForm.upgrade_tariff_chat_url}
                                    onChange={(e) => setMaterialForm({ ...materialForm, upgrade_tariff_chat_url: e.target.value })}
                                    placeholder="https://t.me/..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-inline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        className="admin-checkbox"
                                        checked={materialForm.is_special}
                                        onChange={(e) => setMaterialForm({ ...materialForm, is_special: e.target.checked })}
                                    />
                                    <span>Специальная техника</span>
                                </label>
                                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                    Если отмечено, техника может быть добавлена в специальные пакеты
                                </small>
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
                                        <option value="material">📚 Материал</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Порядковый номер *</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={blockForm.order_num === 0 ? '' : blockForm.order_num}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Разрешаем только цифры
                                            if (value === '' || /^\d+$/.test(value)) {
                                                setBlockForm({ ...blockForm, order_num: value === '' ? 0 : parseInt(value) });
                                            }
                                        }}
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
                                                blockForm.block_type === 'audio' ? 'audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/m4a,audio/aac,audio/flac' :
                                                    blockForm.block_type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml' :
                                                        blockForm.block_type === 'pdf' ? 'application/pdf' : '*/*'
                                            }
                                            filePrefix={
                                                blockForm.block_type === 'audio' ? FILE_PREFIXES.AUDIO :
                                                    blockForm.block_type === 'image' ? FILE_PREFIXES.IMAGE :
                                                        blockForm.block_type === 'pdf' ? FILE_PREFIXES.DOCUMENT : FILE_PREFIXES.DOCUMENT
                                            }
                                            currentFileUrl={editingBlock?.content_url ? buildFileUrl(editingBlock.content_url) || undefined : undefined}
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
                                    disabled={isBlockSaveDisabled || updateLoading}
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
                                        src={buildFileUrl(selectedMaterialForCover.cover_image_path) || ''}
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
                                currentFileUrl={buildFileUrl(selectedMaterialForCover?.cover_image_path) || undefined}
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