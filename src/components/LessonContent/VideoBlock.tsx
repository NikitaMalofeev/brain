import React from 'react';
import VideoPlayer from '../Player/VideoPlayer';
import { LessonBlock } from '@/lib/supabase/types';

interface VideoBlockProps {
    block: LessonBlock;
}

const VideoBlock: React.FC<VideoBlockProps> = ({ block }) => {
    // Извлекаем Kinescope ID из content_url
    const getKinescopeId = (url: string): string | null => {
        if (!url) return null;

        // Различные форматы Kinescope URL:
        // https://kinescope.io/embed/VIDEO_ID
        // https://kinescope.io/VIDEO_ID
        // просто VIDEO_ID

        const patterns = [
            /kinescope\.io\/embed\/([a-zA-Z0-9]+)/,
            /kinescope\.io\/([a-zA-Z0-9]+)/,
            /^([a-zA-Z0-9]+)$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    };

    const videoId = getKinescopeId(block.content_url || '');

    if (!videoId) {
        return (
            <div style={{
                marginBottom: '24px', // Оставляем только отступ снизу для этого случая
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                backgroundColor: '#f0f0f0', // Более нейтральный фон для ошибки
                borderRadius: '12px',
                color: '#6d6d6d',
                fontSize: '16px',
            }}>
                🎥 Видео недоступно или неверный ID
            </div>
        );
    }

    // VideoBlock теперь отвечает только за рендер плеера
    return (
        <div style={{
            // marginBottom: '24px', // Отступ будет управляться в LessonPage
            position: 'relative',
            aspectRatio: '16 / 9', // Сохраняем соотношение сторон для видео
        }}>
            <VideoPlayer
                videoId={videoId}
            // title и description убраны, т.к. они будут рендериться в LessonPage
            />
        </div>
    );
};

export default VideoBlock; 