# План рефакторинга: Убрать сущность "Ступени", оставить "Уроки → Блоки"

## Текущая структура
```
Модуль → Ступень (course_stages) → Урок (lessons) → Блоки (lesson_blocks)
```

## Целевая структура
```
Модуль → Урок (lessons) → Блоки (lesson_blocks)
```

## Почему этот подход лучше:
- `lesson_blocks` (228 записей) — УЖЕ привязаны к урокам, ничего не трогаем
- `assignments` (99 записей) — УЖЕ привязаны к урокам, ничего не трогаем
- `submissions` (2 записи) — УЖЕ привязаны к урокам, ничего не трогаем
- Таблицы связанные со stages (`tariff_limits`, `user_stage_progress`, `user_stage_unlocks`, `tariff_stage_access`) — ВСЕ ПУСТЫЕ!

---

## ФАЗА 1: БД — Привязать lessons напрямую к модулям

### 1.1 Добавить `stream_module_id` в таблицу `lessons`
```sql
-- Добавляем колонку
ALTER TABLE lessons ADD COLUMN stream_module_id UUID REFERENCES stream_modules(id);

-- Заполняем из course_stages
UPDATE lessons l
SET stream_module_id = cs.stream_module_id
FROM course_stages cs
WHERE l.stage_id = cs.id AND cs.stream_module_id IS NOT NULL;

-- Создаём индекс для быстрых запросов
CREATE INDEX idx_lessons_stream_module_id ON lessons(stream_module_id);
```

### 1.2 Сделать `stage_id` nullable (для постепенного перехода)
```sql
ALTER TABLE lessons ALTER COLUMN stage_id DROP NOT NULL;
```

---

## ФАЗА 2: Обновление RPC функций

### Функции которые нужно обновить (используются в коде):
| Функция | Хук | Что изменить |
|---------|-----|--------------|
| `get_library_stages_optimized` | `useLibraryStages.ts` | Переименовать в `get_module_lessons`, убрать JOIN с course_stages |
| `get_user_accessible_lessons_optimized` | `useStageDetails.ts` | Убрать JOIN с course_stages, брать lessons по stream_module_id |
| `get_user_stream_modules` | `useUserStreamModules.ts` | Убрать course_stages, брать lessons напрямую |
| `copy_stream_with_config` | Админка | Копировать lessons напрямую без stages |
| `get_lesson_assignment_progress` | `useAssignments.ts` | Без изменений (уже работает с lessons) |

### Функции которые можно удалить (не используются или пустые данные):
- `can_user_access_stage` → заменить на `can_user_access_lesson`
- `unlock_stage_for_user` — таблица `user_stage_unlocks` пустая
- `check_and_unlock_advanced_stages`
- `trigger_check_stage_unlock`

---

## ФАЗА 3: Обновление хуков

### 3.1 Обновить:
- `useModuleStages.ts` → `useModuleLessons.ts` — получать lessons по stream_module_id
- `useLibraryStages.ts` — переименовать RPC вызов
- `useStageDetails.ts` — убрать логику stages

### 3.2 Удалить неиспользуемое:
- Любые хуки работающие с `user_stage_progress` (таблица пустая)

---

## ФАЗА 4: Обновление TypeScript типов

### Файл: `src/lib/supabase/types.ts`

```typescript
// Обновить Lesson - добавить stream_module_id
interface Lesson {
  id: number;
  stream_module_id?: string;  // NEW - прямая связь с модулем
  stage_id?: number;          // DEPRECATED - оставить для совместимости
  name: string;
  // ... остальные поля без изменений
}
```

---

## ФАЗА 5: Обновление админки

### 5.1 TariffModuleLessonsManager.tsx
**Было:**
- Кнопка "Создать ступень" → внутри "Добавить урок"
- Два уровня: Ступень → Урок

**Станет:**
- Кнопка "Создать урок" (сразу создаёт lesson с stream_module_id)
- Один уровень: Уроки модуля

### 5.2 Изменения в UI:
- Убрать Collapse со ступенями
- Показывать уроки сразу в виде списка/сетки
- BlocksManager — без изменений (уже работает с lesson_id)

---

## ФАЗА 6: Обновление frontend для пользователей

### Минимальные изменения:
- `ModuleStagesPage.tsx` — переименовать в `ModuleLessonsPage.tsx`, убрать группировку по stages
- `LessonCard.tsx` — без изменений
- `LessonPage.tsx` — без изменений

---

## ФАЗА 7: Очистка (ТОЛЬКО после полного тестирования)

### 7.1 Удалить пустые таблицы:
```sql
DROP TABLE IF EXISTS tariff_stage_access;
DROP TABLE IF EXISTS user_stage_unlocks;
DROP TABLE IF EXISTS user_stage_progress;
DROP TABLE IF EXISTS tariff_limits;
```

### 7.2 Удалить course_stages (когда всё работает):
```sql
-- Сначала убрать FK
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_stage_id_fkey;
ALTER TABLE lessons DROP COLUMN stage_id;

-- Потом удалить таблицу
DROP TABLE IF EXISTS course_stages;
```

### 7.3 Удалить неиспользуемые RPC функции

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

1. **ФАЗА 1** — БД: добавить stream_module_id в lessons, заполнить данные
2. **ФАЗА 2** — Обновить RPC функции
3. **ФАЗА 4** — Обновить TypeScript типы
4. **ФАЗА 3** — Обновить хуки
5. **ФАЗА 5** — Обновить админку
6. **ФАЗА 6** — Обновить frontend
7. **ФАЗА 7** — Очистка (через неделю после деплоя)

---

## ЧТО НЕ ТРОГАЕМ (уже работает с lessons):
- `lesson_blocks` — 228 записей, связь с lessons ✅
- `assignments` — 99 записей, связь с lessons ✅
- `submissions` — 2 записи, связь с lessons ✅
- `assignment_drafts` — 2 записи ✅
- `lesson_progress` — 1 запись ✅
- `tariff_lesson_access` — 0 записей, но структура правильная ✅
- `BlocksManager.tsx` — уже работает с lesson_id ✅

---

## ОЦЕНКА ОБЪЁМА РАБОТ (УПРОЩЁННАЯ)

- **Миграции БД**: 1-2 SQL файла
- **RPC функции**: 3-4 функции обновить
- **Хуки**: 2-3 файла
- **Админка**: 1 компонент (TariffModuleLessonsManager)
- **Frontend**: 1-2 страницы

**Общая оценка**: ~10-15 файлов вместо 30!
