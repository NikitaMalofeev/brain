import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
          icon: 'icon1',
          slug: '/library'
      },
      {
          id: 1,
          icon: 'icon2',
          slug: '/'
      },
      {
          id: 1,
          icon: 'icon3',
          slug: '/profile2'
      }
  ]
  return (
      <nav className={`tab-bar ${className || ''}`} aria-label="Основная навигация">
          {buttons.map((button, ) => {
              const isActiveBtn = isActive(button.slug)
              return (
                  <button
                      key={button.id}
                      className={`bg-white p-[6px] mx-auto duration-200 ease-in transition rounded-full ${isActiveBtn && 'bg-[linear-gradient(109.65deg,#E1C1F4_13.64%,#B862EA_124.92%)]'}`}
                      onClick={() => handleTabClick(button.slug)}
                  >
                      <img className={'w-6 h-6'} src={`/${button.icon}${isActiveBtn ? '-active' : ''}.svg`} alt=""/>
                  </button>
              )
          })}
      </nav>
  );
};

export default TabBar; 