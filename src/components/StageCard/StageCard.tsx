// Компонент карточки ступени
import React from 'react';
import { buildImageUrl } from '@/lib/cloudflareR2Service';
import { motion } from 'framer-motion';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

// Импортируем SVG как компонент React
// Убедитесь, что у вас есть файл lock.svg в указанном пути
// и настроен загрузчик SVG (например, svgr для Vite/Create React App)
// import LockIcon from './lock.svg?react'; // Убираем импорт SVG

export interface StageCardProps {
    id: number;
    name: string;
    isLocked: boolean;
    coverImagePath?: string;
    orderNum: number;
}

const StageCard: React.FC<StageCardProps> = ({
    id,
    name,
    isLocked,
    coverImagePath,
    orderNum,
}) => {
    const isUnlocked = !isLocked;

    return (
        <motion.div
            layout
            whileTap={isUnlocked ? { scale: 0.97 } : {}}
            style={{ touchAction: 'manipulation' }}
            className="w-full"
        >
            <Ripple className="rounded-4xl overflow-hidden">
                <Link
                    to={`/library/stage/${id}`}
                    className={clsx(
                        'block w-full h-full relative bg-white/70',
                        isUnlocked ? 'cursor-pointer' : 'pointer-events-none'
                    )}
                >
                    <img
                        src={coverImagePath ? buildImageUrl(coverImagePath) : `/step${orderNum}${orderNum}.png`}
                        className="w-full h-[140px] md:h-[200px] object-cover"
                        onError={(e) => {
                            e.currentTarget.src = `/step${orderNum}${orderNum}.png`;
                        }}
                        alt=""
                    />
                    <div className='absolute top-5 left-5 z-[2] flex flex-col gap-1'>
                        <p className='font-bold uppercase text-black'>{name}</p>
                        <div className='text-xs text-white w-max font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)] px-2 py-1 rounded-full flex items-center gap-1'>
                            LEVEL 0{orderNum}
                            {!isUnlocked && <img src={'/lock.svg'} alt={''} />}
                        </div>
                    </div>
                </Link>
            </Ripple>
        </motion.div>
    );
};

export default StageCard; 