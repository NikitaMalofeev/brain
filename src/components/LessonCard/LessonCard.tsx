import React from 'react';
import { LessonData } from '@/lib/supabase/hooks/useStageDetails';

interface LessonCardProps {
    lesson: LessonData;
    onClick: (lessonId: number) => void;
}

// Функция для получения дефолтной обложки в зависимости от типа контента
const getDefaultCover = (contentType: string): string => {
    switch (contentType) {
        case 'video':
            return '/assets/default-video-cover.svg';
        case 'audio':
            return '/assets/default-audio-cover.svg';
        case 'text':
            return '/assets/default-text-cover.svg';
        case 'file':
            return '/assets/default-file-cover.svg';
        case 'link':
            return '/assets/default-link-cover.svg';
        default:
            return '/assets/default-lesson-cover.svg';
    }
};

// Функция для получения иконки статуса выполнения
const getStatusIcon = (isCompleted: boolean): string => {
    return isCompleted ? '🟢' : '⚪';
};

const LessonCard: React.FC<LessonCardProps> = ({ lesson, onClick }) => {
    const handleClick = () => {
        // Проверяем доступность урока перед переходом
        if (lesson.is_unlocked) {
            onClick(lesson.lesson_id);
        } else {
            // Можно добавить уведомление о том, что урок заблокирован
            console.log('Урок заблокирован. Завершите предыдущий урок для разблокировки.');
        }
    };

    const coverImageUrl = lesson.cover_image_url || getDefaultCover(lesson.content_type);

    return (
        <div onClick={handleClick} style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            marginBottom: '0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            cursor: lesson.is_unlocked ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid #f0f0f0',
            width: '100%',
            boxSizing: 'border-box',
            padding: '16px 16px 24px 16px',
            gap: '8px',
            opacity: lesson.is_unlocked ? 1 : 0.6, // Уменьшаем прозрачность для заблокированных уроков
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
            }}
        >
            {/* Обложка урока - большая как в Figma */}
            <div
                style={{
                    width: '100%',
                    height: '171px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#EFEFEF',
                    border: 'none',
                    position: 'relative',
                }}
            >
                <img
                    src={coverImageUrl}
                    alt={lesson.lesson_name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                    onError={(e) => {
                        // В случае ошибки загрузки используем дефолтную обложку
                        e.currentTarget.src = getDefaultCover(lesson.content_type);
                    }}
                />

                {/* Иконка замка для заблокированных уроков */}
                {!lesson.is_unlocked && (
                    <div style={{
                        position: 'absolute',
                        top: '70px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M8 14.6667V11.2C8 7.43269 11.1327 4.30005 14.9 4.30005H17.1C20.8673 4.30005 24 7.43269 24 11.2V14.6667M10.6667 14.6667H21.3333C22.8061 14.6667 24 15.8606 24 17.3333V24C24 25.4728 22.8061 26.6667 21.3333 26.6667H10.6667C9.19391 26.6667 8 25.4728 8 24V17.3333C8 15.8606 9.19391 14.6667 10.6667 14.6667Z" stroke="#515151" strokeWidth="2.67" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Информация под обложкой */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                width: '100%'
            }}>
                {/* Верхняя строка: День X и статус */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '4px',
                    width: '100%'
                }}>
                    <span style={{
                        fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: 600,
                        fontSize: '12px',
                        lineHeight: '1.5em',
                        color: '#8C8C8C',
                    }}>
                        День {lesson.lesson_id}
                    </span>

                    <span style={{
                        fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: 600,
                        fontSize: '12px',
                        lineHeight: '1.5em',
                        color: '#8C8C8C',
                    }}>
                        {lesson.is_completed ? 'Завершено' : lesson.is_unlocked ? 'Доступно' : 'Заблокировано'}
                    </span>
                </div>

                {/* Название урока */}
                <h3 style={{
                    fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    lineHeight: '1.125em',
                    color: '#000000',
                    margin: 0,
                    textAlign: 'left',
                    width: '100%'
                }}>
                    {lesson.lesson_name}
                </h3>

                {/* Индикатор задания */}
                {lesson.has_assignment && (
                    <div style={{
                        marginTop: '4px'
                    }}>
                        <span
                            style={{
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '11px',
                                backgroundColor: '#4e9bff',
                                color: '#FFFFFF',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 500,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.02em',
                            }}
                        >
                            Задание
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonCard; 