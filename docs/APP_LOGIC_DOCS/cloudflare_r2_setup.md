# Настройка CloudFlare R2 для проекта Brain Programming

## Обзор

В проекте используется CloudFlare R2 Object Storage для хранения медиафайлов:
- **Аудиофайлы** - медитации, звуки уроков, голосовые записи
- **Изображения** - обложки уроков, схемы, файлы домашних заданий от пользователей
- **Видеофайлы** - резервный бакет (основные видео проходят через Kinescope)

## Структура хранения

Проект использует **один бакет** с организацией по папкам (упрощенный подход для прототипа):

| Папка в бакете | Назначение | Типы файлов |
|----------------|------------|-------------|
| `audio/` | Аудиоконтент | mp3, wav, ogg, aac, flac, m4a |
| `images/` | Изображения | jpg, png, gif, webp, svg, bmp |
| `documents/` | Документы и файлы ДЗ | pdf, doc, docx, txt, и прочие |

**Примечание:** Видео контент проходит через Kinescope, поэтому отдельная папка не нужна.

## Получение API ключей

### 1. Заходим в CloudFlare Dashboard
- Переходим на https://dash.cloudflare.com/
- Логинимся в свой аккаунт CloudFlare

### 2. Открываем R2 Object Storage
- В левом меню выбираем **"R2 Object Storage"**
- Или переходим по URL: https://dash.cloudflare.com/r2

### 3. Создаем API Token
- Справа вверху кликаем **"Manage R2 API tokens"**
- Жмем **"Create API token"**
- Заполняем форму:
  - **Token name:** `brain-programming-r2`
  - **Permissions:** 
    - ✅ `Object:Edit` (для загрузки файлов)
    - ✅ `Object:Read` (для чтения файлов)
  - **Bucket restrictions:** выбираем нужные buckets или "All buckets"
- Жмем **"Create API token"**

### 4. Получаем креды
После создания токена вы получите:
- **Access Key ID** (например: `d26b767380cf0967af69e6d8761204c8`)
- **Secret Access Key** (длинная строка)
- **Account ID** (для построения endpoint)

## Настройка переменных окружения

### Локальная разработка (.env)
Создайте файл `.env` в корне проекта:

```env
# CloudFlare R2 Storage
CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id  
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
```

### Vercel Production
В настройках проекта Vercel добавьте те же переменные:
1. Заходим в проект на https://vercel.com
2. Settings → Environment Variables
3. Добавляем переменные со значениями из CloudFlare

## Создание Bucket

В CloudFlare R2 нужно создать один bucket:
- `brain-programming` - для всех типов файлов

### Создание bucket:
1. В R2 Object Storage кликаем **"Create bucket"**
2. Указываем имя: `brain-programming`
3. Выбираем локацию (рекомендуется ближайшая к пользователям)
4. Жмем **"Create bucket"**

Организация файлов происходит автоматически через префиксы (папки) внутри бакета.

## Безопасность

⚠️ **ВАЖНО:** Никогда не коммитьте реальные ключи в git!
- Файл `.env` должен быть в `.gitignore`
- Используйте `env.example` для документирования структуры
- Для production используйте переменные окружения Vercel

## Структура URL

Файлы доступны по URL:
```
https://{ACCOUNT_ID}.r2.cloudflarestorage.com/{BUCKET_NAME}/{FILE_NAME}
```

Примеры:
- **Аудио:** `https://abc123.r2.cloudflarestorage.com/brain-programming/audio/meditation_intro.mp3`
- **Изображение:** `https://abc123.r2.cloudflarestorage.com/brain-programming/images/lesson_cover.jpg`
- **Документ:** `https://abc123.r2.cloudflarestorage.com/brain-programming/documents/homework_sample.pdf`

## Использование в коде

Сервис для работы с R2 находится в `src/lib/cloudflareR2Service.ts`:

### Автоматическое определение бакета
```typescript
import { uploadFileToR2 } from '@/lib/cloudflareR2Service';

// Автоматически определит бакет по типу файла
const fileUrl = await uploadFileToR2(file);
```

### Явное указание типа контента
```typescript
import { 
  uploadAudioToR2, 
  uploadImageToR2, 
  uploadDocumentToR2,
  FILE_PREFIXES 
} from '@/lib/cloudflareR2Service';

// Загрузка в конкретные папки
const audioUrl = await uploadAudioToR2(audioFile);
const imageUrl = await uploadImageToR2(imageFile);
const docUrl = await uploadDocumentToR2(documentFile);

// Или с указанием префикса
const customUrl = await uploadFileToR2(file, FILE_PREFIXES.AUDIO);
```

### Доступные функции
- `uploadFileToR2(file, customPrefix?)` - универсальная загрузка
- `uploadAudioToR2(file)` - загрузка в папку `audio/`
- `uploadImageToR2(file)` - загрузка в папку `images/`
- `uploadDocumentToR2(file)` - загрузка в папку `documents/`
- `getFilePrefixByType(file)` - определение папки по MIME типу
- `getFilePrefixByExtension(fileName)` - определение папки по расширению

## Тестирование

В папке `scripts/` есть тестовые скрипты:

```bash
# Тест загрузки через наш сервис
npm run ts-node scripts/testR2Upload.ts

# Тест прямого S3 API
npm run ts-node scripts/testR2S3Upload.ts
```

## Альтернативы

В будущем можно рассмотреть миграцию на Supabase Storage для единой экосистемы, но пока CloudFlare R2 работает стабильно и экономично. 