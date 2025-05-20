import { FC, useEffect, ReactNode } from 'react';
import { postEvent } from '@telegram-apps/sdk-react';

interface AppWrapperProps {
  children: ReactNode;
}

interface SafeAreaData {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const AppWrapper: FC<AppWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Автоматически включаем полноэкранный режим на всех страницах
    postEvent('web_app_request_fullscreen');
    
    // Отключаем вертикальные свайпы для закрытия приложения 
    postEvent('web_app_setup_swipe_behavior', { allow_vertical_swipe: false });
    
    // Запрашиваем информацию о safe area
    postEvent('web_app_request_safe_area');
    
    // Подписываемся на события используя window.addEventListener
    const handleEvents = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;
          
        if (data.eventType === 'safe_area_changed' && data.eventData) {
          // Убираем логи safe area, они очень часто повторяются
          applySafeAreaToCSS(data.eventData);
        } else if (data.eventType === 'viewport_changed') {
          // Обновляем состояние fullscreen, но убираем логи
          if (data.eventData && data.eventData.is_expanded) {
            document.documentElement.style.setProperty('--fullscreen-extra-padding', '40px');
          } else {
            document.documentElement.style.setProperty('--fullscreen-extra-padding', '0px');
          }
        }
      } catch (e) {
        console.error('Error parsing event data:', e);
      }
    };
    
    window.addEventListener('message', handleEvents);
    
    // Снижаем частоту запросов для уменьшения логов
    const intervalId = setInterval(() => {
      postEvent('web_app_request_safe_area');
      postEvent('web_app_request_viewport');
    }, 15000); // Увеличиваем до 15 секунд
    
    // Устанавливаем дополнительный отступ для fullscreen
    document.documentElement.style.setProperty('--fullscreen-extra-padding', '40px');
    
    // Очистка подписок при размонтировании
    return () => {
      window.removeEventListener('message', handleEvents);
      clearInterval(intervalId);
      postEvent('web_app_exit_fullscreen');
    };
  }, []);
  
  // Применяет safe area к CSS переменным
  const applySafeAreaToCSS = (safeArea: SafeAreaData) => {
    const { top, right, bottom, left } = safeArea;
    
    // Убираем лишний лог про применение значений
    
    // Проверяем, что все значения числовые и не undefined
    const topValue = typeof top === 'number' ? `${top}px` : '0px';
    const rightValue = typeof right === 'number' ? `${right}px` : '0px';
    const bottomValue = typeof bottom === 'number' ? `${bottom}px` : '0px';
    const leftValue = typeof left === 'number' ? `${left}px` : '0px';
    
    document.documentElement.style.setProperty('--safe-area-top', topValue);
    document.documentElement.style.setProperty('--safe-area-right', rightValue);
    document.documentElement.style.setProperty('--safe-area-bottom', bottomValue);
    document.documentElement.style.setProperty('--safe-area-left', leftValue);
    
    // Убираем лишний лог про установку CSS-переменных
  };
  
  // Теперь мы не применяем стили отступов здесь, это делает компонент Page
  return <>{children}</>;
}; 