import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { openExternalLink } from '@/helpers/openExternalLink';

interface WebViewContextType {
  openWebView: (url: string) => void;
  closeWebView: () => void;
}

const WebViewContext = createContext<WebViewContextType | null>(null);

/**
 * Провайдер для WebView - оборачивает приложение
 * Открывает ссылки в браузере Telegram
 */
export const WebViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const openWebView = useCallback((url: string) => {
    openExternalLink(url);
  }, []);

  const closeWebView = useCallback(() => {
    // Пустая функция - браузер закрывается пользователем
  }, []);

  return (
    <WebViewContext.Provider value={{ openWebView, closeWebView }}>
      {children}
    </WebViewContext.Provider>
  );
};

/**
 * Хук для открытия ссылок в браузере Telegram
 */
export const useWebView = (): WebViewContextType => {
  const context = useContext(WebViewContext);
  if (!context) {
    throw new Error('useWebView must be used within WebViewProvider');
  }
  return context;
};
