import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './TabBar.css';

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
            icon: 'bottom-menu-library',
            slug: '/techniques'
        },
        {
            id: 2,
            icon: 'bottom-menu-calendar',
            slug: '/calendar'
        },
        {
            id: 3,
            icon: 'icon2',
            slug: '/'
        },
        {
            id: 4,
            icon: 'icon3',
            slug: '/profile2'
        }
    ]

    return (
        <nav
            className={`tab-bar ${className || ''}`}
            aria-label="Основная навигация"
            style={{
                background: '#0000007A',
                backdropFilter: 'blur(30px)',
                paddingLeft: '12px',
                paddingRight: '12px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
            }}
        >
            {buttons.map((button) => {
                const isActiveBtn = isActive(button.slug)
                return (
                    <div key={button.id} className="flex-1 flex justify-center relative">
                        <motion.button
                            className={'w-12 h-9 rounded-[18px] relative flex items-center justify-center'}
                            onClick={() => handleTabClick(button.slug)}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                touchAction: 'manipulation',
                                pointerEvents: 'auto',
                                zIndex: 'auto',
                                background: isActiveBtn ? '#0000004D' : 'transparent',
                            }}
                        >
                            <AnimatePresence>
                                {isActiveBtn && (
                                    <motion.div
                                        className="absolute inset-0 rounded-[18px]"
                                        style={{
                                            background: '#0000004D',
                                            pointerEvents: 'none',
                                        }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                                    />
                                )}
                            </AnimatePresence>
                            {/* Иконка */}
                            <div className="relative w-6 h-6" style={{ pointerEvents: 'none' }}>
                                <img
                                    className="w-full h-full"
                                    src={`/${button.icon}.svg`}
                                    alt="иконка навигации"
                                    style={{ pointerEvents: 'none' }}
                                />
                            </div>
                        </motion.button>
                    </div>
                )
            })}
        </nav>
    );
};

export default TabBar; 