import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  
  return (
    <nav className={`tab-bar ${className || ''}`} aria-label="Основная навигация">
      <button 
        className={`tab-item ${isActive('/') ? 'active' : ''}`} 
        onClick={() => handleTabClick('/')}
        aria-current={isActive('/') ? 'page' : undefined}
        aria-label="Перейти на главную страницу"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Главная</span>
      </button>
      
      <button 
        className={`tab-item ${isActive('/library') ? 'active' : ''}`} 
        onClick={() => handleTabClick('/library')}
        aria-current={isActive('/library') ? 'page' : undefined}
        aria-label="Перейти в библиотеку"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2V2Z" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Библиотека</span>
      </button>
      
      <button 
        className={`tab-item ${isActive('/schedule') ? 'active' : ''}`} 
        onClick={() => handleTabClick('/schedule')}
        aria-current={isActive('/schedule') ? 'page' : undefined}
        aria-label="Перейти в расписание"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Расписание</span>
      </button>
      
      <button 
        className={`tab-item ${isActive('/profile') ? 'active' : ''}`} 
        onClick={() => handleTabClick('/profile')}
        aria-current={isActive('/profile') ? 'page' : undefined}
        aria-label="Перейти в профиль"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Профиль</span>
      </button>
    </nav>
  );
};

export default TabBar; 