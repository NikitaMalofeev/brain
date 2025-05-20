import { useMemo, FC, useEffect, useState } from 'react';
import {
  initDataState as _initDataState,
  useSignal,
} from '@telegram-apps/sdk-react';
import { useNavigate } from 'react-router-dom';

// Пользовательские компоненты и хуки
import { Page } from '@/components/Page';
import Stats from '@/components/Stats';
import AuthStatusIndicator from '@/components/AuthStatusIndicator';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { logger } from '@/lib/logger';

// Стили
import './MainScreen.css';

// Компонент загрузки
const LoadingState: FC = () => (
  <div className="loading-container">
    <div className="loading-spinner" aria-hidden="true" />
    <p className="loading-text">Загрузка данных...</p>
  </div>
);

// Компонент ошибки
const ErrorState: FC<{ message: string }> = ({ message }) => (
  <div className="error-container">
    <div className="error-icon" aria-hidden="true">⚠️</div>
    <h2 className="error-title">Ошибка</h2>
    <p className="error-message">{message}</p>
  </div>
);

// Компонент предупреждения для браузера
const BrowserWarning: FC = () => (
  <div className="browser-warning">
    <h2 className="warning-title">Только для Telegram</h2>
    <p className="warning-message">Это приложение доступно только в Telegram Mini Apps.</p>
  </div>
);

export const MainScreen: FC = () => {
  const initDataState = useSignal(_initDataState);
  const { supabaseUser, loading, error } = useSupabaseUser(initDataState);
  const navigate = useNavigate();
  const [contentVisible, setContentVisible] = useState(false);

  // Применяем анимацию появления контента
  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        setContentVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  // Проверяем запуск в телеграме
  const isTelegramApp = useMemo(() => {
    const result = typeof window !== 'undefined' && !!window.Telegram;
    logger.debug(`isTelegramApp check: ${result}`);
    return result;
  }, []);

  // Проверяем, можно ли показывать содержимое в браузере
  const allowBrowserAccess = useMemo(() => {
    const allowed = process.env.NEXT_PUBLIC_ALLOW_BROWSER_ACCESS === 'true';
    logger.info('allowBrowserAccess:', { allowed, envValue: process.env.NEXT_PUBLIC_ALLOW_BROWSER_ACCESS });
    return allowed;
  }, []);

  // Определяем, показывать ли содержимое приложения
  const showAppContent = useMemo(() => {
    const result = isTelegramApp || allowBrowserAccess;
    logger.info('showAppContent:', { result });
    return result;
  }, [isTelegramApp, allowBrowserAccess]);

  // Определяем пользователя из initDataState
  const user = useMemo(() =>
    initDataState && initDataState.user ? initDataState.user : undefined,
  [initDataState]);

  // Обработчик для кнопки выбора практики
  const handleSelectPractice = () => {
    navigate('/quiz');
  };

  // Если это не Telegram App и не разрешен доступ в браузере, показываем предупреждение
  if (!showAppContent) {
    logger.warn('Access denied: not in Telegram app and browser access not allowed');
    return (
      <Page back={false}>
        <div className="main-screen">
          <BrowserWarning />
        </div>
      </Page>
    );
  }

  // Если данные пользователя загружаются
  if (loading) {
    return (
      <Page back={false}>
        <div className="main-screen">
          <LoadingState />
        </div>
      </Page>
    );
  }

  // Если есть ошибка при получении данных
  if (error) {
    return (
      <Page back={false}>
        <div className="main-screen">
          <ErrorState message={error.message} />
        </div>
      </Page>
    );
  }

  // Если нет данных пользователя
  if (!user) {
    return (
      <Page back={false}>
        <div className="main-screen">
          <ErrorState message="Не удалось получить данные пользователя из Telegram" />
        </div>
      </Page>
    );
  }

  return (
    <Page back={false}>
      <div className={`main-screen ${contentVisible ? 'content-visible' : ''}`}>
        {/* Верхний блок с аватаром и именем пользователя */}
        <div className="user-header">
          <div className="user-info">
            <div className="user-avatar">
              {user.photo_url ? (
                <img src={user.photo_url} alt={user.username || user.first_name} loading="lazy" />
              ) : (
                <div className="user-avatar-placeholder" aria-hidden="true">{user.first_name.charAt(0)}</div>
              )}
            </div>
            <div className="user-name">
              {user.first_name}
              <AuthStatusIndicator isAuthenticated={!!supabaseUser} className="ml-2" />
            </div>
          </div>
          <div className="like-button">
            3 <span className="heart-icon" aria-hidden="true">❤</span>
          </div>
        </div>

        {/* Блок статистики и кнопка выбора практики */}
        <Stats
          strength={3}
          practiceMinutes={100}
          daysInFlow={7}
          onSelectPractice={handleSelectPractice}
        />
      </div>
    </Page>
  );
}; 