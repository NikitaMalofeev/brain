import React from 'react';
import { LessonData } from '@/lib/supabase/hooks/useStageDetails';
import { buildImageUrl } from '@/lib/cloudflareR2Service';
import { clsx } from "clsx";
import NativeModal from "@/components/NativeModal.tsx";

interface LessonCardProps {
    lesson: LessonData;
    onClick: (lessonId: number) => void;
}

// Функция для получения дефолтной обложки в зависимости от типа контента
const getDefaultCover = (): string => {
    return '/test.png';
};

// Функция для получения иконки статуса выполнения
const getStatusIcon = (isCompleted: boolean): string => {
    return isCompleted ? '🟢' : '⚪';
};

// Функция для определения статуса урока относительно времени открытия
const getLessonTimeStatus = (lesson: LessonData) => {
    if (!lesson.open_at) return null;

    const now = new Date();
    const openAt = new Date(lesson.open_at);

    // Получаем завтрашний день в 00:00
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Получаем послезавтрашний день в 00:00
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Проверяем, открывается ли урок завтра
    if (openAt >= tomorrow && openAt < dayAfterTomorrow) {
        return 'opens_tomorrow';
    }

    return null;
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

    // ВРЕМЕННО: используем дефолтную обложку вместо CloudFlare R2
    const coverImageUrl = lesson.cover_image_path
        ? buildImageUrl(lesson.cover_image_path)
        : getDefaultCover();

    // ВРЕМЕННАЯ ДИАГНОСТИКА: выводим в консоль для отладки
    if (lesson.cover_image_path) {
        console.log('🖼️ LessonCard Debug:', {
            lessonName: lesson.lesson_name,
            coverImagePath: lesson.cover_image_path,
            generatedUrl: coverImageUrl
        });
    }

    // Определяем статус урока относительно времени
    const timeStatus = getLessonTimeStatus(lesson);

    return (
        <div onClick={lesson.is_unlocked ? handleClick : undefined} className={'flex flex-col w-full bg-white rounded-3xl overflow-hidden'}>
            <div className={'relative w-full'}>
                <img src={coverImageUrl} alt={''} className={clsx('h-[190px] w-full rounded-3xl object-cover', !lesson.is_unlocked && 'mix-blend-luminosity')} />
                {!lesson.is_unlocked && <div className={'p-[6px] rounded-full bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)] absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 z-[2]'}>
                    <img src={'/lock.svg'} alt={''} className={clsx('min-w-6 h-6')} />
                </div>}
            </div>
            <div className={'p-4 flex flex-col gap-2'}>
                <p className={'font-semibold'}>{lesson.lesson_name}</p>
                <div className={'flex flex-wrap gap-1'}>
                    <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]'}>День {lesson.order_num}</p>

                    {/* Плашка "Откроется завтра" - высший приоритет */}
                    {timeStatus === 'opens_tomorrow' ? (
                        <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]'}>Откроется завтра</p>
                    ) : lesson.is_completed ? (
                        <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-green-500'}>Завершено</p>
                    ) : lesson.is_unlocked ? (
                        <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]'}>Не начато</p>
                    ) : (
                        <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-gray-500'}>Заблокировано</p>
                    )}
                </div>
            </div>
        </div>

        /*<div onClick={handleClick} style={{
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
            {/!* Обложка урока - большая как в Figma *!/}
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
                        // ВРЕМЕННАЯ ДИАГНОСТИКА: логируем ошибку загрузки
                        console.error('❌ Ошибка загрузки изображения:', {
                            lessonName: lesson.lesson_name,
                            failedUrl: e.currentTarget.src,
                            originalPath: lesson.cover_image_path
                        });

                        // В случае ошибки загрузки используем дефолтную обложку
                        e.currentTarget.src = getDefaultCover();
                    }}
                    onLoad={() => {
                        // ВРЕМЕННАЯ ДИАГНОСТИКА: успешная загрузка
                        console.log('✅ Изображение загружено успешно:', lesson.lesson_name);
                    }}
                />

                {/!* Иконка замка для заблокированных уроков *!/}
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

            {/!* Информация под обложкой *!/}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                width: '100%'
            }}>
                {/!* Верхняя строка: День X и статус *!/}
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

                {/!* Название урока *!/}
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

                {/!* Индикатор задания *!/}
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
        </div>*/
    );
};

export default LessonCard; 