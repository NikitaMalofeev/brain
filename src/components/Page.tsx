import { useNavigate } from 'react-router-dom';
import { hideBackButton, onBackButtonClick, showBackButton, postEvent } from '@telegram-apps/sdk-react';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import { SafeAreaFade } from '@/components/SafeAreaFade/SafeAreaFade';
import TabBar from '@/components/TabBar/TabBar';
import './Page.css';

// Стили для учета отступов safe area с дополнительным отступом для fullscreen режима
const safeAreaStyle = {
  paddingTop: 'calc(var(--safe-area-top, 0px) + var(--fullscreen-extra-padding, 0px))',
  paddingRight: 'var(--safe-area-right, 0px)',
  paddingBottom: 'var(--safe-area-bottom, 0px)',
  paddingLeft: 'var(--safe-area-left, 0px)',
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  width: '100%',
  boxSizing: 'border-box' as const,
  position: 'relative' as const
};

interface PageProps {
  /**
   * True if it is allowed to go back from this page.
   */
  back?: boolean;
  /**
   * True if the page should display the bottom TabBar.
   */
  showTabBar?: boolean;
  /**
   * True if the page should display the SafeAreaFade at the top.
   */
  showSafeAreaFade?: boolean;
}

export function Page({ 
  children, 
  back = true, 
  showTabBar = true,
  showSafeAreaFade = true,
}: PropsWithChildren<PageProps>) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (back) {
      showBackButton();
      return onBackButtonClick(() => {
        navigate(-1);
      });
    }
    hideBackButton();
  }, [back, navigate]);

  // Повторно запрашиваем safe area при монтировании страницы
  useEffect(() => {
    postEvent('web_app_request_safe_area');
    postEvent('web_app_request_viewport');
    
    // Убедимся, что все родительские элементы имеют белый фон
    document.body.style.backgroundColor = '#ffffff';
    if (document.getElementById('root')) {
      document.getElementById('root')!.style.backgroundColor = '#ffffff';
    }
  }, []);

  // Добавляем отступ снизу, если показываем TabBar
  const containerStyle = {
    ...safeAreaStyle,
    paddingBottom: showTabBar ? 'calc(56px + env(safe-area-inset-bottom, 0) + 5px)' : 'var(--safe-area-bottom, 0px)',
  };

  return (
    <div 
      className={`page-container ${showTabBar ? 'with-tab-bar' : ''}`} 
      style={containerStyle} 
      ref={containerRef}
    >
      <div className="content-wrapper" style={{ backgroundColor: '#ffffff' }}>
        {children}
      </div>
      {showTabBar && <TabBar />}
      {showSafeAreaFade && <SafeAreaFade />}
    </div>
  );
}