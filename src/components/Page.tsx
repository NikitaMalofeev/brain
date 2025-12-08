import { useNavigate, useLocation } from 'react-router-dom';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import { SafeAreaFade } from '@/components/SafeAreaFade/SafeAreaFade';
import { backButton, miniApp } from '@telegram-apps/sdk-react';
import { handleModalBack } from '@/lib/modalState';
import './Page.css';

// Стили для Page контейнера
// НЕ используем paddingTop здесь - это позволяет фонам страниц растягиваться на весь экран
// Отступ сверху (safe-area + 24px) задаётся через CSS переменную --content-top-offset
// и применяется к контенту внутри страниц через класс .page-content-offset
const safeAreaStyle = {
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
   * If false, the back button will close the app instead.
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
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Монтируем если не смонтирован
      if (backButton.isSupported() && !backButton.isMounted()) {
        backButton.mount();
      }

      // Всегда показываем кнопку назад
      if (backButton.isMounted()) {
        backButton.show();
      } else {
        console.error('Page: BackButton not mounted, cannot show');
        return;
      }

      // Обработчик клика на кнопку назад
      const handleBackButtonClick = () => {
        // Сначала проверяем, есть ли открытая модалка
        if (handleModalBack()) {
          // Модалка была закрыта, не делаем ничего больше
          return;
        }

        if (back) {
          // Обычная навигация назад
          navigate(-1);
        } else {
          // На главных страницах (где back=false)
          if (location.pathname === '/') {
            // Если уже на главной - минимизируем приложение
            try {
              if (miniApp.isMounted()) {
                miniApp.close();
              } else if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
              }
            } catch (e) {
              console.error('Failed to close app:', e);
            }
          } else {
            // Если не на главной - переходим на главную
            navigate('/');
          }
        }
      };

      // Подписываемся на событие клика
      const unsubscribe = backButton.onClick(handleBackButtonClick);

      // Отписываемся при размонтировании
      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Page: Error setting up back button', error);
    }
  }, [back, navigate, location.pathname]);

  // Повторно запрашиваем safe area при монтировании страницы
  useEffect(() => {
    //postEvent('web_app_request_safe_area');

    // НЕ устанавливаем фон - пусть страницы сами определяют свой фон
    // document.body.style.backgroundColor = '#ffffff';
    // if (document.getElementById('root')) {
    //   document.getElementById('root')!.style.backgroundColor = '#ffffff';
    // }
  }, []);

  // Добавляем отступ снизу, если показываем TabBar
  const containerStyle = {
    ...safeAreaStyle,
    //paddingBottom: showTabBar ? 'calc(56px + env(safe-area-inset-bottom, 0) + 5px)' : 'var(--safe-area-bottom, 0px)',
  };

  return (
    <main
      className={`max-w-[600px] mx-auto page-container ${showTabBar ? 'with-tab-bar' : ''}`}
      style={containerStyle}
      ref={containerRef}
    >
      <div
        className="content-wrapper"
        style={{
          flex: 1,
        }}
      >
        {children}
      </div>
      {showSafeAreaFade && <SafeAreaFade />}
    </main>
  );
}