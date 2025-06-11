import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
                    <Ripple key={button.id} className="rounded-full overflow-hidden flex-1 flex justify-center">
                        <button
                            className={`bg-white p-[6px] duration-200 ease-in transition rounded-full ${isActiveBtn && 'bg-[linear-gradient(109.65deg,#E1C1F4_13.64%,#B862EA_124.92%)]'}`}
                            onClick={() => handleTabClick(button.slug)}
                        >
                            <img className={'w-6 h-6'} src={`/${button.icon}${isActiveBtn ? '-active' : ''}.svg`} alt="" />
                        </button>
                    </Ripple>
                )
            })}
        </nav>
    );
};

export default TabBar; 