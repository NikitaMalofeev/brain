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
└─────────────────────────────────┘
```

#### 2. Блоки контента (чистый поток без рамок)
- **Стиль:** Единый поток текста и медиа
- **БЕЗ белых прямоугольников**, фонов, рамок, теней
- **БЕЗ отдельных карточек** для каждого блока
- **Отступы:** marginBottom: '24px' между блоками

#### 3. Блок сданного задания (если есть submission)
```
┌─────────────────────────────────┐
│ ✅ Задание сдано на проверку   │ ← Заголовок, 20px, черный
│                                 │
│ Ваш ответ:                     │ ← Подпись, 14px, #666666  
│ Текст ответа пользователя...   │ ← Серый текст #666666
│ 📄 прикрепленный_файл.pdf      │ ← Если есть файл
│                                 │
│ [Вернуться ко всем урокам]     │ ← Черная кнопка
└─────────────────────────────────┘
```

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
- **Источник:** CloudFlare R2 URL в `content_url`
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

## 5. Отображение сданного задания

### 5.1 Условие отображения
```typescript
{state.submission && (
  <div style={{ marginBottom: '32px' }}>
    // Блок сданного задания
  </div>
)}
```

### 5.2 Структура блока (БЕЗ рамок)
```typescript
// Заголовок
<div style={{
  fontWeight: 700,
  fontSize: '20px',
  color: '#000000',
  marginBottom: '16px'
}}>
  ✅ Задание сдано на проверку
</div>

// Подпись "Ваш ответ:"
<p style={{
  fontSize: '14px',
  fontWeight: 600,
  color: '#666666',
  marginBottom: '8px'
}}>
  Ваш ответ:
</p>

// Текст ответа (серый, с переносами)
<div style={{
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#666666',  // Серый для отличия от контента урока
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word'
}}>
  {state.submission.content_text}
</div>
```

### 5.3 Кнопка возврата к ступени
```typescript
<button onClick={() => navigate(`/library/stage/${lesson.stage_id}`)}>
  Вернуться ко всем урокам ступени
</button>
```

---

## 6. Навигация и состояния

### 6.1 Кнопка "Назад"
- **Стиль:** текстовая кнопка с SVG стрелкой
- **Действие:** `navigate(-1)` - возврат к предыдущему экрану  
- **Позиция:** в заголовке урока

### 6.2 Логика отображения формы
```typescript
// Fixed форма показывается только если:
// 1. Урок имеет задание (has_assignment = true)
// 2. Задание НЕ сдано (!existingSubmission)
{hasAssignment && !isSubmitted && (
  <FixedSubmissionForm ... />
)}
```

### 6.3 Адаптация контента под форму
```typescript
const bottomPadding = hasAssignment && !isSubmitted ? '120px' : '40px';
// Контент урока имеет отступ снизу для fixed формы
```

---

## 7. Улучшения UX (реализованные)

### ✅ Что УЛУЧШЕНО:
- **Убраны JavaScript alert'ы** - вместо всплывающих окон визуальная обратная связь
- **Адаптивное поле ввода** - автоувеличение от 28px до 30% экрана
- **Перенос длинных строк** - wordBreak + overflowWrap для текста ответов
- **Серый цвет для ответов** - визуальное отличие от основного контента урока
- **Чистое отображение сданных заданий** - без лишних рамок и фонов
- **Динамическое выравнивание иконок** - по центру/по низу в зависимости от высоты поля

### ❌ Что УБРАНО:
- Navigation Bar (навбар приложения)
- TabBar на странице урока
- Белые карточки с тенями для блоков контента
- Рамки и фоны для блока сданного задания
- JavaScript alert уведомления
- `assignment_instruction` блоки (не используются)

---

## 8. Технические файлы

### Основные компоненты:
- `src/pages/LibraryPage/LessonPage.tsx` - основная страница урока
- `src/components/LessonContent/FixedSubmissionForm.tsx` - fixed форма сдачи
- `src/components/LessonContent/VideoBlock.tsx` - видео плеер Kinescope
- `src/components/LessonContent/AudioBlock.tsx` - аудио плеер

### Интеграции:
- **Kinescope:** видео через VideoBlock компонент
- **CloudFlare R2:** файлы и аудио через `uploadFileToR2()`
- **Supabase:** работа с `lessons`, `lesson_blocks`, `submissions`

### Схема БД:
```sql
-- Урок с флагом задания
lessons: { 
  id, name, description, has_assignment, stage_id, ... 
}

-- Блоки контента урока  
lesson_blocks: { 
  id, lesson_id, block_type, content_text, content_url, 
  title, order_num 
}

-- Сдачи заданий пользователей
submissions: { 
  id, user_id, lesson_id, content_text, file_url, 
  status, submitted_at, points_awarded 
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