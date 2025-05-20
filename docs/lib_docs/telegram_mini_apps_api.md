# Telegram Mini Apps API - Документация

## Важные методы API

Данная документация содержит описание ключевых методов Telegram Mini Apps API, необходимых для разработки мини-приложений для Telegram. Особое внимание уделено методам работы с safe area.

### Основная терминология

- **Safe Area** - безопасная зона экрана устройства, которая учитывает вырезы, закругленные углы и системные элементы интерфейса. Это пространство всего устройства, где можно безопасно размещать контент без перекрытия системными элементами.

> **ВАЖНО**: В проекте используется **Safe Area** с дополнительным отступом 40px сверху при активированном fullscreen режиме.

## Методы для работы с Safe Area

### `web_app_request_safe_area`

**Доступно с версии**: v8.0

Запрашивает информацию о текущей safe area (безопасной зоне) от Telegram.

В результате Telegram вызывает событие `safe_area_changed`.

Пример использования:
```typescript
import { postEvent } from '@telegram-apps/sdk-react';

postEvent('web_app_request_safe_area');
```

## События Safe Area

### `safe_area_changed`

**Доступно с версии**: v8.0

Событие происходит при изменении безопасной зоны в приложении Telegram пользователя, например, при переключении в альбомный режим.

**Safe area** предотвращает перекрытие контента системными элементами UI, такими как выемки или навигационные панели.

| Поле  | Тип      | Описание                                                        |
|-------|----------|----------------------------------------------------------------|
| top   | `number` | Верхний отступ в пикселях                                      |
| bottom| `number` | Нижний отступ в пикселях                                       |
| left  | `number` | Левый отступ в пикселях                                       |
| right | `number` | Правый отступ в пикселях                                      |

## Fullscreen режим и дополнительный отступ

В проекте применяется дополнительный отступ сверху при активном fullscreen режиме, чтобы избежать проблем с интерфейсом Telegram:

```typescript
// Устанавливаем дополнительный отступ для fullscreen
document.documentElement.style.setProperty('--fullscreen-extra-padding', '40px');
```

Этот дополнительный отступ добавляется к верхней safe area через CSS-переменную:

```css
paddingTop: 'calc(var(--safe-area-top, 0px) + var(--fullscreen-extra-padding, 0px))'
```

## Применение Safe Area в CSS

Для использования значений safe area в CSS, рекомендуется применять CSS переменные. Telegram Mini Apps SDK автоматически создает соответствующие CSS переменные при инициализации:

```css
:root {
  /* Базовые значения Safe Area */
  --safe-area-top: 0px;
  --safe-area-right: 0px;
  --safe-area-bottom: 0px;
  --safe-area-left: 0px;
  
  /* Дополнительный отступ для fullscreen режима */
  --fullscreen-extra-padding: 0px;
}

/* Пример использования переменных (рекомендуемый подход) */
.page-container {
  padding-top: calc(var(--safe-area-top, 0px) + var(--fullscreen-extra-padding, 0px));
  padding-right: var(--safe-area-right, 0px);
  padding-bottom: var(--safe-area-bottom, 0px);
  padding-left: var(--safe-area-left, 0px);
}
```

## Другие полезные методы

### `web_app_request_fullscreen`

**Доступно с версии**: v8.0

Запрашивает полноэкранный режим для мини-приложения.

Пример использования:
```typescript
import { postEvent } from '@telegram-apps/sdk-react';

postEvent('web_app_request_fullscreen');
```

### `web_app_exit_fullscreen`

**Доступно с версии**: v8.0

Запрашивает выход из полноэкранного режима для мини-приложения.

Пример использования:
```typescript
import { postEvent } from '@telegram-apps/sdk-react';

postEvent('web_app_exit_fullscreen');
```

### `web_app_setup_swipe_behavior`

**Доступно с версии**: v7.7

Устанавливает поведение свайпов.

| Поле                | Тип      | Описание                                          |
|----------------------|----------|------------------------------------------------------|
| allow_vertical_swipe | `boolean` | Разрешает закрытие приложения вертикальным свайпом. |

Пример использования:
```typescript
import { postEvent } from '@telegram-apps/sdk-react';

// Отключить вертикальные свайпы для закрытия приложения
postEvent('web_app_setup_swipe_behavior', { allow_vertical_swipe: false });

// Включить вертикальные свайпы (поведение по умолчанию)
postEvent('web_app_setup_swipe_behavior', { allow_vertical_swipe: true });
```

## Изменение переменной fullscreen-extra-padding

Если требуется изменить значение дополнительного отступа, необходимо отредактировать файл `src/components/AppWrapper.tsx`:

```typescript
// Устанавливаем дополнительный отступ для fullscreen
document.documentElement.style.setProperty('--fullscreen-extra-padding', '40px');
```

Для обычного режима значение должно быть `0px`:

```typescript
document.documentElement.style.setProperty('--fullscreen-extra-padding', '0px');
```

## Ссылки на официальную документацию

- [Telegram Mini Apps Platform Documentation](https://github.com/Telegram-Mini-Apps/telegram-apps/tree/master/apps/docs/platform)
- [Telegram Mini Apps Methods](https://github.com/Telegram-Mini-Apps/telegram-apps/blob/master/apps/docs/platform/methods.md)
- [Telegram Mini Apps Events](https://github.com/Telegram-Mini-Apps/telegram-apps/blob/master/apps/docs/platform/events.md) 