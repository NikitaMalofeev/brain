import React, { useRef, useState, useCallback } from 'react';
import { FileUploader, FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { Curator } from '@/lib/supabase/hooks/useCuratorsAdmin';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { uploadFile } from '@/lib/supabase/supabaseStorageService';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Расширяем тип Curator для поддержки photo_url
interface CuratorAvatarModalProps {
    isOpen: boolean;
    curator: Curator | null;
    onClose: () => void;
    onSave: (filePath: string) => Promise<void>;
    onDelete: () => Promise<void>;
}

const CuratorAvatarModal: React.FC<CuratorAvatarModalProps> = ({
    isOpen,
    curator,
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

            // Устанавливаем размер canvas равным размеру кропа
            canvas.width = crop.width;
            canvas.height = crop.height;

            // Рисуем обрезанное изображение
            ctx.drawImage(
                image,
                crop.x,
                crop.y,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height
            );

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Не удалось создать blob'));
                }
            }, 'image/jpeg', 0.9);
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
            const croppedFile = new File([croppedBlob], `avatar_${Date.now()}.jpg`, {
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
            console.error('Ошибка сохранения аватара куратора:', error);
            alert(`Ошибка сохранения аватара: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!curator?.photo_url) return;

        const confirmDelete = confirm('Вы уверены, что хотите удалить аватар куратора?');
        if (!confirmDelete) return;

        try {
            setIsSaving(true);
            await onDelete();
            onClose();
        } catch (error: any) {
            console.error('Ошибка удаления аватара куратора:', error);
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
    if (!isOpen || !curator) return null;

    const curatorName = `${curator.first_name || ''} ${curator.last_name || ''}`.trim() || curator.web_login || 'Безымянный куратор';

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
                <button className="admin-modal-close" onClick={onClose}>×</button>
                <h3>Аватар куратора: {curatorName}</h3>

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
                                currentFileUrl={buildFileUrl(curator.photo_url) || undefined}
                                showDeleteButton={false}
                            />
                        </div>

                        <div className="form-actions">
                            {curator.photo_url && (
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
                                Выберите квадратную область для аватара:
                            </p>

                            <div style={{ maxWidth: '100%', maxHeight: '400px', overflow: 'hidden' }}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={1} // Квадратное соотношение сторон
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

export default CuratorAvatarModal; 