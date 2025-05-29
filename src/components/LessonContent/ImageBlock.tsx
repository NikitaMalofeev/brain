import React from 'react';
import { LessonBlock } from '@/lib/supabase/types';

interface ImageBlockProps {
    block: LessonBlock;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ block }) => {
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
                    }}
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
        </div>
    );
};

export default ImageBlock; 