import React from 'react';
import AudioPlayer from '../Player/AudioPlayer';
import { LessonBlock } from '@/lib/supabase/types';

interface AudioBlockProps {
    block: LessonBlock;
}

const AudioBlock: React.FC<AudioBlockProps> = ({ block }) => {
    // Проверяем, что URL ведет на CloudFlare R2 аудио
    const isValidAudioUrl = (url: string): boolean => {
        if (!url) return false;

        // Проверяем CloudFlare R2 аудио bucket или общие аудио форматы
        return (
            url.includes('r2.cloudflarestorage.com') && url.includes('/audio/') ||
            url.endsWith('.mp3') ||
            url.endsWith('.wav') ||
            url.endsWith('.ogg') ||
            url.endsWith('.m4a')
        );
    };

    const audioUrl = block.content_url || '';
    const isValidAudio = isValidAudioUrl(audioUrl);

    if (!isValidAudio) {
        return (
            <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '120px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    color: '#6d6d6d',
                    fontSize: '16px',
                }}>
                    🎵 Аудио недоступно
                </div>
            </div>
        );
    }

    return (
        <div style={{
            marginBottom: '24px',
            // Убираем прямоугольник - без padding, border, shadow
        }}>
            {/* Audio Player - убираем надпись с плеера */}
            <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                overflow: 'hidden',
                minHeight: '200px',
                position: 'relative',
                marginBottom: '12px',
            }}>
                <AudioPlayer
                    audioUrl={audioUrl}
                    title={block.title || 'Аудио урока'}
                    description={block.content_text || undefined}
                />

                {/* Аудио визуализация (заглушка по дизайну Figma) */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '2px',
                    height: '40px',
                    pointerEvents: 'none',
                    opacity: 0.3,
                }}>
                    {/* Генерируем визуальные столбцы как в Figma */}
                    {Array.from({ length: 50 }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '3px',
                                height: `${Math.random() * 100}%`,
                                backgroundColor: '#4e9bff',
                                borderRadius: '1px',
                                minHeight: '8px',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Подпись под аудио - это часть смыслового блока */}
            {(block.title || block.content_text) && (
                <div style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    color: '#242424',
                }}>
                    {block.title && (
                        <div style={{
                            fontWeight: 600,
                            marginBottom: block.content_text ? '4px' : '0'
                        }}>
                            {block.title}
                        </div>
                    )}
                    {block.content_text && (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                            {block.content_text}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AudioBlock; 