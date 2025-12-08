// Компонент карточки ступени
import React, { useState, memo } from 'react';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { motion } from 'framer-motion';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import { parseDateOnly } from '@/helpers/dateUtils';

export interface StageCardProps {
    id: number;
    name: string;
    isLocked: boolean;
    coverImagePath?: string;
    orderNum: number;
    isGuest?: boolean;
    unlockDay?: number; // С какого дня потока модуль доступен
    moduleId?: string; // ID модуля для навигации на страницу ступеней
    streamStartDate?: string; // Дата начала потока для расчёта даты открытия
}

const StageCard: React.FC<StageCardProps> = memo(({
    id,
    name,
    isLocked,
    coverImagePath,
    orderNum,
    isGuest = false,
    unlockDay,
    moduleId,
    streamStartDate,
}) => {
    const [showGuestModal, setShowGuestModal] = useState(false);
    const isUnlocked = !isLocked;

    // Вычисляем дату открытия модуля (в локальном времени пользователя)
    const getUnlockDate = (): string | null => {
        if (!streamStartDate || unlockDay === undefined || unlockDay <= 0) {
            return null;
        }
        // Используем parseDateOnly чтобы избежать сдвига часового пояса
        const startDate = parseDateOnly(streamStartDate);
        if (!startDate) return null;
        startDate.setDate(startDate.getDate() + unlockDay - 1);
        return startDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
        });
    };

    const unlockDate = getUnlockDate();

    // Для гостей доступна только первая ступень ("Исцеление")
    const canAccess = isUnlocked && (!isGuest || orderNum === 1);

    const handleClick = (e: React.MouseEvent) => {
        // Если не разблокирован для обычных пользователей
        if (!isUnlocked && !isGuest) {
            e.preventDefault();
            return;
        }

        // Если гость пытается открыть недоступный модуль (не первый)
        if (isGuest && orderNum !== 1) {
            e.preventDefault();
            setShowGuestModal(true);
            return;
        }

        // Разрешаем переход (для гостей - только в первый модуль)
    };

    return (
        <>
            <motion.div
                layout
                whileTap={canAccess || isGuest ? { scale: 0.97 } : {}}
                style={{ touchAction: 'manipulation' }}
                className="w-full"
            >
                <Ripple className="rounded-4xl overflow-hidden">
                    <Link
                        to={moduleId ? `/library/module/${moduleId}` : `/library/stage/${id}`}
                        onClick={handleClick}
                        className={clsx(
                            'block w-full h-full relative bg-white/70',
                            (canAccess || isGuest) ? 'cursor-pointer' : 'pointer-events-none',
                        )}
                    >
                    <img
                        src={`/step${orderNum}${orderNum}.png`}
                        className={clsx("w-full h-[140px] md:h-[200px] object-cover", `bg-breathe-${orderNum}`)}
                        alt=""
                    />
                    {/* Затемнение для заблокированных карточек */}
                    {(!isUnlocked || (isGuest && orderNum !== 1)) && (
                        <div className="absolute inset-0 bg-[#0000004D] z-[1]" />
                    )}
                    <div className='absolute top-5 left-5 z-[2] flex flex-col gap-1'>
                        <p className={clsx('font-bold uppercase', (!isUnlocked || (isGuest && orderNum !== 1)) ? 'text-white' : 'text-black')}>{name}</p>
                        <div className='text-xs text-white w-max font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)] px-2 py-1 rounded-full flex items-center gap-1'>
                            LEVEL 0{orderNum}
                            {(!isUnlocked || (isGuest && orderNum !== 1)) && <img src={'/lock.svg'} alt={''} />}
                        </div>
                        {!isUnlocked && unlockDate && (
                            <div className='text-xs text-gray-600 bg-white/80 px-2 py-1 rounded-full'>
                                Откроется {unlockDate}
                            </div>
                        )}
                    </div>
                </Link>
            </Ripple>
        </motion.div>

        {/* Модалка для гостей */}
        <GuestBlockedModal
            isOpen={showGuestModal}
            onClose={() => setShowGuestModal(false)}
            ctaUrl="https://brainprogramming.ru/main?utm_source=app"
        />
    </>
    );
});

// Display name для React DevTools
StageCard.displayName = 'StageCard';

export default StageCard; 