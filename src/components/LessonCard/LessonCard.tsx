import React from 'react';
import { LessonData } from '@/lib/supabase/hooks/useStageDetails';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { motion } from 'framer-motion';

interface LessonCardProps {
    lesson: LessonData;
    onClick: (lessonId: number) => void;
    isGuest?: boolean;
    stageName?: string; // Название ступени для бейджа (например "Неделя 3")
}

// Функция для получения дефолтной обложки
const getDefaultCover = (): string => {
    return '/test.png';
};

const LessonCard: React.FC<LessonCardProps> = ({ lesson, onClick, isGuest = false, stageName }) => {
    const handleClick = () => {
        // Если гость - всегда вызываем onClick (он покажет модалку в родителе)
        if (isGuest) {
            onClick(lesson.lesson_id);
            return;
        }
        // Проверяем доступность урока перед переходом
        if (lesson.is_unlocked) {
            onClick(lesson.lesson_id);
        } else {
            console.log('Урок заблокирован. Завершите предыдущий урок для разблокировки.');
        }
    };

    // Для гостей все уроки визуально заблокированы
    const isLocked = isGuest || !lesson.is_unlocked;

    // Используем обложку урока или дефолтную
    const coverImageUrl = buildFileUrl(lesson.cover_image_path) || getDefaultCover();

    return (
        <motion.div
            whileTap={!isLocked || isGuest ? { scale: 0.97 } : {}}
            style={{ touchAction: 'manipulation' }}
            className="w-full"
        >
            <Ripple className="rounded-2xl overflow-hidden w-full shadow-sm">
                <div
                    onClick={(!isLocked || isGuest) ? handleClick : undefined}
                    className={'flex flex-col w-full bg-white cursor-pointer'}
                >
                    {/* Изображение с бейджами */}
                    <div className={'relative w-full aspect-[4/3]'}>
                        <img
                            src={coverImageUrl}
                            alt={lesson.lesson_name}
                            className="w-full h-full object-cover"
                        />

                        {/* Затемняющий оверлей для заблокированных */}
                        {isLocked && (
                            <div className="absolute inset-0 bg-black/30" />
                        )}

                        {/* Бейдж с названием ступени - левый верхний угол */}
                        {stageName && !isLocked && (
                            <div className="absolute top-2 left-2 bg-[#A89080]/90 text-white text-[10px] font-medium px-2 py-1 rounded-md">
                                {stageName}
                            </div>
                        )}

                        {/* Бейдж "Не доступно" с замком - для заблокированных */}
                        {isLocked && (
                            <div className="absolute top-2 left-2 bg-[#ADADAD] text-white text-[10px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                                <span>Не доступно</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Название урока снизу */}
                    <div className={'p-3 bg-white'}>
                        <p className={'font-semibold text-sm text-black truncate'}>{lesson.lesson_name}</p>
                    </div>
                </div>
            </Ripple>
        </motion.div>
    );
};

export default LessonCard; 