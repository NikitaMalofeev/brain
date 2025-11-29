import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { LessonBlock } from '@/lib/supabase/types';

interface StreamingAudioBlockProps {
    block: LessonBlock;
}

/**
 * Компонент аудио-блока, который открывает полноэкранный плеер
 */
const StreamingAudioBlock: React.FC<StreamingAudioBlockProps> = ({ block }) => {
    const navigate = useNavigate();
    const audioUrl = block.content_url || '';

    // Переход на страницу аудиоплеера
    const handleOpenAudioPlayer = () => {
        navigate('/audio-player', {
            state: {
                title: block.title || 'Аудио',
                description: block.content_text,
                audioUrl: audioUrl,
            }
        });
    };

    if (!audioUrl) {
        return (
            <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '60px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    color: '#6d6d6d',
                    fontSize: '16px',
                }}>
                    Аудио недоступно
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '24px' }}>
            {/* Заголовок */}
            {block.title && (
                <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#242424',
                    marginBottom: '12px',
                }}>
                    {block.title}
                </div>
            )}

            {/* Кнопка воспроизведения */}
            <button
                onClick={handleOpenAudioPlayer}
                style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    borderRadius: '24px',
                    border: '0.7px solid rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    marginBottom: '12px',
                }}
            >
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(109.65deg, #E1C1F4 13.64%, #B862EA 124.92%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                </div>
                <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#242424',
                }}>
                    Слушать
                </span>
            </button>

            {/* Описание */}
            {block.content_text && (
                <div style={{
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: '1.5em',
                    color: '#424242',
                }}>
                    {block.content_text}
                </div>
            )}
        </div>
    );
};

export default StreamingAudioBlock;