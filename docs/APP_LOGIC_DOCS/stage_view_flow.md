# 🧩 Stage View Flow (ОБНОВЛЕНО 04.06.2025)
**Экран: "Ступень" / Детализация этапа обучения**

---

## 🎯 Цель флоу

Позволить пользователю зайти в конкретную ступень курса, изучить список уроков с реальными обложками из Supabase Storage и перейти к их просмотру или выполнению задания через архитектуру has_assignment.

---

## 🧠 Пользовательский опыт (реализованный UI)

### Структура экрана StagePage

**Дизайн и размеры:**
- **Ширина:** максимум 375px по центру
- **Фон:** #F1F1F1 (светло-серый)
- **Отступы:** 16px padding
- **С TabBar:** показывает нижнюю навигацию

**Элементы экрана (сверху вниз):**

#### 1. Заголовок ступени
```typescript
<h1 style={{
  fontFamily: 'Inter',
  fontWeight: 700,
  fontSize: '28px',
  color: '#1a1a1a',
  textAlign: 'left'
}}>
  {stageDetails.stage_name}
</h1>
```

#### 2. Прогресс ступени
```typescript
<div style={{
  fontSize: '16px',
  color: '#4a4a4a',
  marginBottom: '24px'
}}>
  {completed_lessons} из {total_lessons} завершено
</div>
```

#### 3. Предупреждение о жизнях (если lives_remaining = 0)
```
┌─────────────────────────────────┐
│ ⚠️ У вас осталось 0 жизней!     │ ← Красный блок
│    Будьте осторожны с дедлайнами│
└─────────────────────────────────┘
```

#### 4. Список уроков (LessonCard компоненты)
- **Размер карточки:** 171px высота обложки + информация
- **Статусы:** "Завершено" / "Доступно" / "Заблокированно"
- **Иконка замка:** для заблокированных уроков на обложке
- **Метка "Задание":** синий бейдж если has_assignment = true (поле в таблице lessons)
- **Обложки уроков:** Реальные изображения из Supabase Storage через buildFileUrl()
- **Диагностика:** Логи загрузки изображений в консоли браузера для отладки

#### 5. Пустое состояние
```
В этой ступени пока нет уроков
```

---

## ⚙️ Логика (реализованная)

### 🔐 Доступ к урокам (последовательная разблокировка)

```typescript
// Логика разблокировки уроков
let isUnlocked = false;
if (index === 0) {
  // Первый урок всегда разблокирован
  isUnlocked = true;
} else {
  // Остальные уроки разблокированы, если предыдущий урок завершен
  const previousLessonCompleted = !!progressMap.get(previousLessonId);
  isUnlocked = previousLessonCompleted;
}
```

### 🔴 Предупреждение о жизнях

```typescript
const livesRemaining = supabaseUser?.lives_remaining ?? 3;
const showLivesWarning = livesRemaining === 0;

// Показывается красный блок с предупреждением, но НЕ блокирует доступ
```

---

### 📥 Загрузка данных (useStageDetails хук) - реализовано

```typescript
// 1. Данные ступени
const stageData = await supabase
  .from('course_stages')
  .select('id, name, description')
  .eq('id', stageId)
  .single();

// 2. Все уроки ступени (реализовано: добавлены has_assignment и cover_image_path)
const allLessonsData = await supabase
  .from('lessons')
  .select(`
    id,
    name,
    description,
    order_num,
    has_assignment,
    cover_image_path
  `)
  .eq('stage_id', stageId)
  .order('order_num');

// 3. Прогресс пользователя по урокам
const progressData = await supabase
  .from('lesson_progress')
  .select('lesson_id, completed_at')
  .eq('user_id', user.id)
  .in('lesson_id', lessonIds);

// 4. УБРАНО: Блоки заданий больше не используются
// has_assignment теперь поле в таблице lessons
```

### 📊 Структура данных - реализовано

```typescript
interface LessonData {
  lesson_id: number;
  lesson_name: string;
  content_type: string;        // 'mixed' для всех уроков
  cover_image_path?: string;   // реализовано: путь к обложке в Supabase Storage
  order_num: number;
  has_assignment: boolean;     // реализовано: поле из таблицы lessons
  is_completed: boolean;       // Есть ли запись в lesson_progress
  is_unlocked: boolean;        // Логика последовательности
  completion_date?: string;
}

interface StageDetailsData {
  stage_id: number;
  stage_name: string;
  stage_description: string;
  total_lessons: number;
  completed_lessons: number;
  is_unlocked: boolean;        // Всегда true пока
  lessons: LessonData[];
}
```

---

## 🔄 Действия пользователя

### 1. Клик на доступный урок

```typescript
const handleLessonClick = (lessonId: number) => {
  navigate(`/library/lesson/${lessonId}`);
};
```

- **Переход:** `/library/lesson/{lesson_id}`
- **Контент:** Все блоки урока + FixedSubmissionForm (если has_assignment = true)
- **Завершение урока:** Кнопка "Урок пройден" (если has_assignment = false)
- **Навигация:** Кнопка "Вернуться ко всем урокам ступени" после сдачи/завершения

### 2. Клик на заблокированный урок

```typescript
if (lesson.is_unlocked) {
  onClick(lesson.lesson_id);
} else {
  console.log('Урок заблокирован. Завершите предыдущий урок для разблокировки.');
}
```

- **Действие:** Ничего не происходит
- **Визуально:** opacity: 0.6, cursor: 'not-allowed'

### 3. Предупреждение о жизнях

- **Показывается:** Красный блок с предупреждением
- **НЕ блокирует:** Доступ к урокам остается

---

## 🔁 Навигация

- **Входная точка:** `/library/stage/{stage_id}`
- **Возврат:** Встроенный TabBar → `/library`
- **Переход к уроку:** `/library/lesson/{lesson_id}`

---

## 🗄 Задействованные таблицы (реализовано)

| Таблица             | Назначение                       | Изменения                    |
| ------------------- | -------------------------------- | ---------------------------- |
| `course_stages`     | ID, название, описание ступени   | Без изменений                |
| `lessons`           | Уроки + has_assignment + cover_image_path | **реализовано**: добавлены поля has_assignment, cover_image_path |
| `lesson_progress`   | Завершенность уроков            | Обновлена логика создания при сдаче заданий |
| `users`             | lives_remaining для предупреждения | Без изменений                |
| `submissions`       | **реализовано**: Сданные задания пользователей | Таблица для ДЗ        |

**НЕ используются:**
- `assignments` - старая схема
- `lesson_blocks` с типом `assignment_instruction` - **УДАЛЕНО**, заменено на поле has_assignment
- `material_status` - заменено на lesson_progress
- `user_gamification` - lives_remaining в users

**Supabase Storage (реализовано):**
- Бакет `media` с папками `images/`, `audio/`, `documents/`
- Публичный URL формируется через `supabase.storage.from('media').getPublicUrl()`

---

## 🎨 Визуальные компоненты

### LessonCard (реализованный) - обновлено с обложками

```typescript
<div style={{
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  padding: '16px 16px 24px 16px',
  opacity: lesson.is_unlocked ? 1 : 0.6,
  cursor: lesson.is_unlocked ? 'pointer' : 'not-allowed'
}}>
  {/* Обложка 171px высота - реализовано: Supabase Storage */}
  <div style={{ height: '171px', borderRadius: '12px' }}>
    <img 
      src={lesson.cover_image_path 
        ? buildFileUrl(lesson.cover_image_path) 
        : getDefaultCover(lesson.content_type)
      }
      onError={(e) => {
        console.error('❌ Ошибка загрузки изображения:', {
          lessonName: lesson.lesson_name,
          failedUrl: e.currentTarget.src,
          originalPath: lesson.cover_image_path
        });
        e.currentTarget.src = getDefaultCover(lesson.content_type);
      }}
      onLoad={() => {
        console.log('✅ Изображение загружено успешно:', lesson.lesson_name);
      }}
    />
    {/* Иконка замка для заблокированных - на обложке */}
    {!lesson.is_unlocked && (
      <div style={{ position: 'absolute', top: '70px', left: '50%' }}>
        <svg>...</svg> {/* SVG иконка замка */}
      </div>
    )}
  </div>
  
  {/* Информация */}
  <div>
    <div style={{ justifyContent: 'space-between' }}>
      <span>День {lesson.lesson_id}</span>
      <span>{lesson.is_completed ? 'Завершено' : lesson.is_unlocked ? 'Доступно' : 'Заблокировано'}</span>
    </div>
    <h3>{lesson.lesson_name}</h3>
    {/* реализовано: has_assignment из поля БД */}
    {lesson.has_assignment && (
      <span style={{ backgroundColor: '#4e9bff' }}>ЗАДАНИЕ</span>
    )}
  </div>
</div>
```

### Предупреждение о жизнях

```typescript
{showLivesWarning && (
  <div style={{
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '12px',
    padding: '16px',
    color: '#c53030',
    display: 'flex',
    gap: '8px'
  }}>
    <span>⚠️</span>
    <span>У вас осталось 0 жизней! Будьте осторожны с дедлайнами.</span>
  </div>
)}
```

---

## ✅ Acceptance Criteria (реализовано)

- ✅ Ступень загружается с правильным списком уроков
- ✅ Последовательная разблокировка: следующий урок доступен после завершения предыдущего
- ✅ **реализовано**: has_assignment теперь поле в таблице lessons (не через lesson_blocks)
- ✅ **реализовано**: Реальные обложки уроков загружаются из Supabase Storage
- ✅ **реализовано**: buildFileUrl() корректно строит URL изображений
- ✅ **реализовано**: Диагностические логи для отладки загрузки изображений
- ✅ Предупреждение о жизнях показывается при `lives_remaining = 0`
- ✅ Заблокированные уроки неактивны (opacity, cursor, иконка замка на обложке)
- ✅ Навигация к уроку работает только для разблокированных
- ✅ Прогресс ступени подсчитывается корректно
- ✅ **реализовано**: Fallback на дефолтные обложки при ошибке загрузки
- ✅ **реализовано**: Определение заданий - через поле has_assignment в таблице lessons
- ✅ **реализовано**: CloudFlare R2 интеграция - реальные обложки уроков
- ✅ **реализовано**: buildFileUrl функция - правильные URL для изображений
- ✅ **реализовано**: Диагностика изображений - логи в консоли для отладки
- ✅ Адаптивный дизайн - максимум 375px ширина

---

## 📍 Структура компонентов (фактическая)

```
src/pages/LibraryPage/StagePage.tsx          - основная страница ступени
src/components/LessonCard/LessonCard.tsx     - карточка урока  
src/lib/supabase/hooks/useStageDetails.ts    - хук загрузки данных
```

---

## 🧱 Псевдокод (фактический React-style)

```tsx
<StagePage>
  <h1>{stageDetails.stage_name}</h1>
  <div>{completed_lessons} из {total_lessons} завершено</div>
  
  {showLivesWarning && <WarningBlock />}
  
  <div style={{ gap: '12px' }}>
    {stageDetails.lessons.map((lesson) => (
      <LessonCard
        key={lesson.lesson_id}
        lesson={lesson}
        onClick={handleLessonClick}
      />
    ))}
  </div>
  
  {lessons.length === 0 && <EmptyState />}
</StagePage>
```

---

## 🧭 Связанные flow

- **Входная точка:** `library_flow.md` - список ступеней
- **Переход к урокам:** `lesson_view_flow.md` - просмотр контента урока
- **Завершение урока:** обновление `lesson_progress` → разблокировка следующего

---

## 🔧 Особенности реализации

### ✅ Что реализовано:

- **Последовательная разблокировка** - через логику в useStageDetails
- **Визуальная блокировка** - opacity + cursor + иконка замка на обложке
- **реализовано: Определение заданий** - через поле has_assignment в таблице lessons
- **реализовано: Supabase Storage интеграция** - реальные обложки уроков
- **реализовано: buildFileUrl функция** - правильные URL для изображений
- **реализовано: Диагностика изображений** - логи в консоли для отладки
- **Адаптивный дизайн** - максимум 375px ширина
- **Предупреждения о жизнях** - без блокировки функционала
- **реализовано: Fallback обложки** - дефолтные изображения при ошибке

### ⚠️ Ограничения:

- **НЕТ условий разблокировки ступени** - is_unlocked всегда true
- **НЕТ блокировки при lives = 0** - только предупреждение
- **НЕТ детального статуса заданий** - только has_assignment флаг

### 🔄 Улучшения в будущем:

- Добавить условия разблокировки ступеней
- Реализовать блокировку при lives = 0
- Показывать статус сданных заданий (через таблицу submissions)
- Оптимизировать загрузку изображений (lazy loading, кеширование)
