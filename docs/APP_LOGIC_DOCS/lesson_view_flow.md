# 🔄 Flow просмотра урока (фактически реализованный)

---

## 1. Пользователь переходит на экран урока

- **Навигация:** Библиотека → Ступень → Урок (`/library/lesson/{lesson_id}`)
- **Загрузка данных:** `lesson` + `lesson_blocks[]` по `lesson_id` 
- **Проверка заданий:** через поле `lesson.has_assignment` (упрощенная архитектура)
- **Без TabBar:** страница урока НЕ показывает нижнюю навигацию

---

## 2. Структура экрана урока (реализованная)

### 2.1 Дизайн и размеры
- **Максимальная ширина:** 768px по центру
- **Отступы:** 16px по бокам
- **Без NavBar:** убран стандартный навбар приложения  
- **Кнопка "Назад":** встроена в заголовок урока

### 2.2 Элементы экрана (сверху вниз)

#### 1. Кнопка "Назад" + Заголовок урока
```
┌─────────────────────────────────┐
│ ← Назад                         │ ← navigate(-1)
│                                 │
│ Название урока                  │ ← H1, Inter 700, 24px, #000000
│ Описание урока                  │ ← 16px, #8C8C8C
│ [День N] [Статус урока]         │ ← 🔴 НЕ РЕАЛИЗОВАНО: Плашки статуса
└─────────────────────────────────┘
```

**✅ СТАТУС: ПОЛНОСТЬЮ РЕАЛИЗОВАНО (26.01.2025)**
**Плашки статуса урока:**
- **"День N"** - всегда показывается, голубой градиент  
- **"Откроется завтра"** - для уроков с open_at = завтра (высший приоритет)
- **"Завершено"** - зеленая плашка для пройденных уроков (только при submission.status = 'approved' для уроков с заданием)
- **"Опоздание"** - красная плашка при пропущенном дедлайне (приоритет 2-4 в зависимости от задания)
- **"Дедлайн сегодня"** - оранжево-красный градиент при deadline_at = сегодня
- **"Дедлайн завтра"** - желто-оранжевый градиент при deadline_at = завтра
- **"В процессе"** - для начатых уроков с заданием
- **"На проверке"** - для сданных заданий (статусы 'submitted', 'pending_review')
- **"Нужна доработка"** - для отклоненных заданий (статус 'rejected')
- **"Не начато"** - голубая плашка для доступных непройденных уроков
- **"Заблокировано"** - для недоступных уроков

**✅ РЕАЛИЗОВАНО в LessonCard.tsx И LessonPage.tsx:**
```typescript
const status = getLessonPageStatus(); // Для страницы урока
// Приоритет: "Откроется завтра" > "Заблокировано" > "Завершено" > "В процессе/На проверке/Нужна доработка" > "Не начато"
```

**✅ НОВОЕ: Система дедлайнов (30.01.2025):**
- **Поле deadline_at в БД** - хранит время дедлайна урока
- **Автоматический расчет** - админка устанавливает дедлайн как open_at + 2 дня
- **Отображение дедлайна** - дополнительная плашка "До 31.01.2025 23:59" серого цвета
- **Умные статусы** - интеграция с системой приоритетов статусов:
  - Приоритет 4: "Опоздание" (для уроков без задания при пропущенном дедлайне)
  - Приоритет 2: "Опоздание" (для незавершенных уроков с заданием при пропущенном дедлайне)
  - Приоритет 5/3: "Дедлайн сегодня"
  - Приоритет 6/4: "Дедлайн завтра"
- **Helper функции** - `deadlineUtils.ts` с функциями определения статуса дедлайна

#### 2. Блоки контента (чистый поток без рамок)
- **Стиль:** Единый поток текста и медиа
- **БЕЗ белых прямоугольников**, фонов, рамок, теней
- **БЕЗ отдельных карточек** для каждого блока
- **Отступы:** marginBottom: '24px' между блоками

#### 3. Умные блоки результатов проверки (✅ НОВОЕ: 30.01.2025)

**Динамические блоки в зависимости от статуса submission:**

##### 3.1 Статус 'pending_review' / 'submitted' 
```
┌─────────────────────────────────┐
│ ⏳ Задание на проверке         │ ← Заголовок (config.titleColor)
│                                 │
│ Ваш ответ:                     │ ← Подпись, 14px, #666666  
│ Текст ответа пользователя...   │ ← Серый текст #666666
│ 📄 прикрепленный_файл.pdf      │ ← Если есть файл
│                                 │
│ 💭 Ожидайте результата проверки │ ← Мотивирующий текст, italic
│                                 │
│ [Вернуться ко всем урокам]     │ ← Черная кнопка
└─────────────────────────────────┘
```

##### 3.2 Статус 'approved'
```
┌─────────────────────────────────┐
│ ✅ Задание принято! +100 баллов│ ← Зеленый заголовок (#22c55e)
│                                 │
│ Ваш ответ:                     │ ← Подпись, 14px, #666666  
│ Текст ответа пользователя...   │ ← Серый текст #666666
│ 📄 прикрепленный_файл.pdf      │ ← Если есть файл
│                                 │
│ 💬 Комментарий куратора:       │ ← Если есть feedback
│ "Отличная работа! ..."         │ ← Курсив, #666666
│                                 │
│ 👤 Проверил: Иван              │ ← Имя куратора
│ 📅 26.01.2025                  │ ← Дата проверки
│                                 │
│ [Вернуться ко всем урокам]     │ ← Черная кнопка
└─────────────────────────────────┘
```

##### 3.3 Статус 'rejected' 
```
┌─────────────────────────────────┐
│ ❌ Задание требует доработки   │ ← Красный заголовок (#ef4444)
│                                 │
│ Ваш ответ:                     │ ← Подпись, 14px, #666666  
│ Текст ответа пользователя...   │ ← Серый текст #666666
│ 📄 прикрепленный_файл.pdf      │ ← Если есть файл
│                                 │
│ 💬 Комментарий куратора:       │ ← Feedback обязательный для rejected
│ "Нужно добавить примеры..."    │ ← Курсив, #666666
│                                 │
│ 👤 Проверил: Анна              │ ← Имя куратора
│ 📅 26.01.2025                  │ ← Дата проверки
│                                 │
│ [🔄 Попробовать снова]         │ ← Синяя кнопка outline
│ Нажмите, чтобы исправить       │ ← Подпись серым
│ задание                        │
│                                 │
│ [Вернуться ко всем урокам]     │ ← Черная кнопка
└─────────────────────────────────┘
```

**✅ Система пересдачи (реализовано):**
- При нажатии "Попробовать снова" появляется Fixed форма сдачи 
- Форма предзаполняется предыдущим ответом пользователя
- Кнопка пересдачи меняется на "Отменить исправление"
- Неограниченное количество попыток пересдачи

#### 4. Fixed форма сдачи (если has_assignment = true И НЕТ submission)
```
┌─────────────────────────────────┐
│ 📄 Файл 1                  [✕] │ ← Если есть файлы
├─────────────────────────────────┤
│ ┌───────────────────────────┐ ↑ │
│ │ Домашнее задание     [📎] │ │ │ ← Автоувеличивающееся поле
│ └───────────────────────────┘ │ │
└─────────────────────────────────┘
```

---

## 3. Типы контентных блоков (без рамок)

### 3.1 Текстовые блоки (`block_type: 'text'`)
```typescript
<div style={{ marginBottom: '24px' }}>
  {block.title && (
    <h3 style={{
      fontWeight: 700,
      fontSize: '20px',
      color: '#000000',
      marginBottom: '16px'
    }}>
      {block.title}
    </h3>
  )}
  <div style={{
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#242424',
    whiteSpace: 'pre-wrap'
  }}>
    {block.content_text}
  </div>
</div>
```

### 3.2 Видео блоки (`block_type: 'video'`)
- **Плеер:** Kinescope Player (VideoBlock компонент)
- **Источник:** `content_url` содержит Kinescope ID
- **Стиль:** Без рамки, заголовок + плеер + текст (если есть)

### 3.3 Аудио блоки (`block_type: 'audio'`)
- **Плеер:** AudioBlock компонент  
- **Источник:** Supabase Storage URL в `content_url`
- **Стиль:** Кастомные контролы с визуализацией

### 3.4 Изображения (`block_type: 'image'`)
```typescript
<div style={{ marginBottom: '24px' }}>
  {block.title && <h3>🖼 {block.title}</h3>}
  <img 
    src={block.content_url}
    alt={block.title || 'Изображение'}
    style={{
      width: '100%',
      height: 'auto',
      borderRadius: '12px'
    }}
  />
</div>
```

### 3.5 PDF файлы (`block_type: 'pdf'`)
```typescript
<div style={{ marginBottom: '24px' }}>
  <h3>📄 {block.title}</h3>
  <div style={{
    padding: '16px',
    backgroundColor: '#f9f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  }}>
    <a href={block.content_url} target="_blank">
      Открыть PDF
    </a>
  </div>
</div>
```

---

## 4. Fixed форма сдачи домашнего задания

### 4.1 Условие отображения
```typescript
const hasAssignment = lesson.has_assignment === true;
const isSubmitted = !!existingSubmission;

// Форма показывается только если есть задание И оно НЕ сдано
if (hasAssignment && !isSubmitted) {
  return <FixedSubmissionForm ... />;
}
```

### 4.2 Дизайн формы (реализованный)

**Позиционирование:**
- `position: fixed`
- `bottom: 0, left: 0, right: 0`
- `z-index: 50`

**Визуальный стиль:**
- **Фон:** белый (#FFFFFF)
- **Граница сверху:** border-t border-gray-200
- **Тень:** shadow-lg

**Адаптивность поля ввода:**
- **Минимальная высота:** 28px (одна строка)
- **Максимальная высота:** 30% от высоты окна
- **Автоувеличение:** по содержимому
- **Переполнение:** scroll при превышении максимума

### 4.3 Компоненты формы (фактические)

#### Поле ввода
```typescript
<textarea
  placeholder="Домашнее задание"
  style={{
    fontFamily: 'Montserrat, sans-serif',
    fontSize: '14px',
    lineHeight: '20px',
    minHeight: '28px', // Одна строка
    maxHeight: Math.round(window.innerHeight * 0.30),
    backgroundColor: 'transparent', // В сером контейнере
    resize: 'none',
    overflow: 'hidden' // или 'auto' при превышении
  }}
/>
```

#### Контейнер поля ввода
- **Фон:** bg-neutral-100 (#F5F5F5)
- **Радиус:** rounded-[24px]
- **Padding:** 6px 12px
- **Минимальная высота:** 40px

#### Кнопка прикрепления файла
- **Позиция:** внутри поля ввода справа
- **Иконка:** SVG paperclip 16x16px
- **Состояния:** обычное / загрузка (спиннер)
- **Выравнивание:** динамическое (по центру для одной строки, по низу для расширенного)

#### Кнопка отправки  
- **Размер:** 40x40px круглая
- **Цвет:** черный (#000000) если активна, серый (#D1D5DB) если неактивна
- **Иконка:** стрелка вверх SVG
- **Активация:** только при наличии текста И пользователя

### 4.4 Логика отправки (без уведомлений)

```typescript
const handleSubmit = async () => {
  const submissionData = {
    user_id: user.id,
    lesson_id: lessonId,
    content_text: submissionText.trim(),
    file_url: uploadedFiles[0] || null,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    points_awarded: 0
  };
  
  await supabase.from('submissions').insert(submissionData);
  onSubmissionUpdate(data);
  // БЕЗ alert - пользователь видит результат визуально
};
```

---

## 5. Отображение результатов проверки задания

### 5.1 Условие отображения
```typescript
{state.submission && (
  <div style={{ marginBottom: '32px' }}>
    {renderSubmissionResult(state.submission)}
  </div>
)}
```

### 5.2 Умный блок результатов по статусам

#### 5.2.1 Статус: `submitted` / `pending_review`
```typescript
// Конфигурация
{
  icon: '⏳',
  title: 'Задание на проверке',
  titleColor: '#3b82f6', // синий
  showFeedback: false,
  showRetryButton: false,
}

// Отображение
"⏳ Задание на проверке"
"💭 Ожидайте результата проверки"
```

#### 5.2.2 Статус: `approved`
```typescript
// Конфигурация
{
  icon: '✅',
  title: `Задание принято! +${points} баллов`,
  titleColor: '#22c55e', // зеленый
  showFeedback: true,
  showRetryButton: false,
}

// Отображение
"✅ Задание принято! +85 баллов"
Ваш ответ: [текст ответа]
📄 [прикрепленный файл]
💬 Комментарий куратора: "[feedback_text]"
👤 Проверил: [имя куратора]
📅 [дата проверки]
```

#### 5.2.3 Статус: `rejected`
```typescript
// Конфигурация  
{
  icon: '❌',
  title: 'Задание требует доработки',
  titleColor: '#ef4444', // красный
  showFeedback: true,
  showRetryButton: true,
}

// Отображение
"❌ Задание требует доработки"
Ваш ответ: [текст ответа]
📄 [прикрепленный файл]
💬 Комментарий куратора: "[feedback_text]"
👤 Проверил: [имя куратора]  
📅 [дата проверки]
🔄 [Кнопка "Попробовать снова"]
"Форма для новой сдачи появится ниже"
```

### 5.3 Структура функции `renderSubmissionResult()`
```typescript
const renderSubmissionResult = (submission: any) => {
  const status = submission.status;
  const points = submission.points_awarded || 0;
  const feedback = submission.feedback_text;
  const reviewedAt = submission.reviewed_at;
  const reviewerName = submission.reviewer?.first_name;

  const getStatusConfig = () => {
    switch (status) {
      case 'approved': return { /* конфиг для принятого */ };
      case 'rejected': return { /* конфиг для отклоненного */ };
      default: return { /* конфиг для ожидающего */ };
    }
  };

  return (
    <div>
      {/* Заголовок с иконкой и цветом */}
      {/* Ваш ответ */}
      {/* Прикрепленный файл */}
      {/* Комментарий куратора (если showFeedback) */}
      {/* Информация о проверке (если showFeedback) */}
      {/* Кнопка пересдачи (если showRetryButton) */}
      {/* Кнопка возврата к ступени */}
    </div>
  );
};
```

---

## 6. Система пересдачи отклоненных заданий

### 6.1 Условия пересдачи
- **Доступна только для:** `status === 'rejected'`
- **Ограничений нет:** неограниченное количество попыток
- **Не доступна для:** `approved`, `submitted`, `pending_review`

### 6.2 Обработчик пересдачи
```typescript
const handleRetrySubmission = async () => {
  // Сбрасываем статус на pending_review, обнуляем баллы, обновляем дату
  const { data, error } = await supabase
    .from('submissions')
    .update({
      status: 'pending_review',
      points_awarded: 0,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by_curator_id: null,
    })
    .eq('id', state.submission.id)
    .select(/* с данными куратора */)
    .single();

  handleSubmissionUpdate(data);
};
```

### 6.3 Логика отображения формы сдачи
```typescript
// В LessonPage.tsx
const isRetryAllowed = state.submission?.status === 'rejected' && isRetryingSubmission;
const showSubmissionForm = hasAssignment && (!isAssignmentSubmitted || isRetryAllowed);

// В FixedSubmissionForm.tsx - предзаполнение при пересдаче
useEffect(() => {
  if (existingSubmission) {
    setSubmissionText(existingSubmission.content_text || '');
    setUploadedFiles(existingSubmission.file_url ? [existingSubmission.file_url] : []);
  }
}, [existingSubmission]);
```

### 6.4 Логика отправки при пересдаче
```typescript
const handleSubmit = async () => {
  if (existingSubmission) {
    // Пересдача - обновляем существующую запись
    const { data, error } = await supabase
      .from('submissions')
      .update({
        content_text: submissionData.content_text,
        file_url: submissionData.file_url,
        status: 'submitted',
        submitted_at: submissionData.submitted_at,
        points_awarded: 0,
        // Сбрасываем данные проверки
        reviewed_at: null,
        reviewed_by_curator_id: null,
        feedback_text: null,
      })
      .eq('id', existingSubmission.id)
      .select(/* с данными куратора */)
      .single();
  } else {
    // Первая сдача - создаем новую запись
    // ...INSERT логика
  }
};
```

---

## 7. Обновленная загрузка данных

### 7.1 Загрузка submission с данными куратора
```typescript
const { data: submission } = await supabase
  .from('submissions')
  .select(`
    *,
    reviewer:users!submissions_reviewed_by_curator_id_fkey(
      first_name, 
      last_name
    )
  `)
  .eq('user_id', supabaseCompatUser.id)
  .eq('lesson_id', lessonId)
  .maybeSingle();
```

### 7.2 Структура данных submission
```typescript
interface SubmissionWithReviewer {
  id: number;
  user_id: string;
  lesson_id: number;
  content_text?: string;
  file_url?: string;
  status: 'submitted' | 'pending_review' | 'approved' | 'rejected';
  points_awarded: number;
  feedback_text?: string;
  reviewed_at?: string;
  reviewed_by_curator_id?: string;
  reviewer?: {
    first_name: string;
    last_name: string;
  };
}
```

---

## ✅ Итоговый флоу (фактический)

1. **Вход:** Пользователь тапает урок → LessonPage загружается
2. **Загрузка:** 
   - Урок + блоки (сортированные по order_num)
   - Существующая сдача пользователя (если есть)
3. **Отображение:** 
   - Кнопка "Назад" + заголовок урока
   - Чистый поток контента без рамок (text, video, audio, image, pdf)
4. **Состояние задания:**
   - **Если НЕ сдано:** Fixed форма внизу экрана
   - **Если сдано:** Блок с результатом + кнопка возврата к ступени
5. **Сдача:** Текст + файлы → создание submission → форма исчезает, появляется результат
6. **Возврат:** 
   - Кнопка "Назад" → предыдущий экран
   - Кнопка "Вернуться к урокам" → страница ступени