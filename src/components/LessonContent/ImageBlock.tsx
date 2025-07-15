import React, { useState } from 'react';
import { LessonBlock } from '@/lib/supabase/types';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';

// Функция для преобразования URL в тексте в кликабельные ссылки
function linkifyText(text: string): React.ReactNode[] {
    // Регулярное выражение для поиска URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={index} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#4e9bff', textDecoration: 'underline' }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

interface ImageBlockProps {
    block: LessonBlock;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ block }) => {

    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const imageUrl = block.content_url ? buildFileUrl(block.content_url) : null;

    const handleImageClick = () => {
        if (imageUrl) {
            setIsFullScreenOpen(true);
        }
    };

    const handleCloseFullScreen = () => {
        setIsFullScreenOpen(false);
    };

    return (
        <div className={'flex flex-col gap-3'}> {/* Parent will apply marginBottom */}


            {/* Изображение или заглушка */}
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={block.title || 'Изображение'}
                    style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '12px',
                        cursor: imageUrl ? 'pointer' : 'default', // Курсор pointer если есть URL
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
                }}>
                    🖼 Изображение недоступно
                </div>
            )}

            {/* Описание блока, если есть */}
            {block.content_text && (
                <div className={'flex flex-col gap-3 mt-4'} style={{
                    fontSize: '16px',
                    lineHeight: '1.5',
                    color: '#242424',
                    whiteSpace: 'pre-wrap',
                }}>
                    {block.content_text?.split('\n').map((line, i) => {
                        return (<p key={i}>{linkifyText(line)}</p>)
                    })}
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
                        src={imageUrl}
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