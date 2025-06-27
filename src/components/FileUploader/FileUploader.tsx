import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { uploadFile, buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { FilePrefix, FILE_PREFIXES } from '@/lib/supabase/storage_prefixes';

interface FileUploaderProps {
    onFileSelected: (file: File | null) => void;
    onUploadComplete?: (filePath: string, fileUrl: string) => void;
    onUploadError?: (error: string) => void;
    onDelete?: () => Promise<void>;
    acceptedTypes?: string;
    filePrefix?: FilePrefix;
    currentFileUrl?: string;
    disabled?: boolean;
    className?: string;
    showDeleteButton?: boolean;
}

export interface FileUploaderRef {
    uploadFile: () => Promise<{ filePath: string, fileUrl: string } | null>;
    clearFile: () => void;
    hasSelectedFile: () => boolean;
    isUploading: () => boolean;
}

export const FileUploader = forwardRef<FileUploaderRef, FileUploaderProps>(({
    onFileSelected,
    onUploadComplete,
    onUploadError,
    onDelete,
    acceptedTypes = "*/*",
    filePrefix,
    currentFileUrl,
    disabled = false,
    className = "",
    showDeleteButton = true
}, ref) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Публичная функция для загрузки файла (вызывается снаружи при сохранении)
    const handleUpload = async (): Promise<{ filePath: string, fileUrl: string } | null> => {
        if (!selectedFile) return null;

        try {
            setUploading(true);

            const effectivePrefix = filePrefix || FILE_PREFIXES.DOCUMENT;
            const filePath = await uploadFile(selectedFile, effectivePrefix);
            const fileUrl = buildFileUrl(filePath) || '';

            onUploadComplete?.(filePath, fileUrl);
            return { filePath, fileUrl };

        } catch (error: any) {
            console.error('Ошибка загрузки файла:', error);
            onUploadError?.(error.message || 'Произошла ошибка при загрузке файла');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        onFileSelected(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const hasSelectedFile = () => !!selectedFile;
    const isUploadingFile = () => uploading;

    // Экспортируем функции через ref
    useImperativeHandle(ref, () => ({
        uploadFile: handleUpload,
        clearFile,
        hasSelectedFile,
        isUploading: isUploadingFile
    }));



    const handleFileSelect = (file: File | null) => {
        setSelectedFile(file);
        onFileSelected(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleFileSelect(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files[0] || null;
        handleFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const openFileDialog = () => {
        if (!disabled && !uploading) {
            fileInputRef.current?.click();
        }
    };

    // Определяем что показывать в превью
    const getPreviewSource = () => {
        if (selectedFile) {
            return URL.createObjectURL(selectedFile);
        }
        return currentFileUrl;
    };

    const getFileTypeFromSource = (source: string | File): string => {
        if (selectedFile) {
            const type = selectedFile.type.toLowerCase();
            if (type.startsWith('image/')) return 'image';
            if (type.startsWith('audio/')) return 'audio';
            if (type === 'application/pdf') return 'pdf';
            return 'file';
        }

        if (typeof source === 'string') {
            if (source.includes('/images/') || source.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
                return 'image';
            }
            if (source.includes('/audio/') || source.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i)) {
                return 'audio';
            }
            if (source.includes('/documents/') || source.match(/\.(pdf)$/i)) {
                return 'pdf';
            }
        }
        return 'file';
    };

    const renderPreview = () => {
        const previewSource = getPreviewSource();
        if (!previewSource) return null;

        const fileType = getFileTypeFromSource(previewSource);
        const isNewFile = !!selectedFile;

        return (
            <div className="file-preview" style={{ marginTop: '12px' }}>
                {isNewFile && (
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                        📄 Новый файл: {selectedFile?.name} (будет загружен при сохранении)
                    </div>
                )}

                {fileType === 'image' && (
                    <img
                        src={previewSource}
                        alt="Превью изображения"
                        style={{
                            maxWidth: '200px',
                            maxHeight: '120px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid var(--admin-border)'
                        }}
                    />
                )}

                {fileType === 'audio' && (
                    <audio
                        controls
                        style={{ width: '100%', maxWidth: '300px' }}
                        src={previewSource}
                    >
                        Ваш браузер не поддерживает аудио элемент.
                    </audio>
                )}

                {fileType === 'pdf' && (
                    <div style={{
                        padding: '12px',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '8px',
                        background: 'var(--admin-bg-lighter)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        📄 PDF файл
                        {!isNewFile && (
                            <a
                                href={previewSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: 'var(--admin-primary)',
                                    textDecoration: 'none'
                                }}
                            >
                                Открыть
                            </a>
                        )}
                    </div>
                )}

                {fileType === 'file' && (
                    <div style={{
                        padding: '12px',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '8px',
                        background: 'var(--admin-bg-lighter)'
                    }}>
                        📎 {selectedFile?.name || 'Файл'}
                    </div>
                )}

                {/* Кнопка очистки/удаления */}
                {showDeleteButton && selectedFile && (
                    <button
                        type="button"
                        onClick={async () => {
                            // Если выбран новый файл - просто очищаем
                            clearFile();
                        }}
                        style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: 'var(--admin-danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Очистить
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={`file-uploader ${className}`}>
            {/* Скрытый input для выбора файлов */}
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileInputChange}
                disabled={disabled || uploading}
                style={{ display: 'none' }}
            />

            {/* Зона drag & drop */}
            <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''} ${disabled || uploading ? 'disabled' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={openFileDialog}
                style={{
                    border: `2px dashed ${dragOver ? 'var(--admin-primary)' : 'var(--admin-border)'}`,
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: disabled || uploading ? 'not-allowed' : 'pointer',
                    backgroundColor: dragOver ? 'var(--admin-bg-lighter)' : 'transparent',
                    transition: 'all 0.2s ease'
                }}
            >
                {uploading ? (
                    <div>⏳ Загрузка файла...</div>
                ) : (
                    <div>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                        <div>Перетащите файл сюда или нажмите для выбора</div>
                        {acceptedTypes !== "*/*" && (
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                Поддерживаемые типы: {acceptedTypes}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Превью текущего файла */}
            {renderPreview()}
        </div>
    );
});

FileUploader.displayName = 'FileUploader'; 