# Архитектура проекта (версия: июль 2024)

---

## Логические основания
- **Вещь**: Telegram Mini App для йоги и медитаций с системой квиза и рекомендаций
- **Свойства**: Интерактивность, персонализация, realtime, интеграция с Telegram, Supabase, Kinescope, админка, покрытие квиза, best practices
- **Отношения**: Пользователь ↔ Практики, Квиз ↔ Рекомендации, MCP ↔ Supabase ↔ Frontend, Dev ↔ Prod, Контент ↔ Категории/Типы, Админ ↔ CRUD

---

## 1. Общий обзор

- **Технологии**: React + TypeScript, Vite, Supabase (DB + Realtime + Storage), @telegram-apps/sdk-react, @telegram-apps/telegram-ui, Kinescope, MCP (Supabase, Context7), Railway/Vercel (деплой)
- **Dev/Prod отличия**: локально — .env.local, dev MCP, мок-режим Telegram; прод — переменные в Vercel, боевой Supabase, все MCP через prod endpoints
- **Realtime**: все ключевые данные (users, quiz_steps, quiz_answers, contents) обновляются через Supabase Realtime (WebSocket)
- **MCP**: для работы с Supabase, получения логов, миграций, анализа структуры БД, генерации типов, диагностики

---

## 2. Структура файлов (июль 2024)

```
reactjs-template/
  src/
    components/         # UI-компоненты (AppWrapper, Player, TabBar, ...)
    contexts/           # React-контексты (User, Quiz, Player)
    css/                # Стили
    helpers/            # Вспомогательные функции, утилиты
    lib/                # Внешние клиенты (supabase, hooks, utils)
      supabase/
        client.ts       # Инициализация клиента Supabase
        hooks/          # Хуки для работы с Supabase
        types.ts        # Типы для Supabase
    navigation/         # Маршрутизация
    pages/              # Страницы приложения (Index, Profile, Admin, QuizFlow, Practice, ...)
    ...
  public/               # Статика
  docs/                 # Документация (architecture.md, SHORT_PLANNING.md, TASK.md, ...)
    APP_LOGIC_DOCS/     # Логика флоу, схемы, SQL, паттерны
    lib_docs/           # Документация по библиотекам, интеграциям
  ...                   # Конфиги, env, скрипты
```

---

## 3. Архитектура приложения

### 3.1 Основные сущности
- **User**: Telegram user, хранится в Supabase (public.users), авторизация через initData
- **Practice**: Контент (видео, аудио, таймер), хранится в contents, связан с категориями и типами
- **Quiz**: Пошаговый квиз (quiz_steps, quiz_answers), логика фильтрации — quiz_logic
- **Admin**: Панель управления практиками, квизом, пользователями, категориями

### 3.2 Контексты и State Management
- **UserContext**: данные пользователя, сессия, realtime
- **QuizContext**: состояние квиза, шаги, выбранные параметры, сохранение в localStorage
- **PlayerContext**: состояние плеера (тип, прогресс, fullscreen, ...)

### 3.3 Realtime паттерны
- Все ключевые таблицы подписаны на realtime через Supabase (channel, on('postgres_changes'))
- Используется debounce/throttle для предотвращения каскадных обновлений и мерцания UI
- Все подписки корректно очищаются при размонтировании
- Пример паттерна — см. ниже

---

## 4. База данных (Supabase)

### 4.1 Основные таблицы
- **users**: id, telegram_id, имя, username, фото, last_login, ...
- **contents**: id, title, description, duration, thumbnail_url, content_type_id, category_id, kinescope_id, audio_file_path, ...
- **categories**: id, name, slug, description, display_order, ...
- **content_types**: id, name, slug, description
- **quiz_steps**: id, order, title, type, is_active
- **quiz_answers**: id, question_id, value, label, order
- **quiz_logic**: id, practice_type, duration_min, duration_max, goal, approach, content_id, priority
- **user_quiz_history**: id, user_id, practice_type, duration, goal, approach, content_id, completed, created_at
- **user_stats**: id, user_id, total_practices, total_duration, last_practice_at, streak_days, max_streak_days, practice_stats

### 4.2 Связи
- contents.category_id → categories.id
- contents.content_type_id → content_types.id
- quiz_logic.content_id → contents.id
- user_quiz_history.user_id → users.id
- user_quiz_history.content_id → contents.id
- user_stats.user_id → users.id

### 4.3 Особенности
- RLS включен для categories, content_types; отключен для users, contents
- Все миграции и структура БД документируются в APP_LOGIC_DOCS/database_schema.md
- MCP используется для анализа, миграций, генерации типов

---

## 5. Квиз: логика, покрытие, рекомендации

### 5.1 Архитектура квиза
- Все шаги и опции — quiz_steps, quiz_answers (реалтайм, управляется через админку)
- Логика фильтрации — quiz_logic (SQL + JS)
- История рекомендаций — user_quiz_history (и user_recommended_contents, если внедрим)
- Для каждой комбинации параметров квиза должна быть хотя бы одна практика (контроль покрытия)
- В админке — раздел "Пустые ветки квиза" для быстрого наполнения

### 5.2 Пример фильтрации (JS+SQL)
- На каждом шаге квиза фильтруем contents по выбранным параметрам (тип, длительность, цель, подход, ...)
- Если несколько совпадений — выбираем по приоритету или рандомно
- Если нет совпадений — логируем параметры (для анализа дыр)

### 5.3 Генерация всех комбинаций
- Используется утилита (helpers/quizCombinations.ts) для генерации всех возможных комбинаций параметров
- В админке подсвечиваются "дыры" (нет практики для комбинации)

---

## 6. Realtime: паттерны и хаки

- Все подписки через supabase.channel('...').on('postgres_changes', ...)
- Используем useRef для хранения каналов, debounce для обновлений
- Пример:
```typescript
const channelRef = useRef<RealtimeChannel | null>(null);
const lastUpdateTimeRef = useRef<number>(0);

channelRef.current = supabase.channel('users_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 200) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setState(newState);
      debounceTimerRef.current = null;
    }, 300);
    lastUpdateTimeRef.current = now;
  })
  .subscribe();

useEffect(() => () => {
  if (channelRef.current) channelRef.current.unsubscribe();
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
}, []);
```
- Все realtime хаки и edge-cases описаны в APP_LOGIC_DOCS/db_changes.md

---

## 7. MCP, environment, dev/prod

- MCP (Supabase, Context7) используется для:
  - Миграций, анализа структуры, генерации типов
  - Получения логов, диагностики, тестирования
- Все переменные окружения описаны в architecture.md и .env.example
- Для dev/prod окружения — отдельные ключи, URL, MCP endpoints
- Для Vercel: все env переменные прописаны в настройках проекта
- Для Railway: аналогично, если используется

---

## 8. Админка: структура, UX, best practices

- Вся работа с практиками, квизом, пользователями — через /admin (route защищен)
- В админке:
  - CRUD для практик (contents)
  - CRUD для категорий, типов
  - Управление шагами и опциями квиза (quiz_steps, quiz_answers)
  - Раздел "Пустые ветки квиза" (контроль покрытия)
  - Загрузка медиа (Kinescope, Supabase Storage)
  - Просмотр и изменение прав пользователей
- Все действия мгновенно отражаются на фронте (реалтайм)
- UX: скрытие TabBar, быстрый доступ к нужным разделам, фильтры, поиск, подсветка дыр

---

## 9. Плееры: видео, аудио, таймер

- **VideoPlayer**: Kinescope, fullscreen, управление прогрессом, громкостью, скоростью
- **AudioPlayer**: аудио-медитации, прогресс-бар, визуализация, фон
- **TimerPlayer**: самостоятельные медитации, круговой таймер, визуальные подсказки
- Все плееры управляются через PlayerContext, поддерживают mobile UX

---

## 10. Хаки, edge-cases, best practices

- Всегда проверять dev/prod окружение (env, MCP, Supabase)
- Для realtime — использовать debounce/throttle, фильтрацию дубликатов
- Для квиза — не допускать "пустых" веток, использовать утилиту генерации комбинаций
- Для админки — защищать route, логировать все действия
- Для деплоя — всегда проверять переменные окружения, MCP endpoints, актуальность миграций
- Все хаки и edge-cases документировать в APP_LOGIC_DOCS/db_changes.md и соответствующих разделах

---

## 11. Чеклисты и контроль

- Все чеклисты по квизу, БД, плеерам, админке — в SHORT_PLANNING.md и TASK.md
- Перед пушем — smoke-тест, сверка покрытия квиза, проверка realtime, деплой на Vercel

---

## 12. Последняя верификация

- **Дата**: 14.07.2024
- **Ответственный**: AI + Leogelv
- **Статус**: Актуально, покрытие 100%, все хаки и edge-cases отражены

--- 