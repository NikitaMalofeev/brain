# Руководство по загрузке контента в Lesson Blocks

## Обзор

В приложении Brain Programming контент уроков структурирован через **lesson blocks** - отдельные блоки в таблице `lesson_blocks`, каждый из которых может содержать разный тип контента.

## Архитектура lesson_blocks

### Таблица `lesson_blocks`
```sql
- id (bigint, PK) - Уникальный ID блока
- lesson_id (bigint, FK) - Ссылка на урок
- order_num (int4) - Порядок блока в уроке (1, 2, 3...)
- title (text) - Заголовок блока (необязательно)
- block_type (text) - Тип контента: 'text', 'video', 'audio', 'image', 'pdf'
- content_text (text) - Текстовое содержимое (для text-блоков и описаний)
- content_url (text) - URL файла/видео
- meta_json (jsonb) - Дополнительные метаданные
```

### Поддерживаемые типы блоков
1. **text** - Текстовые блоки с форматированием
2. **video** - Видео через Kinescope
3. **audio** - Аудиофайлы из CloudFlare R2
4. **image** - Изображения из CloudFlare R2
5. **pdf** - PDF файлы из CloudFlare R2

---

## 1. Текстовые блоки (`block_type: 'text'`)

### Пример SQL вставки:
```sql
INSERT INTO lesson_blocks (lesson_id, order_num, title, block_type, content_text) 
VALUES (1, 1, 'Введение в урок', 'text', 'Добро пожаловать в первый урок курса!

В этом уроке мы изучим:
• Основы программирования мозга
• Техники медитации
• Практические упражнения

Готовы начать? 🚀');
```

### Особенности:
- `content_url` остается `NULL`
- `content_text` поддерживает переносы строк и эмодзи
- `title` будет отображаться как заголовок H3

---

## 2. Видео блоки (`block_type: 'video'`)

### Через Kinescope (рекомендуется)

**Формат URL в `content_url`:**
```
https://kinescope.io/suvsb3q8hDVEDdjx5QKLtZ
```

**Пример SQL вставки:**
```sql
INSERT INTO lesson_blocks (lesson_id, order_num, title, block_type, content_text, content_url) 
VALUES (1, 2, 'Документальный фильм «Программирование мозга»', 'video', 
'🎥 Обязательный к просмотру фильм про основы программирования мозга. 
После него вы будете понимать, что на самом деле происходит в мире.

🖊 Опишите свои ощущения от просмотра и пришлите их в конце дня', 
'https://kinescope.io/suvsb3q8hDVEDdjx5QKLtZ');
```

### Поддерживаемые форматы Kinescope URL:
- `https://kinescope.io/embed/VIDEO_ID`
- `https://kinescope.io/VIDEO_ID`
- Просто `VIDEO_ID`

### Особенности:
- Система автоматически извлечет Kinescope ID из URL
- `content_text` отобразится под видео как описание
- `title` станет заголовком над видео

---

## 3. Аудио блоки (`block_type: 'audio'`)

### Через Supabase Storage

**Формат URL в `content_url`:**
```
audio/filename.mp3
```
*В базу сохраняется только относительный путь внутри бакета `media`.*

**Пример SQL вставки:**
```sql
INSERT INTO lesson_blocks (lesson_id, order_num, title, block_type, content_text, content_url) 
VALUES (1, 3, 'Медитация "Спокойствие"', 'audio', 
'🧘 Включите наушники и найдите удобное место.
Медитация длится 10 минут.

Закройте глаза и следуйте инструкциям голоса.', 
'audio/meditation_calm.mp3');
```

### Поддерживаемые форматы аудио:
- `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`
- ⚠️ **Важно:** `.ogg` формат не поддерживается из-за ограничений iOS Safari

### Особенности:
- Аудио плеер с кастомными контролами
- Визуализация звука (декоративные столбцы)
- `content_text` отобразится как подпись к аудио

---

## 4. Изображения (`block_type: 'image'`)

### Через Supabase Storage

**Формат URL в `content_url`:**
```
images/filename.jpg
```
*В базу сохраняется только относительный путь внутри бакета `media`.*

**Пример SQL вставки:**
```sql
INSERT INTO lesson_blocks (lesson_id, order_num, title, block_type, content_text, content_url) 
VALUES (1, 4, 'Схема работы мозга', 'image', 
'Изучите эту схему внимательно. 
Она поможет понять, как работает наш мозг при обработке информации.

Обратите внимание на связи между разными областями.', 
'images/brain_scheme.jpg');
```

### Поддерживаемые форматы изображений:
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`

### Особенности:
- Изображение адаптивное (100% ширины)
- `title` отображается с эмодзи 🖼
- `content_text` служит описанием под изображением

---

## 5. PDF файлы (`block_type: 'pdf'`)

### Через Supabase Storage

**Формат URL в `content_url`:**
```
documents/filename.pdf
```
*В базу сохраняется только относительный путь внутри бакета `media`.*

**Пример SQL вставки:**
```sql
INSERT INTO lesson_blocks (lesson_id, order_num, title, block_type, content_text, content_url) 
VALUES (1, 5, 'Рабочая тетрадь урока 1', 'pdf', 
'Скачайте и распечатайте рабочую тетрадь.
Заполняйте её по ходу урока.

Вы можете писать прямо в PDF или от руки на бумаге.', 
'documents/lesson1_workbook.pdf');
```

### Особенности:
- PDF открывается в новой вкладке
- `title` отображается с эмодзи 📄
- Кнопка "Открыть PDF" для скачивания
- `content_text` служит инструкцией к использованию

---

## Пошаговая инструкция загрузки

### Шаг 1: Подготовка файла (для медиа-контента)

**Для аудио/изображений/PDF:**
1. Загрузите файл в бакет `media` в Supabase Storage через админ-панель или напрямую.
2. Убедитесь, что файл находится в нужной папке (`audio/`, `images/`, `documents/`).

**Для видео:**
1. Загрузите видео в Kinescope.
2. Получите ID видео из URL.
3. Можете использовать любой формат Kinescope URL.

### Шаг 2: Создание записи в БД

```sql
INSERT INTO lesson_blocks (
  lesson_id, 
  order_num, 
  title, 
  block_type, 
  content_text, 
  content_url
) VALUES (
  LESSON_ID,           -- ID урока 
  ORDER_NUMBER,        -- Порядковый номер (1, 2, 3...)
  'Заголовок блока',   -- Заголовок (может быть NULL)
  'BLOCK_TYPE',        -- text|video|audio|image|pdf
  'Описание контента', -- Текстовое описание (может быть NULL)
  'ОТНОСИТЕЛЬНЫЙ_ПУТЬ' -- Относительный путь в Supabase Storage (NULL для text и video)
);
```

### Шаг 3: Проверка

1. Откройте урок в приложении
2. Убедитесь, что блок отображается корректно
3. Проверьте загрузку контента (видео воспроизводится, аудио играет, изображения показываются)

---

## Частые ошибки и решения

### ❌ Видео не воспроизводится
**Причина:** Неверный Kinescope ID или URL
**Решение:** Проверьте URL в браузере, убедитесь что видео публично

### ❌ Аудио не загружается  
**Причина:** Неверный путь к файлу в `content_url` или файл недоступен в Supabase Storage.
**Решение:** Проверьте путь в таблице `lesson_blocks` и наличие файла в бакете `media`. Убедитесь, что на бакет настроены правильные RLS-политики на чтение.

### ❌ Изображение не отображается
**Причина:** Битая ссылка или неправильные RLS-политики.
**Решение:** Проверьте путь к файлу и настройки RLS для бакета `media`.

---

## Примеры готовых блоков из БД

### Текстовый блок с заданием:
```sql
-- Реальный пример из lesson_id=1
{
  "id": 8,
  "title": "ЗАДАНИЕ 1. Чек-ап текущей точки ✅",
  "block_type": "image", 
  "content_text": "⚡️ Имя, возраст, город\n⚡️ Род деятельности\n⚡️ Точка А: финансы...",
  "content_url": null
}
```

### Видео блок с Kinescope:
```sql
-- Реальный пример из lesson_id=1 
{
  "id": 1,
  "title": "Задание 2. Посмотрите фильм",
  "block_type": "video",
  "content_text": "🎥Документальный фильм «Программирование мозга»...",
  "content_url": "https://kinescope.io/suvsb3q8hDVEDdjx5QKLtZ"
}
```

---

## Дополнительные возможности

### Метаданные в `meta_json`
Можно добавлять дополнительную информацию:

```sql
-- Пример с метаданными для видео
INSERT INTO lesson_blocks (..., meta_json) 
VALUES (..., '{"duration": 1800, "subtitles": true, "quality": "HD"}');

-- Пример с метаданными для аудио  
INSERT INTO lesson_blocks (..., meta_json)
VALUES (..., '{"duration": 600, "artist": "Meditation Master", "genre": "meditation"}');
```

### Условные блоки
В будущем можно добавить условную логику в `meta_json`:

```json
{
  "visible_after_completion": ["block_id_1", "block_id_2"],
  "required_for_progress": true
}
```

---

**Готово!** Теперь вы знаете, как правильно загружать любой тип контента в lesson blocks системы Brain Programming. 