# Устранение проблем с инициализацией Telegram Mini Apps

## Основные проблемы

Ниже описаны распространенные проблемы, с которыми можно столкнуться при разработке Telegram Mini Apps, и способы их решения.

## 1. Приложение определяется как запущенное вне Telegram

### Симптомы
- Сообщение "Приложение запущено вне Telegram"
- В логах: `hasTelegramWebApp: false` или `isInTelegram: false`
- Не удается получить данные пользователя

### Возможные причины
1. **Запуск напрямую в браузере**, а не внутри Telegram
2. **Неверная инициализация SDK**
3. **Проблемы с `isTMA` или `isTelegramWebApp`** при проверке окружения
4. **Различия в разных клиентах Telegram**

### Решения

#### Использование mockEnv для локальной разработки

Добавьте файл `mockEnv.ts` для имитации Telegram окружения:

```typescript
import { mockTelegramEnv, isTMA, emitEvent } from '@telegram-apps/sdk';

export async function setupMockTelegramEnv() {
  // Только в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    const isInTelegram = await isTMA('complete');
    console.log('[Telegram] Проверка окружения:', { isInTelegram });
    
    // Если не в Telegram, имитируем окружение
    if (!isInTelegram) {
      mockTelegramEnv({
        // Конфигурация имитации...
      });
    }
  }
}
```

Вызывайте эту функцию в начале инициализации вашего приложения:

```typescript
async function startApp() {
  // Имитируем окружение для разработки
  await setupMockTelegramEnv();
  
  // Остальная инициализация...
}
```

#### Правильная последовательность инициализации

```typescript
// 1. Инициализировать SDK
initSDK();

// 2. Восстановить initData из localStorage
restoreInitData();

// 3. Отправить "ready" событие в Telegram
postEvent('web_app_ready');

// 4. Запросить необходимые параметры
postEvent('web_app_request_viewport');
postEvent('web_app_request_theme');
postEvent('web_app_request_content_safe_area');
```

#### Проверка окружения с использованием нескольких методов

```typescript
function isTelegramEnvironment() {
  if (typeof window === 'undefined') return false;
  
  // Проверка разными способами
  const hasTelegram = 'Telegram' in window;
  const hasTelegramWebApp = hasTelegram && 'WebApp' in window.Telegram!;
  const hasWebViewProxy = 'TelegramWebviewProxy' in window;
  
  console.log('[Telegram] Проверка WebApp:', {
    isInFrame: window !== window.parent,
    hasTelegramWebApp,
    hasTelegramProxy: hasWebViewProxy,
    hasReferer: Boolean(document.referrer),
    result: hasTelegramWebApp || hasWebViewProxy
  });
  
  return hasTelegramWebApp || hasWebViewProxy;
}
```

## 2. Не удается получить данные пользователя (initData)

### Симптомы
- `parseInitData()` возвращает `null`
- В логах: "Отсутствуют данные пользователя в initData"
- В параметрах `launchParams`: отсутствуют поля `user` или `initData`

### Возможные причины
1. **Неправильный формат initData** в URL или localStorage
2. **Проблемы с parseInitData** функцией
3. **Вызов функции до инициализации** SDK

### Решения

#### Использование retrieveLaunchParams() с проверками

```typescript
function parseInitData(): TelegramUser | null {
  try {
    // Получаем данные с помощью официального метода SDK
    const { initDataRaw, initData } = retrieveLaunchParams();
    console.log('[Telegram] Init Data:', { 
      hasInitData: Boolean(initData), 
      hasInitDataRaw: Boolean(initDataRaw),
      userData: initData?.user ? 'присутствует' : 'отсутствует'
    });
    
    // Проверка и преобразование данных
    if (initData && initData.user) {
      return {
        id: initData.user.id,
        first_name: initData.user.firstName,
        // Остальные поля...
      };
    }
    
    // Запасной вариант - парсинг initDataRaw
    if (initDataRaw) {
      return parseInitDataString(initDataRaw);
    }
    
    return null;
  } catch (error) {
    console.error('[Telegram] Ошибка при получении данных пользователя:', error);
    return null;
  }
}
```

#### Добавление отладочной информации

```typescript
function checkInitDataAvailability() {
  if (typeof window === 'undefined') return;
  
  // Проверяем URL параметры
  const urlParams = new URLSearchParams(window.location.search);
  const hasInitDataInURL = urlParams.has('initData') || urlParams.has('tgWebAppData');
  
  // Проверяем WebApp объект
  const hasWebApp = 'Telegram' in window && 'WebApp' in window.Telegram!;
  const hasInitDataInWebApp = hasWebApp && Boolean(window.Telegram?.WebApp?.initData);
  
  // Проверяем localStorage
  const hasInitDataInStorage = Boolean(localStorage.getItem('tma-init-data'));
  
  console.log('[Telegram] Доступность initData:', {
    inURL: hasInitDataInURL,
    inWebApp: hasInitDataInWebApp,
    inStorage: hasInitDataInStorage
  });
}
```

#### Использование restoreInitData

Функция `restoreInitData()` восстанавливает данные из localStorage, что может помочь при повторном открытии приложения:

```typescript
// Нужно вызвать до использования retrieveLaunchParams()
restoreInitData();
```

## 3. Проблемы с безопасностью и HTTPS

### Симптомы
- Mini App не загружается в мобильных клиентах
- Ошибки Mixed Content в консоли
- Сообщения о проблемах с сертификатом

### Решения

#### Настройка локального HTTPS сервера для разработки

Для Next.js можно использовать параметр `--experimental-https`:

```json
{
  "scripts": {
    "dev:https": "next dev --experimental-https"
  }
}
```

Для Vite (как в шаблоне Telegram Mini Apps):

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  server: {
    https: process.env.HTTPS === 'true',
  },
  plugins: [
    process.env.HTTPS === 'true' && mkcert(),
    // Другие плагины...
  ]
});
```

В `package.json`:

```json
{
  "scripts": {
    "dev:https": "cross-env HTTPS=true vite"
  }
}
```

## 4. Различия между клиентами Telegram

### Проблемы с macOS клиентом

Клиент Telegram для macOS имеет особенности при работе с Mini Apps:

```typescript
// Пример обработки macOS-специфичных проблем
if (platform === 'macos') {
  // Специальная обработка для macOS клиента
  let firstThemeSent = false;
  mockTelegramEnv({
    onEvent(event, next) {
      if (event[0] === 'web_app_request_theme') {
        // macOS может не отвечать на запрос темы
        let themeParams = {};
        if (firstThemeSent) {
          themeParams = themeParamsState();
        } else {
          firstThemeSent = true;
          themeParams = retrieveLaunchParams().tgWebAppThemeParams;
        }
        return emitEvent('theme_changed', { theme_params: themeParams });
      }
      
      if (event[0] === 'web_app_request_safe_area') {
        // macOS может создавать некорректное событие для safe_area
        return emitEvent('safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
      }
      
      next();
    },
  });
}
```

## 5. Отладка и логирование

### Добавление отладочных событий

```typescript
function showDebugPopup(title: string, message: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    postEvent('web_app_open_popup', {
      title,
      message,
      buttons: [
        { id: 'ok', type: 'ok' }
      ]
    });
    
    console.log(`[Debug Popup] ${title}: ${message}`);
  } catch (error) {
    console.error('[Telegram] Ошибка при показе отладочного окна:', error);
  }
}
```

### Использование eruda на мобильных устройствах

Для отладки на мобильных устройствах можно использовать библиотеку eruda:

```typescript
// В файле инициализации
if (debug && ['ios', 'android'].includes(platform)) {
  import('eruda').then(({ default: eruda }) => {
    eruda.init();
    eruda.position({ x: window.innerWidth - 50, y: 0 });
  });
}
```

## 6. Контрольный список для проверки инициализации

✅ **Проверьте окружение**
   - `isTMA('complete')` или `isTelegramWebApp()`
   - Отладочная информация об окружении

✅ **Проверьте последовательность инициализации**
   - `initSDK()`
   - `restoreInitData()`
   - `postEvent('web_app_ready')`

✅ **Проверьте наличие initData**
   - URL параметры: `initData` или `tgWebAppData`
   - `window.Telegram.WebApp.initData`
   - localStorage: `tma-init-data`

✅ **Проверьте форматирование и парсинг**
   - Корректный парсинг JSON данных пользователя
   - Обработка ошибок при парсинге

✅ **Проверьте сетевые запросы**
   - HTTPS для production и мобильных клиентов
   - Отсутствие Mixed Content ошибок

## Полезные ссылки

- [Официальная документация Telegram Mini Apps](https://docs.telegram-mini-apps.com/)
- [Telegram Mini Apps SDK](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk)
- [Документация по initData](https://docs.telegram-mini-apps.com/platform/init-data)
- [Шаблон React приложения](https://github.com/Telegram-Mini-Apps/reactjs-template) 