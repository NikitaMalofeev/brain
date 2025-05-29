import React from 'react';
import { LessonBlock } from '@/lib/supabase/types';

interface DocumentBlockProps {
    block: LessonBlock;
}

const DocumentBlock: React.FC<DocumentBlockProps> = ({ block }) => {
    // Определение типа файла по URL для отображения (перенесено из LessonPage)
    const getFileTypeInfo = (fileUrl: string) => {
        const fileName = decodeURIComponent(fileUrl.substring(fileUrl.lastIndexOf('/') + 1));
        const extension = fileName.split('.').pop()?.toLowerCase() || '';

        // Определяем тип и иконку
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
            return { type: 'image', icon: '🖼️', name: fileName };
        }
        if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) {
            return { type: 'audio', icon: '🎵', name: fileName };
        }
        if (extension === 'pdf') {
            return { type: 'pdf', icon: '📄', name: fileName };
        }
        if (['doc', 'docx'].includes(extension)) {
            return { type: 'document', icon: '📝', name: fileName };
        }
        return { type: 'unknown', icon: '📎', name: fileName };
    };

    // Убираем стили белого контейнера
    // Оставляем только div для структуры, стили будут применены родителем (LessonPage)
    return (
        <div key={block.id}> {/* Убираем commonBlockStyle, его применяет LessonPage */}
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

            {/* Блок с ссылкой на PDF */}
            <div style={{
                // Убираем padding, background, border, borderRadius, boxShadow
                // Стили для внутреннего содержимого
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: block.content_text ? '12px' : '0px', // Отступ снизу только если есть описание
                }}>
                    {/* Отображаем описание блока, если оно есть. Иначе ничего не показываем */}
                    {block.content_text && (
                        <span style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '16px',
                            color: '#242424',
                        }}>
                            {block.content_text}
                        </span>
                    )}
                </div>

                {block.content_url ? (
                    <a
                        href={block.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '8px 16px',
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                        }}
                    >
                        Открыть Документ
                    </a>
                ) : (
                    <div style={{ color: '#6d6d6d' }}>
                        PDF недоступен
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentBlock; 