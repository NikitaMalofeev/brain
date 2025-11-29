import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './TabBar.css';
import { getThemeByRoute } from './tabBarConfig';

interface TabBarProps {
    className?: string;
}

// Компонент TabBar для нижней навигации
const TabBar: FC<TabBarProps> = ({ className }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const theme = getThemeByRoute(currentPath);

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

    // Получить путь к иконке в зависимости от темы и состояния
    const getIconSrc = (iconName: string, isActiveBtn: boolean) => {
        if (theme.useActiveIcons && isActiveBtn) {
            return `/${iconName}-active.svg`;
        }
        return `/${iconName}.svg`;
    };

    return (
        <nav
            className={`tab-bar ${className || ''}`}
            aria-label="Основная навигация"
            style={{
                background: theme.background,
                backdropFilter: theme.backdropFilter,
                boxShadow: theme.boxShadow,
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
                            className={'relative flex items-center justify-center'}
                            onClick={() => handleTabClick(button.slug)}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                touchAction: 'manipulation',
                                pointerEvents: 'auto',
                                zIndex: 'auto',
                                width: theme.buttonSize.width,
                                height: theme.buttonSize.height,
                                borderRadius: theme.buttonRadius,
                                background: isActiveBtn ? theme.buttonActiveBackground : theme.buttonBackground,
                            }}
                        >
                            <AnimatePresence>
                                {isActiveBtn && (
                                    <motion.div
                                        className="absolute inset-0"
                                        style={{
                                            borderRadius: theme.buttonRadius,
                                            background: theme.buttonActiveBackground,
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
                                    src={getIconSrc(button.icon, isActiveBtn)}
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