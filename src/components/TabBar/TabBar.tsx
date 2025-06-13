import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './TabBar.css';
import { Ripple } from '../ui/Ripple/Ripple';

interface TabBarProps {
    className?: string;
}

// Компонент TabBar для нижней навигации
const TabBar: FC<TabBarProps> = ({ className }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    // Определение активной вкладки
    const isActive = (path: string) => currentPath === path;

    // Обработчик перехода на вкладку
    const handleTabClick = (path: string) => {
        navigate(path);
    };
    const buttons = [
        {
            id: 1,
            icon: 'icon1',
            slug: '/library'
        },
        {
            id: 2,
            icon: 'icon2',
            slug: '/'
        },
        {
            id: 3,
            icon: 'icon3',
            slug: '/profile2'
        }
    ]
    return (
        <nav className={`tab-bar ${className || ''}`} aria-label="Основная навигация">
            {buttons.map((button) => {
                const isActiveBtn = isActive(button.slug)
                return (
                    <Ripple key={button.id} className="rounded-full overflow-hidden flex-1 flex justify-center relative">
                        <motion.button
                            className={'bg-white p-[6px] rounded-full relative'}
                            onClick={() => handleTabClick(button.slug)}
                        >
                            {/* Скользящий индикатор - теперь без условного рендеринга */}
                            <motion.div
                                layoutId="tabCursor"
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: 'linear-gradient(109.65deg,#E1C1F4 13.64%,#B862EA 124.92%)',
                                    opacity: isActiveBtn ? 1 : 0,
                                    zIndex: 1,
                                }}
                                initial={false}
                                animate={{ opacity: isActiveBtn ? 1 : 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                            />
                            {/* Обертка для иконок для плавного cross-fade */}
                            <div className="relative w-6 h-6 z-10">
                                {/* Неактивная иконка */}
                                <motion.img
                                    className="w-full h-full absolute top-0 left-0"
                                    src={`/${button.icon}.svg`}
                                    alt="иконка навигации"
                                    animate={{ opacity: isActiveBtn ? 0 : 1 }}
                                    transition={{ duration: 0.25 }}
                                />
                                {/* Активная иконка */}
                                <motion.img
                                    className="w-full h-full absolute top-0 left-0"
                                    src={`/${button.icon}-active.svg`}
                                    alt="активная иконка навигации"
                                    animate={{ opacity: isActiveBtn ? 1 : 0 }}
                                    transition={{ duration: 0.25 }}
                                />
                            </div>
                        </motion.button>
                    </Ripple>
                )
            })}
        </nav>
    );
};

export default TabBar; 