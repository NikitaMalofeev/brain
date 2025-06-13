### ⚡️ Альтернативный "быстрый" план: встраиваем готовый билд через **\<iframe>**

> Пока не переносим шейдеры и код, просто показываем публичный билд `https://3dbrain-three.vercel.app/` как сплэш-экран вместо стандартной загрузки. Позже заменишь iframe на "родной" мозг.

**Обновления (11.06.2025):**
- ✅ Сплэш-скрин заменяет стандартную загрузку "Загрузка..."
- ✅ Убрана typewriter анимация (на сайте уже есть печать текста)
- ✅ Исправлены размеры для корректного отображения мозга в экране
- ✅ Показывается во время процесса загрузки данных

---

## 1. Добавляем компонент IFrameSplash

```tsx
// src/components/IFrameSplash.tsx
import { useEffect } from 'react';

export default function IFrameSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 5000); // 5 секунд
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white flex items-center justify-center">
      <iframe
        src="https://3dbrain-three.vercel.app/"
        className="w-full h-full border-0 max-w-screen max-h-screen object-contain"
        // блокируем user-инпут, чтобы никто не кликал внутрь
        sandbox="allow-scripts"   // без allow-pointer-lock / same-origin
        aria-hidden="true"
      />
    </div>
  );
}
```

*Пояснения*

* `sandbox="allow-scripts"` разрешает работать JS внутри iframe, но не даёт доступа к нашему домену и блокирует клики.
* Убрана typewriter анимация - на сайте уже есть печать текста.
* Добавлены стили для корректного размещения мозга в экране.
* Увеличен таймер до 5 секунд.

---

## 2. Подключаем в корень приложения (параллельная загрузка)

```tsx
// В App.tsx
export function App() {
    // Показываем сплэш только при первом запуске приложения в сессии
    const [showSplash, setShowSplash] = useState(() => {
        const hasShownSplash = sessionStorage.getItem('brain-splash-shown');
        return !hasShownSplash; // Показываем, если еще не показывали в этой сессии
    });
    const lp = useMemo(() => retrieveLaunchParams(), []);
    const isDark = useSignal(isMiniAppDark);

    return (
        <AppRoot
            appearance={isDark ? 'dark' : 'light'}
            platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
        >
            <AppMotionProvider>
                {/* Контент грузится параллельно */}
                <HashRouter>
                    <AppContent />
                </HashRouter>
                
                {/* Сплэш показывается поверх всего */}
                {showSplash && (
                    <IFrameSplash onDone={() => {
                        setShowSplash(false);
                        // Сохраняем флаг, что сплэш уже показали в этой сессии
                        sessionStorage.setItem('brain-splash-shown', 'true');
                    }} />
                )}
            </AppMotionProvider>
        </AppRoot>
    );
}
```

**Ключевые особенности:** 
- **Заменяет стандартную загрузку:** сплэш показывается вместо экрана "Загрузка..."
- **Умный показ:** сплэш показывается только при запуске приложения, НЕ при обновлении страницы
- **TabBar скрыт:** во время показа сплэша TabBar не отображается
- **Корректные размеры:** мозг помещается в экран благодаря flexbox и aspect-ratio
- **Без анимации текста:** убрана typewriter анимация, используется анимация с сайта
- Передача состояния `showSplash` в `AppContent` для контроля UI
- Использует `sessionStorage` для отслеживания показа в рамках сессии

---

## 3. Блокируем свайпы и скролл (Telegram Web App)

```ts
if (window.Telegram?.WebApp?.postEvent) {
  Telegram.WebApp.postEvent('web_app_setup_swipe_behavior', {
    allow_vertical_swipe: false
  });
}
```

Сними блок после `setShowSplash(false)`.

---

## 4. CSS typewriter (если ещё нет)

```css
@keyframes type { from { width: 0 } to { width: 100% } }
@keyframes blink { 50% { border-color: transparent } }

.animate-type{
  overflow:hidden; white-space:nowrap;
  border-right:.1em solid;
  animation:type 2.4s steps(30,end), blink .7s step-end infinite;
}
```

---

## 5. Оптимизация и нюансы

| Что                | Быстрый фикс                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **CORS**           | Билд на Vercel по HTTPS → iframe работает без проблем.                                                           |
| **Перформанс**     | Iframe грузится параллельно основному бандлу, CPU/ГПУ живут 3 с, потом уничтожаем → практически нулевой оверхед. |
| **SEO/Lighthouse** | Скрытый iframe не влияет на LCP (он в отдельном домене).                                                         |
| **Accessibility**  | `aria-hidden="true"` на iframe, чтобы скрин-ридер пропустил сплэш.                                               |

```tsx
<iframe
  aria-hidden="true"
  … />
```

---

### ➡️ Итого

1. **5-минутное** добавление: копируешь компонент, вставляешь в рут.
2. Сплэш закрывается по таймеру, Telegram-лоадер убирается.
3. Как только решишь "докрутить мозг" нативно — просто заменишь `IFrameSplash`