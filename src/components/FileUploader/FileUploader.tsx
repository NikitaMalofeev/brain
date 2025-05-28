import React, { useState, useRef } from 'react';
import { uploadFileToR2, buildFileUrl, getFilePrefixByType, FILE_PREFIXES, FilePrefix } from '@/lib/cloudflareR2Service';

interface FileUploaderProps {
    onUploadComplete: (filePath: string, fileUrl: string) => void;
    onUploadError: (error: string) => void;
    acceptedTypes?: string; // MIME types (например: "image/*" или "audio/*,image/*")
    filePrefix?: FilePrefix; // Принудительно указать префикс
    currentFileUrl?: string; // Текущий URL файла для превью
    disabled?: boolean;
    className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
    onUploadComplete,
    onUploadError,
    acceptedTypes = "*/*",
    filePrefix,
    currentFileUrl,
    disabled = false,
    className = ""
}) => {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        try {
            setUploading(true);

            // Определяем префикс для файла
            const effectivePrefix = filePrefix || getFilePrefixByType(file);

            // Загружаем файл в R2
            const filePath = await uploadFileToR2(file, effectivePrefix);

            // Строим публичный URL
            const fileUrl = buildFileUrl(filePath);

            // Уведомляем родительский компонент
            onUploadComplete(filePath, fileUrl);

        } catch (error: any) {
            console.error('Ошибка загрузки файла:', error);
            onUploadError(error.message || 'Произошла ошибка при загрузке файла');
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
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

    // Определяем тип файла по префиксу или URL для отображения превью
    const getFileTypeFromUrl = (url: string): string => {
        if (url.includes('/images/') || url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
            return 'image';
        }
        if (url.includes('/audio/') || url.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i)) {
            return 'audio';
        }
        if (url.includes('/documents/') || url.match(/\.(pdf)$/i)) {
            return 'pdf';
        }
        return 'unknown';
    };

    const renderPreview = () => {
        if (!currentFileUrl) return null;

        const fileType = getFileTypeFromUrl(currentFileUrl);

        switch (fileType) {
            case 'image':
                return (
                    <div className="file-preview">
                        <img
                            src={currentFileUrl}
                            alt="Превью изображения"
                            style={{
                                maxWidth: '200px',
                                maxHeight: '120px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid var(--admin-border)'
                            }}
                        />
                    </div>
                );
            case 'audio':
                return (
                    <div className="file-preview">
                        <audio
                            controls
                            style={{ width: '100%', maxWidth: '300px' }}
                            src={currentFileUrl}
                        >
                            Ваш браузер не поддерживает аудио элемент.
                        </audio>
                    </div>
                );
            case 'pdf':
                return (
                    <div className="file-preview">
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
                            <a
                                href={currentFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: 'var(--admin-primary)',
                                    textDecoration: 'none'
                                }}
                            >
                                Открыть
                            </a>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="file-preview">
                        <div style={{
                            padding: '12px',
                            border: '1px solid var(--admin-border)',
                            borderRadius: '8px',
                            background: 'var(--admin-bg-lighter)'
                        }}>
                            📎 Файл загружен
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={`file-uploader ${className}`}>
            {/* Скрытый input для выбора файлов */}
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileSelect}
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
                    background: dragOver ? 'rgba(139, 92, 246, 0.1)' : 'var(--admin-bg-lighter)',
                    transition: 'all 0.3s ease',
                    marginBottom: currentFileUrl ? '16px' : '0'
                }}
            >
                {uploading ? (
                    <div style={{ color: 'var(--admin-text-secondary)' }}>
                        <div>⏳ Загрузка файла...</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            Пожалуйста, подождите
                        </div>
                    </div>
                ) : (
                    <div style={{ color: 'var(--admin-text-secondary)' }}>
                        <div>📁 Нажмите или перетащите файл сюда</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            {acceptedTypes === "image/*" && "Поддерживаются изображения"}
                            {acceptedTypes === "audio/*" && "Поддерживаются аудиофайлы"}
                            {acceptedTypes === "application/pdf" && "Поддерживаются PDF файлы"}
                            {acceptedTypes === "*/*" && "Поддерживаются все типы файлов"}
                        </div>
                    </div>
                )}
            </div>

            {/* Превью текущего файла */}
            {renderPreview()}
        </div>
    );
}; 