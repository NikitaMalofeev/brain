import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logger } from '@/lib/logger';

// Тип для контекста приложения
interface AppContextType {
    isTelegramApp: boolean;
    allowBrowserAccess: boolean;
    showAppContent: boolean;
}

// Создаем контекст с начальными значениями
const AppContext = createContext<AppContextType>({
    isTelegramApp: false,
    allowBrowserAccess: false,
    showAppContent: false,
});

// Провайдер контекста для оборачивания приложения
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Проверяем, запущено ли приложение внутри Telegram
    const [isTelegramApp, setIsTelegramApp] = useState<boolean>(false);

    // Можно ли показывать контент в браузере (из env переменных)
    const [allowBrowserAccess, setAllowBrowserAccess] = useState<boolean>(false);

    // Определяем, показывать ли содержимое приложения
    const [showAppContent, setShowAppContent] = useState<boolean>(false);

    useEffect(() => {
        // Проверка для Telegram
        const telegramCheck = typeof window !== 'undefined' && !!window.Telegram;
        setIsTelegramApp(telegramCheck);
        logger.debug(`isTelegramApp check: ${telegramCheck}`);

        // Проверка разрешения для браузера из env
        const browserAllowed = process.env.NEXT_PUBLIC_ALLOW_BROWSER_ACCESS === 'true';
        setAllowBrowserAccess(browserAllowed);
        logger.info('allowBrowserAccess:', { browserAllowed, envValue: process.env.NEXT_PUBLIC_ALLOW_BROWSER_ACCESS });

        // Комбинированная проверка для отображения контента
        const canShowContent = telegramCheck || browserAllowed;
        setShowAppContent(canShowContent);
        logger.info('showAppContent:', { canShowContent });
    }, []);

    return (
        <AppContext.Provider
            value={{
                isTelegramApp,
                allowBrowserAccess,
                showAppContent
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

// Хук для использования контекста в компонентах
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}; 