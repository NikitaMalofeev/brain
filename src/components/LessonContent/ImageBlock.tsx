import React, { useState } from 'react';
import { LessonBlock } from '@/lib/supabase/types';

interface ImageBlockProps {
    block: LessonBlock;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ block }) => {
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

    const handleImageClick = () => {
        if (block.content_url) {
            setIsFullScreenOpen(true);
        }
    };

    const handleCloseFullScreen = () => {
        setIsFullScreenOpen(false);
    };

    return (
        <div key={block.id}> {/* Parent will apply marginBottom */}
            {/* Заголовок, если есть */}
            {block.title && (
                <h3 style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '1.2',
                    color: '#000000',
                    marginBottom: '16px',
                    margin: '0 0 16px 0', // Сохраняем отступ от следующего элемента
                }}>
                    {block.title}
                </h3>
            )}

            {/* Изображение или заглушка */}
            {block.content_url ? (
                <img
                    src={block.content_url}
                    alt={block.title || 'Изображение'}
                    style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '12px',
                        cursor: block.content_url ? 'pointer' : 'default', // Курсор pointer если есть URL
                    }}
                    onClick={handleImageClick} // Добавляем обработчик клика
                />
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    backgroundColor: 'transparent', // Убран серый фон
                    border: '2px dashed #e0e0e0', // Добавлена рамка как для PDF
                    borderRadius: '12px',
                    color: '#6d6d6d',
                    fontSize: '16px',
                    fontFamily: 'Inter, sans-serif', // Убедимся, что шрифт применяется
                }}>
                    🖼 Изображение недоступно
                </div>
            )}

            {/* Описание блока, если есть */}
            {block.content_text && (
                <div style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: '1.5em',
                    color: '#424242',
                    marginTop: '16px', // Отступ сверху от изображения
                }}>
                    {block.content_text}
                </div>
            )}

            {/* Полноэкранное модальное окно */}
            {isFullScreenOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        cursor: 'pointer',
                    }}
                    onClick={handleCloseFullScreen} // Закрываем при клике вне изображения
                >
                    <img
                        src={block.content_url}
                        alt={block.title || 'Изображение'}
                        style={{
                            maxWidth: '95%',
                            maxHeight: '95%',
                            objectFit: 'contain',
                            borderRadius: '0', // Убираем border-radius в полноэкранном режиме
                        }}
                        onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на изображение
                    />
                </div>
            )}
        </div>
    );
};

export default ImageBlock; 