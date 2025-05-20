# Интеграция с Telegram Mini Apps SDK

## Обзор

Этот документ описывает подход к интеграции с Telegram Mini Apps SDK в проекте Next.js с использованием React и TypeScript. Реализация основана на официальном [шаблоне Telegram Mini Apps](https://github.com/Telegram-Mini-Apps/reactjs-template).

## Структура файлов

```
app/
  ├── utils/
  │   ├── mockEnv.ts      # Имитация окружения Telegram для разработки
  │   ├── init.ts         # Инициализация Telegram Mini Apps SDK
  │   └── telegram.ts     # Вспомогательные функции для работы с Telegram
  ├── hooks/
  │   └── useTelegram.ts  # React-хук для работы с Telegram SDK
  └── page.tsx            # Главная страница приложения с использованием SDK
```

## Инициализация Telegram SDK

В файле `app/utils/init.ts` реализованы основные функции для инициализации Telegram Mini Apps SDK:

```typescript
import { 
  setDebug, 
  restoreInitData, 
  init as initSDK, 
  mountMiniApp, 
  bindThemeParamsCssVars, 
  mountViewport, 
  bindViewportCssVars,
  retrieveLaunchParams,
  postEvent
} from '@telegram-apps/sdk';

export async function initTelegramApp(options: {
  debug?: boolean;
}): Promise<boolean> {
  try {
    // Установка режима отладки
    if (options.debug) {
      setDebug(true);
    }
    
    // Инициализация SDK
    initSDK();
    
    // Восстановление initData из localStorage или URL
    restoreInitData();
    
    // Получение параметров запуска
    const launchParams = retrieveLaunchParams();
    
    // Проверка успешной инициализации
    const isInitialized = Boolean(launchParams.initData || launchParams.initDataRaw);
    if (!isInitialized) {
      return false;
    }
    
    // Настройка компонентов SDK
    mountMiniApp().then(() => {
      bindThemeParamsCssVars();
    });
    
    mountViewport().then(() => {
      bindViewportCssVars();
    });
    
    // Отправка необходимых событий в Telegram
    postEvent('web_app_ready');
    postEvent('web_app_request_viewport');
    postEvent('web_app_request_theme');
    postEvent('web_app_request_content_safe_area');
    postEvent('web_app_setup_closing_behavior', { need_confirmation: false });
    postEvent('web_app_setup_swipe_behavior', { allow_vertical_swipe: false });
    postEvent('web_app_request_fullscreen');
    
    return true;
  } catch (error) {
    console.error('[Telegram] Ошибка при инициализации SDK:', error);
    return false;
  }
}
```

## Имитация окружения Telegram для разработки

Для тестирования Mini App вне Telegram можно использовать функцию `setupMockTelegramEnv` из файла `app/utils/mockEnv.ts`:

```typescript
import { mockTelegramEnv, isTMA, emitEvent } from '@telegram-apps/sdk';

export async function setupMockTelegramEnv() {
  // Проверка режима разработки
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Проверка наличия Telegram окружения
    const isInTelegram = await isTMA('complete');
    
    // Если не в Telegram, имитировать окружение
    if (!isInTelegram) {
      // Параметры темы
      const themeParams = {
        accent_text_color: '#6ab2f2',
        bg_color: '#17212b',
        // Другие параметры темы...
      } as const;
      
      // Имитация окружения Telegram
      mockTelegramEnv({
        onEvent(e, next) {
          // Обработчики различных событий...
        },
        launchParams: new URLSearchParams([
          // Тестовые параметры запуска...
        ]),
      });
    }
  }
}
```

## Использование в React-приложении

Пример инициализации в компоненте React (`app/page.tsx`):

```typescript
'use client';

import { useEffect } from 'react';
import { setupMockTelegramEnv } from './utils/mockEnv';
import { initTelegramApp } from './utils/init';

export default function Home() {
  // Инициализация Telegram SDK
  useEffect(() => {
    async function startApp() {
      // Имитация окружения Telegram (для разработки)
      await setupMockTelegramEnv();
      
      // Инициализация Telegram SDK
      await initTelegramApp({
        debug: process.env.NODE_ENV === 'development'
      });
    }
    
    startApp();
  }, []);
  
  // Остальной код компонента...
}
```

## React-хук useTelegram

Для удобства работы с Telegram SDK в компонентах React создан хук `useTelegram`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { parseInitData, isTelegramWebApp } from '../utils/telegram';

export function useTelegram() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [safeArea, setSafeArea] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  
  // Инициализация данных из Telegram
  useEffect(() => {
    async function initTelegram() {
      // Проверка поддержки Telegram
      const supported = isTelegramWebApp();
      setIsSupported(supported);
      
      if (supported) {
        // Получение данных пользователя
        const userData = parseInitData();
        if (userData) {
          setUser(userData);
        }
        
        setIsReady(true);
      }
    }
    
    initTelegram();
  }, []);
  
  // Прослушивание событий от Telegram
  useEffect(() => {
    // Код для обработки событий...
  }, [isSupported]);
  
  return {
    user,
    isReady,
    isSupported,
    safeArea
  };
}
```

## Получение данных пользователя

Функция `parseInitData` в `app/utils/telegram.ts` используется для получения данных пользователя:

```typescript
export function parseInitData(): TelegramUser | null {
  try {
    // Использование официального метода SDK
    const { initDataRaw, initData } = retrieveLaunchParams();
    
    // Проверка и парсинг данных
    if (initData && initData.user) {
      return {
        id: initData.user.id,
        first_name: initData.user.firstName,
        last_name: initData.user.lastName,
        username: initData.user.username,
        photo_url: initData.user.photoUrl,
        auth_date: initData.authDate ? Math.floor(initData.authDate.getTime() / 1000) : 0,
        hash: initData.hash || '',
      };
    }
    
    // Резервные варианты получения данных...
  } catch (error) {
    console.error('Ошибка при парсинге данных инициализации:', error);
    return null;
  }
}
```

## Методы Telegram Mini Apps

Основные методы для взаимодействия с Telegram:

- `postEvent('web_app_ready')` - уведомляет Telegram о готовности приложения
- `postEvent('web_app_request_fullscreen')` - запрашивает полноэкранный режим
- `postEvent('web_app_request_content_safe_area')` - запрашивает безопасную зону контента
- `postEvent('web_app_setup_swipe_behavior', {...})` - настраивает поведение свайпа
- `postEvent('web_app_open_popup', {...})` - показывает всплывающее окно

## Стилизация под Telegram

При использовании SDK можно привязать переменные темы Telegram к CSS:

```typescript
import { bindThemeParamsCssVars, bindViewportCssVars } from '@telegram-apps/sdk';

// Привязка переменных темы Telegram к CSS переменным
bindThemeParamsCssVars();

// Привязка размеров вьюпорта к CSS переменным
bindViewportCssVars();
```

После этого в CSS становятся доступны переменные вида `--tg-theme-text-color`, `--tg-viewport-height` и т.д.

## Обработка ошибок

Важно обрабатывать возможные ошибки при инициализации и взаимодействии с Telegram SDK:

```typescript
try {
  // Код, использующий Telegram SDK
} catch (error) {
  console.error('Ошибка при работе с Telegram SDK:', error);
  // Показать пользователю сообщение об ошибке
}
```

## Использование в production

В production-окружении не следует использовать функцию `mockTelegramEnv`, так как она предназначена только для локальной разработки. Проверяйте текущее окружение:

```typescript
if (process.env.NODE_ENV === 'development') {
  // Код для режима разработки
} else {
  // Код для production
}
```

## Известные проблемы и решения

- **Проблема с инициализацией в iOS/Android**: Для корректной работы на мобильных устройствах важно использовать HTTPS.
- **Ошибки типизации**: При использовании `retrieveLaunchParams()` может потребоваться явное приведение типов.
- **Различия в клиентах Telegram**: Клиенты для разных платформ имеют особенности, для macOS может потребоваться специальная обработка.

## Полезные ссылки

- [Официальная документация Telegram Mini Apps](https://docs.telegram-mini-apps.com/)
- [Репозиторий шаблона React приложения](https://github.com/Telegram-Mini-Apps/reactjs-template)
- [Документация @telegram-apps/sdk-react](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk-react) 