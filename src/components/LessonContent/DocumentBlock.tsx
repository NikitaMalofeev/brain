import React from 'react';
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

interface DocumentBlockProps {
    block: LessonBlock;
}

const DocumentBlock = ({ block }: DocumentBlockProps) => {
    // Определение типа файла по URL для отображения (перенесено из LessonPage)

    const getFileTypeInfo = (fileUrl: string) => {
        const fileName = decodeURIComponent(fileUrl.substring(fileUrl.lastIndexOf('/') + 1));
        const extension = fileName.split('.').pop()?.toLowerCase() || '';

        // Определяем тип и иконку
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
            return { type: 'image', icon: '🖼️', name: fileName };
        }
        if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(extension)) {
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

    // Получаем правильный URL через buildFileUrl
    const documentUrl = buildFileUrl(block.content_url);

    // Убираем стили белого контейнера
    // Оставляем только div для структуры, стили будут применены родителем (LessonPage)
    return (
        <div className={'flex flex-col gap-3'}> {/* Убираем commonBlockStyle, его применяет LessonPage */}

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
                </div>

                {documentUrl ? (
                    <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={"w-full font-bold leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]"}
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