import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { openExternalLink } from '@/helpers/openExternalLink';

interface WebViewContextType {
  openWebView: (url: string) => void;
  closeWebView: () => void;
}

const WebViewContext = createContext<WebViewContextType | null>(null);

/**
 * Провайдер для WebView - оборачивает приложение
 * Использует Telegram WebApp API для открытия ссылок во внутреннем браузере
 */
export const WebViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const openWebView = useCallback((url: string) => {
    // Используем Telegram WebApp API для открытия во внутреннем браузере
    openExternalLink(url);
  }, []);

  const closeWebView = useCallback(() => {
    // Пустая функция - браузер Telegram закрывается пользователем
  }, []);

  return (
    <WebViewContext.Provider value={{ openWebView, closeWebView }}>
      {children}
    </WebViewContext.Provider>
  );
};

/**
 * Хук для открытия ссылок во внутреннем браузере Telegram
 */
export const useWebView = (): WebViewContextType => {
  const context = useContext(WebViewContext);
  if (!context) {
    throw new Error('useWebView must be used within WebViewProvider');
  }
  return context;
};
