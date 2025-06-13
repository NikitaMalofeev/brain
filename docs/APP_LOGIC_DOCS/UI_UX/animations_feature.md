## 🎬 Motion-upgrade playbook


> **TL;DR** Используем **Framer Motion** v11. Ниже — готовый чек-лист где, как и что правим.
> Трогаем **только** основной пользовательский поток, **без админки** и **без аудио/видео плееров**.

---

### 0. Подготовка окружения

```bash
npm i framer-motion@^11          # или pnpm / yarn
```

Создай файл `src/animations/motionConfig.ts`:

```ts
import { MotionConfig } from 'framer-motion';

export const AppMotionProvider = ({ children }: { children: React.ReactNode }) => (
  <MotionConfig
    transition={{ type: 'spring', damping: 20, stiffness: 250 }}
    reducedMotion="user"      // уважение prefers-reduced-motion
  >
    {children}
  </MotionConfig>
);
```

---

### 1. Core-level — плавные переходы между страницами

| Шаг | Файл                          | Действие                                                                                                                                                                                        |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | **`src/components/App.tsx`**  | ① Импорт `AnimatePresence` и `AppMotionProvider`. ② Обернуть всё приложение <br>`tsx<br><AppMotionProvider> <HashRouter> <AnimatePresence mode="wait"> … `                                      |
|     |                               |                                                                                                                                                                                                 |
| 1.2 | **`src/components/Page.tsx`** | Сделать корневой див страницой-контейнером `motion.main`, добавить variants `initial="exit" animate="enter" exit="exit"` (fade + 10 px slide-up). Путь к файлу подтверждён списком репозитория  |

**Эффект**
`fade → up` (из доков Motion *quick-start*). При `back()` анимация автоматически реверсируется («wait»-режим AnimatePresence).

---

### 2. Навигация внизу (TabBar)

| Шаг | Файл                                   | Действие                                                                                                                                                                                |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | **`src/components/TabBar/TabBar.tsx`** | а) Под линией активной вкладки рендерим `motion.div` (layout shared-id `"tabCursor"`) для **скольжения** индикатора, <br>б) на иконки — небольшой scale-tap `{ whileTap:{ scale:.9 } }` |
| 2.2 | **`TabBar.css`**                       | убрать transition, чтобы всё контролировал Motion.                                                                                                                                      |

**Эффект**
`layout` cursor → «подвижная капсула» под активной иконкой, + ощущение «упругости» при тапе.

---

### 3. Карточки списков

| Компонент                       | Файлы                                      | Анимации                                                                                                                                                     |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stage Card** (главная)        | `src/components/StageCard/StageCard.tsx`   | `whileTap={{ scale:.97 }}`; «пружину» берёт из MotionConfig.                                                                 |
| **Lesson Card** (список уроков) | `src/components/LessonCard/LessonCard.tsx` | ① обернуть корневой `<Ripple>`-контейнер в `motion.div layout`, <br>② добавить `initial={{ opacity:0, y:20 }}` + stagger-children через родителя (см ниже).  |

---

### 4. Списки со стаггером

| Экран                     | Файл                                   | Код-скетч |
| ------------------------- | -------------------------------------- | --------- |
| Главная (список ступеней) | `src/pages/MainPage/MainPage.tsx`      |           |
| Ступень (список уроков)   | `src/pages/LibraryPage/StagePage.tsx`  |           |

Добавь в обоих:

```tsx
const list = motion.ul({ variants:{
  show:{transition:{staggerChildren:0.06}},
}});
const item = { hidden:{opacity:0, y:15}, show:{opacity:1, y:0} };
…
return <list initial="hidden" animate="show">
  {items.map(i => <motion.li variants={item} key={i.id}><LessonCard … /></motion.li>)}
</list>
```

---

### 5. Мелочи, но приятно

| Где                                 | Файл                                                                                                                                                  | Что делаем                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| «accordion» блоки на странице урока | `src/pages/LibraryPage/LessonPage.tsx` → `BlockItem`                                                                                                  | стрелка уже крутится через CSS; меняем на `motion.img rotate` и `animate={collapsed?{rotate:90}:{rotate:0}}` для «без дёрганий»  |
| NativeModal, Toast, SafeAreaFade    | не требуют правок логики — достаточно заменить CSS-fade на `animate` пропы в существующих компонентах (файлы: `NativeModal.tsx`, `SafeAreaFade.tsx`). |                                                                                                                                  |

---

### 6. Полный список файлов, которые мы **изменяем / добавляем**

```
# new
src/animations/motionConfig.ts

# modified
src/components/App.tsx
src/components/Page.tsx
src/components/TabBar/TabBar.tsx
src/components/TabBar/TabBar.css
src/components/StageCard/StageCard.tsx
src/components/LessonCard/LessonCard.tsx
src/pages/MainPage/MainPage.tsx
src/pages/LibraryPage/StagePage.tsx
src/pages/LibraryPage/LessonPage.tsx
src/components/NativeModal.tsx
src/components/SafeAreaFade/SafeAreaFade.tsx
```

*(пути взяты из репо-списка )*

---

### 7. Какие эффекты вообще доступны (и где их применяем)

| Категория             | Примеры из Framer Motion                            | Где используем                             |
| --------------------- | --------------------------------------------------- | ------------------------------------------ |
| **Entrance / exit**   | `fade`, `slideUp`, `scaleFade`, `clipPath`          | Page transitions, списки                   |
| **Gestures**          | `whileTap`, `drag`, `dragConstraints` | StageCard, LessonCard                      |
| **Layout animations** | `layout`, `layoutId` (shared)                       | TabBar cursor, reorder list (в дальнейшем) |
| **Scroll-based**      | `useScroll`, `useTransform`                         | *не нужен в MVP*                           |
| **Presence**          | `AnimatePresence` modes `wait` / `popLayout`        | модальные окна, роуты                      |
| **Reduced-motion**    | `reducedMotion="user"`                              | глобально через MotionConfig               |

---

### 8. Что **не** анимируем

* админка (`/admin…`) — исключена
* любые плееры (`VideoPlayer`, `NewPlayer`, Wavesurfer) — оставляем нетронутыми
* heavy-load графики или canvases — вне скоупа

---

### 9. Проверка

1. `npm run dev` → пройти сценарий: Главная → Ступень → Урок → назад.
2. Lighthouse Performance ≥ 90 (анимации не должны рвать FPS).
3. `prefers-reduced-motion` вручную в DevTools → проверить, что всё статично.