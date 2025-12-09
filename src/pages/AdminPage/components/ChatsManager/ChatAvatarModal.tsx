import React, { useRef, useState, useCallback } from 'react';
import { FileUploader, FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { uploadFile } from '@/lib/supabase/supabaseStorageService';
import type { Chat } from '@/types';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ChatAvatarModalProps {
    isOpen: boolean;
    chat: Chat | null;
    onClose: () => void;
    onSave: (filePath: string) => Promise<void>;
    onDelete: () => Promise<void>;
}

const ChatAvatarModal: React.FC<ChatAvatarModalProps> = ({
    isOpen,
    chat,
    onClose,
    onSave,
    onDelete
}) => {
    const fileUploaderRef = useRef<FileUploaderRef>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Состояния для кадрирования
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string>('');
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 50,
        height: 50,
        x: 25,
        y: 25,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [showCropper, setShowCropper] = useState(false);

    // Обработка выбора файла
    const handleFileSelected = useCallback((file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            setImageSrc('');
            setShowCropper(false);
        }
    }, []);

    // Обработка загрузки изображения для кропа
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;

        // Устанавливаем квадратный кроп по центру
        const size = Math.min(width, height);
        const x = (width - size) / 2;
        const y = (height - size) / 2;

        setCrop({
            unit: 'px',
            width: size,
            height: size,
            x,
            y,
        });
    }, []);

    // Создание обрезанного изображения
    const getCroppedImg = useCallback((
        image: HTMLImageElement,
        crop: PixelCrop
    ): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Не удалось получить контекст canvas'));
                return;
            }

            // Вычисляем масштаб между отображаемым и натуральным размером
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            // Размер выходного изображения (можно ограничить для оптимизации)
            const outputSize = Math.min(crop.width * scaleX, 500);

            canvas.width = outputSize;
            canvas.height = outputSize;

            // Рисуем обрезанное изображение с учётом масштаба
            ctx.drawImage(
                image,
                crop.x * scaleX,
                crop.y * scaleY,
                crop.width * scaleX,
                crop.height * scaleY,
                0,
                0,
                outputSize,
                outputSize
            );

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Не удалось создать blob'));
                }
            }, 'image/jpeg', 0.92);
        });
    }, []);

    const handleSave = async () => {
        if (!selectedFile || !completedCrop || !imgRef.current) {
            alert('Пожалуйста, выберите изображение и настройте область кадрирования');
            return;
        }

        try {
            setIsSaving(true);

            // Создаем обрезанное изображение
            const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);

            // Создаем File из Blob для загрузки
            const croppedFile = new File([croppedBlob], `chat_avatar_${Date.now()}.jpg`, {
                type: 'image/jpeg',
            });

            // Загружаем обрезанный файл напрямую в R2
            const filePath = await uploadFile(croppedFile, 'images/');
            await onSave(filePath);

            // Сбрасываем состояния
            setSelectedFile(null);
            setImageSrc('');
            setShowCropper(false);
            onClose();

        } catch (error: any) {
            console.error('Ошибка сохранения аватара чата:', error);
            alert(`Ошибка сохранения аватара: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!chat?.avatar_url) return;

        const confirmDelete = confirm('Вы уверены, что хотите удалить аватар чата?');
        if (!confirmDelete) return;

        try {
            setIsSaving(true);
            await onDelete();
            onClose();
        } catch (error: any) {
            console.error('Ошибка удаления аватара чата:', error);
            alert(`Ошибка удаления аватара: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelCrop = () => {
        setSelectedFile(null);
        setImageSrc('');
        setShowCropper(false);
        setCrop({
            unit: '%',
            width: 50,
            height: 50,
            x: 25,
            y: 25,
        });
        setCompletedCrop(undefined);
    };

    // Условный возврат ПОСЛЕ всех хуков
    if (!isOpen || !chat) return null;

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
                <button className="admin-modal-close" onClick={onClose}>×</button>
                <h3>Аватар чата: {chat.name}</h3>

                {!showCropper ? (
                    // Этап 1: Выбор файла
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <FileUploader
                                ref={fileUploaderRef}
                                acceptedTypes="image/*"
                                filePrefix="images/"
                                onFileSelected={handleFileSelected}
                                disabled={isSaving}
                                currentFileUrl={buildFileUrl(chat.avatar_url) || undefined}
                                showDeleteButton={false}
                            />
                        </div>

                        <div className="form-actions">
                            {chat.avatar_url && (
                                <button
                                    className="admin-button danger"
                                    onClick={handleDelete}
                                    disabled={isSaving}
                                >
                                    Удалить аватар
                                </button>
                            )}

                            <button
                                className="admin-button secondary"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                Отмена
                            </button>
                        </div>
                    </>
                ) : (
                    // Этап 2: Кадрирование
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ marginBottom: '1rem', color: '#666' }}>
                                Выберите область для аватара:
                            </p>

                            <div style={{ maxWidth: '100%', maxHeight: '400px', overflow: 'hidden' }}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={1}
                                    circularCrop={true}
                                    minWidth={100}
                                    minHeight={100}
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Кадрирование"
                                        src={imageSrc}
                                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                                        onLoad={onImageLoad}
                                    />
                                </ReactCrop>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={handleSave}
                                disabled={isSaving || !completedCrop}
                            >
                                {isSaving ? 'Сохранение...' : 'Сохранить аватар'}
                            </button>

                            <button
                                className="admin-button secondary"
                                onClick={handleCancelCrop}
                                disabled={isSaving}
                            >
                                Назад к выбору файла
                            </button>

                            <button
                                className="admin-button secondary"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                Отмена
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatAvatarModal;
