# 💡 Offline Mode — Идеи и Архитектура

## ✅ Реализовано (2025-06-12)

На данный момент реализован только **фундамент** для определения доступности Supabase. Дальнейшая интеграция mock-режима приостановлена.

### `useSupabaseDetector`
- **Что это:** Кастомный хук `src/hooks/useSupabaseDetector.ts`, который проверяет, доступен ли бэкенд Supabase.
- **Как работает:**
  - Периодически (раз в 10 секунд) отправляет запрос к публичной таблице `courses` (`/rest/v1/courses?select=id&limit=1`).
  - Использует **anon-key** для аутентификации запроса, что решает проблему с ошибкой 401 Unauthorized.
  - **Считает Supabase недоступным только** в случае сетевой ошибки (network error) или таймаута (3 секунды).
  - **Считает Supabase доступным** при получении любого HTTP-ответа (включая 4xx/5xx ошибки), так как это означает, что сам сервис жив.
- **Статус:** **Готово и стабильно.** Хук можно использовать в будущем для включения mock-режима или отображения баннера о недоступности.

---

## Зачем нужен offline mode?
- Пользователь может продолжать обучение/просмотр материалов даже при временной потере интернета (метро, поезд, проблемы с Supabase).
- Улучшение UX: нет фрустрации от "Загрузка..." и потери прогресса.
- Повышение лояльности и конкурентоспособности.

---

## UX-паттерны
- **Автоматическое определение offline/online:**
  - Показывать баннер "Нет соединения" (или иконку) при потере связи.
  - В оффлайне — только кэшированные страницы/уроки/материалы.
- **Синхронизация прогресса:**
  - Все действия пользователя (отметки о прохождении, баллы, заметки) сохраняются локально и отправляются на сервер при появлении интернета.
- **Ограничения:**
  - В оффлайне нельзя: регистрироваться, менять тариф, получать новые материалы.
  - Можно: читать ранее открытые уроки, отмечать прогресс, смотреть кэшированные материалы.

---

## Техническая реализация

### 1. Детектор offline/online
- Использовать `window.navigator.onLine` + слушать события `online`/`offline`.
- Хранить глобальный флаг (React Context или Zustand): `isOnline`.

### 2. Кэширование данных
- **IndexedDB** (через библиотеку типа `idb-keyval` или `localforage`) для хранения:
  - Списка уроков, этапов, материалов (JSON)
  - Прогресса пользователя (локальные изменения)
- **Service Worker** (PWA):
  - Кэшировать статику (JS, CSS, иконки, картинки обложек)
  - Кэшировать API-ответы (GET-запросы к Supabase)

### 3. Синхронизация
- При появлении интернета:
  - Отправлять все локальные изменения на сервер (batch-режим)
  - Инвалидировать кэш и обновлять данные
- Конфликты решать по принципу "последний wins" или показывать пользователю выбор

### 4. UI/UX
- Баннер/иконка "Вы оффлайн"
- Индикатор синхронизации (например, "3 действия ожидают отправки")
- Disable/grey-out для функций, которые не работают без интернета

---

## Ограничения и риски
- **Безопасность:** нельзя хранить чувствительные данные (токены, пароли) в открытом виде
- **Объём кэша:** ограничен браузером (~50-100 МБ)
- **PWA-режим:** не все пользователи ставят приложение как PWA, но базовый offline-режим можно реализовать и без этого

---

## Минимальный план mock-режима при падении Supabase

### 1. Проверка только Supabase
- Реализовать хук `useSupabaseDetector`, который пингует Supabase (например, health endpoint или быструю query).
- Глобальный флаг: `isSupabaseAvailable` (true/false).
- Если Supabase недоступен (`!isSupabaseAvailable`) — включать mock-режим (UI, мок-данные, отключение лоадера).

### 2. Интеграция с хуками и страницами
- В каждом хуке/странице, где есть загрузка данных из Supabase:
  - Используй универсальный хелпер для лаконичного возврата mock-данных, если Supabase недоступен.

### 3. UI/UX
- (Опционально) Показывать баннер "Supabase недоступен".
- Все анимации и переходы должны работать независимо от статуса Supabase.

---

## Универсальный хелпер для mock-режима

Чтобы не писать везде if (!isSupabaseAvailable) ..., используй хелпер:

```ts
// src/hooks/useWithSupabaseFallback.ts
import { useSupabaseDetector } from '@/hooks/useSupabaseDetector';

export function useWithSupabaseFallback<T>(realData: T, mockData: T): T {
  const { isSupabaseAvailable } = useSupabaseDetector();
  return isSupabaseAvailable ? realData : mockData;
}
```

### Пример использования в хуке
```ts
import { useWithSupabaseFallback } from '@/hooks/useWithSupabaseFallback';

export function useLibraryStages(/* ... */) {
  // ...получаем реальные данные из Supabase
  const realData = { /* ... */ };
  const mockData = { /* ... */ };
  return useWithSupabaseFallback(realData, mockData);
}
```

### Пример использования на странице
```ts
import { useWithSupabaseFallback } from '@/hooks/useWithSupabaseFallback';

const stages = useWithSupabaseFallback(realStages, mockStages);
```

---

**TODO:**
- [ ] Реализовать useSupabaseDetector
- [ ] Добавить mock-режим в хуки и страницы на основе isSupabaseAvailable
- [ ] Отключить "вечную загрузку" при падении Supabase
- [ ] (Опционально) Добавить баннер "Supabase недоступен"

---

**Резюме:**
- Проверяем только Supabase.
- Если Supabase недоступен — включаем mock-режим и отключаем лоадер.
- Интернет/offline-режим пока не учитываем.

## Примеры mock-данных для offline/dev-offline

### 1. Хуки данных

#### src/lib/supabase/hooks/useSupabaseUser.ts
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

export function useSupabaseUser(/* ... */) {
  const { isOnline } = useOfflineDetector();
  if (!isOnline) {
    // Мок-юзер
    return {
      supabaseUser: {
        id: 'mock-user',
        onboarding_completed: true,
        name: 'Mock User',
        email: 'mock@user.com',
        // ...другие нужные поля
      },
      loading: false,
      error: null,
      refetch: () => {},
    };
  }
  // ...реальная логика
}
```

#### src/lib/supabase/hooks/useActiveTariff.ts
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

export function useActiveTariff(/* ... */) {
  const { isOnline } = useOfflineDetector();
  if (!isOnline) {
    return {
      data: {
        tariff_code: 'mock-tariff',
        name: 'Тестовый тариф',
        expires_at: '2099-12-31',
        // ...другие нужные поля
      },
      isLoading: false,
      error: null,
      refetch: () => {},
    };
  }
  // ...реальная логика
}
```

#### src/lib/supabase/hooks/useLibraryStages.ts
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

export function useLibraryStages(/* ... */) {
  const { isOnline } = useOfflineDetector();
  if (!isOnline) {
    return {
      stages: [
        {
          stage_id: 'stage1',
          title: 'Мок-ступень 1',
          is_unlocked: true,
          lessons: [
            { lesson_id: 'lesson1', title: 'Мок-урок 1', is_completed: false },
            { lesson_id: 'lesson2', title: 'Мок-урок 2', is_completed: true },
          ],
        },
        {
          stage_id: 'stage2',
          title: 'Мок-ступень 2',
          is_unlocked: false,
          lessons: [],
        },
      ],
      loading: false,
      error: null,
      refetch: () => {},
    };
  }
  // ...реальная логика
}
```

#### src/lib/supabase/hooks/useStudentDetails.ts
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

export function useStudentDetails(/* ... */) {
  const { isOnline } = useOfflineDetector();
  if (!isOnline) {
    return {
      student: {
        id: 'mock-student',
        name: 'Mock Student',
        progress: [
          { lesson_id: 'lesson1', is_completed: true },
          { lesson_id: 'lesson2', is_completed: false },
        ],
        points: 100,
        // ...другие нужные поля
      },
      loading: false,
      error: null,
      refetch: () => {},
    };
  }
  // ...реальная логика
}
```

### 2. Страницы и списки

#### src/pages/MainPage/MainPage.tsx
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

const { isOnline } = useOfflineDetector();
const stages = isOnline
  ? realStages // твои реальные данные
  : [
      { stage_id: 'stage1', title: 'Мок-ступень 1', is_unlocked: true },
      { stage_id: 'stage2', title: 'Мок-ступень 2', is_unlocked: false },
    ];
// Используй stages для рендера карточек
```

#### src/pages/LibraryPage/StagePage.tsx
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

const { isOnline } = useOfflineDetector();
const lessons = isOnline
  ? realLessons // твои реальные данные
  : [
      { lesson_id: 'lesson1', title: 'Мок-урок 1', is_completed: false },
      { lesson_id: 'lesson2', title: 'Мок-урок 2', is_completed: true },
    ];
// Используй lessons для рендера списка уроков
```

#### src/pages/LibraryPage/LessonPage.tsx
```ts
import { useOfflineDetector } from '@/hooks/useOfflineDetector';

const { isOnline } = useOfflineDetector();
const lesson = isOnline
  ? realLesson // твои реальные данные
  : {
      lesson_id: 'lesson1',
      title: 'Мок-урок 1',
      content: 'Это пример содержимого урока в offline-режиме.',
      is_completed: false,
    };
// Используй lesson для рендера страницы урока
```

---

(Опционально) Если карточки получают данные через пропсы — ничего делать не надо. Если сами делают запросы — добавь аналогичную проверку с mock-данными.

---

**Резюме:**
- В каждом хуке/странице добавляй проверку `isOnline` и возвращай mock-данные, если offline.
- Это позволит тестировать анимации и UI даже при падении Supabase.
