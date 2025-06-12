# Задача: Ручное управление прогрессом студентов

Дата: `2024-07-29`
Статус: `🟢 Выполнено`

## 1. Цель

Создать в админ-панели интерфейс для ручного управления прогрессом студентов. Это позволит переносить исторические данные о прогрессе из Telegram-чатов и гибко управлять данными студентов в будущем, включая начисление баллов и отметку о прохождении уроков.

## 2. Требования

Исходя из предоставленной схемы, требуется реализовать следующие возможности:

-   **Выбор пользователя:** Найти и выбрать конкретного студента для редактирования. (Уже реализовано в `StudentCard`).
-   **Изменение баллов:** Вручную изменить общее количество баллов студента. (Уже реализовано в `StudentCard` через `useStudentActions`).
-   **Отметка о прохождении ДЗ:** Массово или по одному отмечать уроки как "пройденные" без необходимости загружать реальное ДЗ. Это нужно для синхронизации прогресса со старой системой.

## 3. Ключевая проблема для решения

### Текущая ситуация:
Хук `useStudentDetails` загружает **только уроки с существующим прогрессом** из таблицы `lesson_progress`. Если студент никогда не начинал урок, этот урок не показывается в админке.

### Пример проблемы:
```
Студент "Иван Петров" - курс "Основы программирования"
├── Урок 1: Переменные (пройден) ✅ ← показывается
├── Урок 2: Циклы (не начат) ⬜ ← НЕ ПОКАЗЫВАЕТСЯ!
├── Урок 3: Функции (в процессе) ⏳ ← показывается  
└── Урок 4: Массивы (не начат) ⬜ ← НЕ ПОКАЗЫВАЕТСЯ!
```

**Администратор не может отметить уроки 2 и 4 как пройденные!**

### Решение:
Изменить логику в `useStudentDetails` чтобы загружать **ВСЕ уроки активного курса** и мержить их с существующим прогрессом.

## 4. Список файлов для изменения

### Основные файлы:

1. **`src/lib/supabase/hooks/useStudentActions.ts`** - ✅ **Выполнено** - Расширение хука для добавления функций управления прогрессом уроков
2. **`src/pages/AdminPage/components/StudentsManager/StudentCard.tsx`** - ✅ **Выполнено** - Модификация UI для добавления элементов управления прогрессом
3. **`src/lib/supabase/hooks/useStudentDetails.ts`** - ✅ **Выполнено** - Изменение логики для загрузки ВСЕХ уроков курса, а не только с существующим прогрессом

### Потенциальные дополнительные файлы:

4. **`src/types/index.ts`** - Добавление новых TypeScript интерфейсов, если потребуется
5. **`src/pages/AdminPage/AdminPage.css`** - Стили для новых элементов управления прогрессом (если потребуется)

### База данных:

6. **Таблица `lesson_progress`** - Будет использоваться существующая структура через Supabase

## 5. Детальный План реализации

### ✅ Шаг 1: Расширение хука `useStudentActions`

**Файл:** `src/lib/supabase/hooks/useStudentActions.ts`

1.  ✅ **Добавлены новые функции в интерфейс `StudentActionsResult`**:
    ```typescript
    export interface StudentActionsResult {
        // ... existing functions
        setLessonProgress: (studentId: string, lessonId: number, isCompleted: boolean) => Promise<void>;
        markLessonAsCompleted: (studentId: string, lessonId: number) => Promise<void>;
        markLessonAsIncomplete: (studentId: string, lessonId: number) => Promise<void>;
    }
    ```

2.  ✅ **Реализована универсальная функция `setLessonProgress`**:
    ```typescript
    const setLessonProgress = async (studentId: string, lessonId: number, isCompleted: boolean): Promise<void> => {
        const now = new Date().toISOString();
        
        const { error } = await supabase
            .from('lesson_progress')
            .upsert({
                user_id: studentId,
                lesson_id: lessonId,
                is_completed: isCompleted,
                completed_at: isCompleted ? now : null,
                started_at: now, // Устанавливаем, если записи не было
                submission_id: null // Ручное управление не связано с submissions
            }, {
                onConflict: 'user_id,lesson_id',
                ignoreDuplicates: false // Обновляем существующие записи
            });
            
        if (error) throw error;
    };
    ```

3.  ✅ **Реализованы обертки для удобства**:
    ```typescript
    const markLessonAsCompleted = async (studentId: string, lessonId: number): Promise<void> => {
        return setLessonProgress(studentId, lessonId, true);
    };
    
    const markLessonAsIncomplete = async (studentId: string, lessonId: number): Promise<void> => {
        return setLessonProgress(studentId, lessonId, false);
    };
    ```

### ✅ Шаг 2: Модификация UI в `StudentCard.tsx`

**Файл:** `src/pages/AdminPage/components/StudentsManager/StudentCard.tsx`

1.  ✅ **Интегрированы функции** `markLessonAsCompleted`, `markLessonAsIncomplete`, `resetLessonProgress` из `useStudentActions`, а также `loadStudentDetails` из `useStudentDetails`.

2.  ✅ **Добавлены массовые операции на трёх уровнях:**
    -   **Глобальные кнопки** над всеми ступенями: "Отметить все как пройденные" и "Снять все отметки"
    -   **Кнопки по ступеням** в заголовке каждой ступени: "Завершить все" и "Сбросить все"

3.  ✅ **Обновлён цикл по `lessonsByStage`** для каждой стадии:
    ```jsx
    <div className="admin-card">
      <div className="flex justify-between items-center mb-4">
        <h4 className="mb-0">{stageName}</h4>
        <div className="flex gap-2">
          <button className="admin-button admin-button-sm" onClick={() => handleStageComplete(stageName, lessons)}>
            Завершить все
          </button>
          <button className="admin-button admin-button-sm" onClick={() => handleStageReset(stageName, lessons)}>
            Сбросить все
          </button>
        </div>
      </div>
      <div className="admin-table">
        <table> ... </table>
      </div>
    </div>
    ```
    -   ✅ **В шапке таблицы** сохранены колонки: `Урок`, `Открыт`, `Срок сдачи`, `Завершен`, `Дата сдачи`, `Действие`.
    -   ✅ **В колонке «Завершен»**: сохранён текстовый статус "Да/Нет" (чекбоксы оказались неудачным UX).
    -   ✅ **В колонке «Действие»**: реализована условная логика:
        - Для **незавершённых уроков**: кнопка **"Завершить"** (зелёная, `edit-btn`)
        - Для **завершённых уроков**: кнопка **"Сбросить"** (красная, `delete-btn`)

4.  ✅ **Для отдельных строк** используется локальный `rowLoading`, чтобы блокировать только текущую кнопку во время мутации.

5.  ✅ **При bulk-операциях** блокируются все bulk-кнопки и кнопки действий, показывается индикатор загрузки.

6.  ✅ **После любой операции** вызывается `loadStudentDetails(studentId)` для обновления UI.

### ✅ Шаг 3: Обновление `useStudentDetails` (ОБЯЗАТЕЛЬНОЕ ИЗМЕНЕНИЕ)

**Файл:** `src/lib/supabase/hooks/useStudentDetails.ts`

1.  ✅ **Загружаются ВСЕ уроки активного курса**:
    ```typescript
    // Загружаем ВСЕ уроки активного курса (не только с прогрессом)
    const { data: allCourseLessons, error: allLessonsError } = await supabase
        .from('lessons')
        .select('id, name, open_at, deadline_at, has_assignment, stage_id')
        .in('stage_id', activeCourseStageIds);
    ```

2.  ✅ **Мержится с существующим прогрессом**:
    ```typescript
    const lessonProgressData = allCourseLessons.map(lesson => {
        const progress = progressData?.find(p => p.lesson_id === lesson.id);
        const stageInfo = stagesOfActiveCourse?.find(s => s.id === lesson.stage_id);
        
        return {
            stage_id: lesson.stage_id,
            stage_name: stageInfo?.name || 'Неизвестная стадия',
            lesson_id: lesson.id,
            lesson_name: lesson.name,
            open_at: lesson.open_at,
            deadline_at: lesson.deadline_at,
            is_completed: progress?.is_completed || false, // ← false если нет прогресса
            completed_at: progress?.completed_at || null,
            has_assignment: lesson.has_assignment || false,
        };
    });
    ```

**Результат:** Администратор увидит ВСЕ уроки курса, включая неначатые.

## 6. ✅ Итоговая реализация

### Что получилось:

1. **✅ Полная видимость уроков** - администратор видит ВСЕ уроки активного курса, включая неначатые
2. **✅ Гибкое управление прогрессом** - можно отмечать уроки как завершённые и сбрасывать прогресс
3. **✅ Массовые операции на трёх уровнях:**
   - Глобально (все уроки студента)
   - По ступеням (все уроки конкретной ступени)
   - Индивидуально (каждый урок отдельно)
4. **✅ Интуитивный UX** - кнопки меняются в зависимости от статуса урока
5. **✅ Надёжная обработка ошибок** - с подтверждениями и информативными сообщениями
6. **✅ Блокировка UI** - во время операций интерфейс корректно блокируется

### Использование:

Администратор теперь может:
- Переносить исторические данные из Telegram-чатов, отмечая пройденные уроки
- Корректировать прогресс студентов при необходимости
- Массово управлять прогрессом по ступеням для удобства
- Видеть полную картину прогресса студента по всем урокам курса