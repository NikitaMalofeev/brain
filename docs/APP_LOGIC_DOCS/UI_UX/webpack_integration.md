## 🛠️ Полная «дорожная карта» переноса 3D-Brain в Brain Programming

Ниже ‒ пошагово, без пробелов, чтобы «завелось» с первого выстрела.

---

### A. Подготовка

1. **Клонируй оба репозитория** или открой их рядом, чтобы было удобно копировать файлы.
2. Обновись до Node ≥ 18 и pnpm / npm ≥ 9.

---

### B. Копируем исходники 3D-Brain

| Что                                                                | Куда (в Brain Programming) | Зачем                                                            |
| ------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------- |
| `3dbrain/src/shaders/*.vert / *.frag`                              | `src/3dbrain/shaders/`     | Вершинный + фрагментный шейдеры `particle.vert / particle.frag`  |
| `3dbrain/src/scripts/**/*` (App, WebGLView, Particles, Utils)      | `src/3dbrain/`             | Логика отрисовки, партиклы и т. д.                               |
| `3dbrain/static/images/sample-01.png` (или текущую текстуру мозга) | `public/images/`           | Маска‐изображение, по которому строятся частицы                  |

> ⚠️ Сохрани относительную структуру путей внутри папки `3dbrain`, чтобы импорты не поехали.

---

### C. Ставим зависимости

```bash
cd brain-programming
npm i three gsap glslify @brunoimbrizi/controlkit
npm i -D vite-plugin-glsl
```

---

### D. Настраиваем Vite / TS

`vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    react(),
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
      compress: false              // оставляем читаемым
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          brain: ['three', 'gsap', 'glslify']
        }
      }
    }
  },
  assetsInclude: ['**/*.glsl', '**/*.vert', '**/*.frag'],
  publicDir: 'public'              // где лежит sample-01.png
});
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],            // уже было
      "@3dbrain/*": ["3dbrain/*"]
    }
  }
}
```

---

### E. Патчим код 3D-Brain

1. **`App.ts` (или `App.js`)**

   ```ts
   export default class App {
     private renderer!: THREE.WebGLRenderer;
     private raf?: number;

     init(container: HTMLElement) {
       this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
       container.appendChild(this.renderer.domElement);
       this.onResize();
       window.addEventListener('resize', () => this.onResize());

       // обычная инициализация сцены, камеры, частиц
       this.animate = this.animate.bind(this);
       this.raf = requestAnimationFrame(this.animate);
     }

     private animate() {
       // ... update / render
       this.raf = requestAnimationFrame(this.animate);
     }

     private onResize() {
       const { clientWidth: w, clientHeight: h } = this.renderer.domElement.parentElement!;
       this.renderer.setSize(w, h);
       // camera.aspect = w / h; camera.updateProjectionMatrix();
     }

     destroy() {
       if (this.raf) cancelAnimationFrame(this.raf);
       this.renderer.dispose();
       this.renderer.domElement.remove();
       window.removeEventListener('resize', this.onResize);
     }
   }
   ```

2. **Импорты шейдеров** — заменяем `require()` на ESM:

   ```ts
   import vert from '@3dbrain/shaders/particle.vert';
   import frag from '@3dbrain/shaders/particle.frag';

   const material = new THREE.RawShaderMaterial({
     vertexShader: vert,
     fragmentShader: frag,
     uniforms,
     transparent: true
   });
   ```

3. Удали старый webpack-конфиг — он больше не нужен.

---

### F. Делаем React-компонент Splash

`src/components/BrainSplash.tsx`

```tsx
import { useEffect, useRef } from 'react';
import BrainApp from '@3dbrain/App';

export default function BrainSplash({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new BrainApp();
    app.init(ref.current!);

    const t = setTimeout(onDone, 3000);         // ровно 3 с
    return () => {
      clearTimeout(t);
      app.destroy();
    };
  }, [onDone]);

  return (
    <div ref={ref} className="fixed inset-0 z-50 bg-black select-none">
      <span className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-lg text-white animate-type">
        Brain Programming → Activated
      </span>
    </div>
  );
}
```

---

### G. Подключаем глобальный флаг

```tsx
// AppContext.tsx
const [showSplash, setShowSplash] = useState(true);
```

В корне приложения:

```tsx
const BrainSplash = lazy(() => import('@/components/BrainSplash'));

{showSplash && (
  <BrainSplash onDone={() => {
    setShowSplash(false);
    miniAppReady.ifAvailable?.();           // Telegram WebApp handshake
  }} />
)}
```

---

### H. Анимации и CSS

`src/styles/brainSplash.css`

```css
@keyframes type { from { width: 0 } to { width: 100% } }
@keyframes blink { 50% { border-color: transparent } }

.animate-type{
  overflow:hidden; white-space:nowrap;
  border-right:.1em solid;
  animation:type 2.4s steps(30,end), blink .7s step-end infinite;
}
```

Импортируй файл в `main.tsx` или в компонент.

---

### I. Блокируем свайпы в Telegram

```ts
if (window.Telegram?.WebApp?.postEvent) {
  Telegram.WebApp.postEvent('web_app_setup_swipe_behavior', {
    allow_vertical_swipe: false
  });
}
```

Вызови сразу после монтирования сплэша; снимай блок после его скрытия.

---

### J. Оптимизируем бандл

* Vite уже кладёт `three`, `gsap`, `glslify` в отдельный chunk `brain.[hash].js` (см. `manualChunks` выше).
* Шейдеры инлайн-строками, так что дополнительного HTTP-запроса нет.

---

### K. Финальное тестирование

1. **Локально**

   ```bash
   npm run dev
   ```

   Открой [http://localhost:5173](http://localhost:5173) → смотри, что сплэш грузится 3 с, анимация в норме.

2. **WebApp**

   * Залей preview‐билд в Vercel / Netlify.
   * В Telegram Mini App проверь: пока мозг крутится, остаётся синий Telegram-ловдскрин; после `onDone` → `miniAppReady()` ‒ синий экран исчезает.

3. **Lighthouse** — LCP ≈ 2-2.5 с.

4. **Mobile GPU** — убедись, что 30 FPS+ на iPhone 8 / Android 11.

---

### L. Частые грабли и их лечение

| Симптом                              | Причина / фикс                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| «Cannot resolve \*.vert / \*.frag»   | Забыли `vite-plugin-glsl` или `assetsInclude`.                                                                                                |
| Чёрный экран, WebGL контекст потерян | На мобилке `renderer.getContext().isContextLost()` – снизь размер канваса (`renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))`). |
| Ошибка `import controlkit`           | Пакет UMD-only. Импортируй так:<br>`import('controlkit').then(mod => new mod.default())`.                                                     |
| Telegram-лоадер не пропадает         | Не вызвали `miniAppReady.ifAvailable?.()` после сплэша.                                                                                       |
| Splash растягивается / кроп          | В `onResize()` не обновили `camera.aspect`.                                                                                                   |

---

## 🎉 Всё!

Следуй шагам сверху — и «мозг» будет красиво появляться при каждом запуске Brain Programming. Если что-то пойдёт не так, пиши — разрулим.
