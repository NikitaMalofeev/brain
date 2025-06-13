// Типы для Telegram Web App API
declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                postEvent?: (eventType: string, eventData: any) => void;
                initData?: string;
                initDataUnsafe?: any;
                openTelegramLink?: (url: string) => void;
            };
        };
    }
}

export { }; 