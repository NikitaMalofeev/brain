# CloudFlare R2 Setup для Brain Programming

> 📖 **См. также:** [Интеграция в админке](./admin_cloudflare_r2_integration.md) - как использовать R2 в интерфейсе

## Обзор

В админке реализована **прямая загрузка файлов** из браузера в CloudFlare R2 Object Storage. Эта архитектура требует правильной настройки CORS политики в CloudFlare R2.

## 🚀 Настройка CloudFlare R2

### 1. Создание бакета

1. Перейдите в CloudFlare Dashboard → R2 Object Storage
2. Нажмите "Create bucket"
3. Название бакета: `brain-programming`
4. Регион: выберите ближайший к пользователям

### 2. Настройка CORS политики (КРИТИЧЕСКИ ВАЖНО!)

1. В CloudFlare Dashboard → R2 → Ваш бакет `brain-programming`
2. Перейти в "Settings" → "CORS Policy"
3. Добавить следующее правило:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://localhost:5173", 
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**⚠️ Без этой настройки браузер будет блокировать запросы с ошибкой CORS!**

### 3. Получение API ключей

1. CloudFlare Dashboard → R2 Object Storage → "Manage R2 API tokens"
2. Нажать "Create API token"
3. Настройки токена:
   - **Token name**: `brain-programming-admin`
   - **Permissions**: "Object Read and Write"
   - **Account resources**: "Include - All accounts"
   - **Zone resources**: "Include - All zones"
   - **Bucket resources**: "Include - Specific bucket" → выберите `brain-programming`
4. Сохранить `Access Key ID` и `Secret Access Key`

### 4. Настройка Custom Domain (опционально, но рекомендуется)

1. В настройках бакета → "Custom Domains"
2. Добавить домен типа `files.yourdomain.com`
3. Настроить DNS записи согласно инструкциям CloudFlare
4. Использовать этот домен в `VITE_CLOUDFLARE_R2_PUBLIC_URL`

## 🔧 Переменные окружения

Добавьте в ваш `.env` файл:

```env
# CloudFlare R2 Storage (префикс VITE_ обязателен для работы в браузере)
VITE_CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_account_id
VITE_CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
VITE_CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

### Как получить `VITE_CLOUDFLARE_R2_PUBLIC_URL`?

1. **С Custom Domain**: `https://files.yourdomain.com`
2. **Без Custom Domain**: `https://pub-[bucket-id].r2.dev`

## 📁 Структура файлов в бакете

```
brain-programming/
├── audio/           # Аудиофайлы уроков
│   ├── meditation_1.mp3
│   └── lesson_audio.wav
├── images/          # Изображения и обложки
│   ├── lesson_cover.jpg
│   └── stage_icon.png
└── documents/       # PDF файлы и документы ДЗ
    ├── homework.pdf
    └── user_submission.doc
```

## 🧪 Тестирование интеграции

1. Запустить приложение: `npm run dev`
2. Зайти в админку: `/admin`
3. Перейти: Курсы → Выберите курс → Ступень → Урок → Блоки
4. Создать блок типа "audio", "image" или "pdf"
5. Загрузить файл через FileUploader
6. Проверить превью и сохранить блок

## 🔥 Частые проблемы

### CORS ошибка: "Access to fetch has been blocked"
- **Причина**: Не настроена CORS политика в CloudFlare R2
- **Решение**: Следуйте разделу "Настройка CORS политики" выше

### Ошибка: "CloudFlare R2 credentials are not configured"
- **Причина**: Отсутствуют переменные окружения
- **Решение**: Проверьте `.env` файл и наличие всех `VITE_CLOUDFLARE_R2_*` переменных

### Файлы загружаются, но не отображаются
- **Причина**: Неправильный `VITE_CLOUDFLARE_R2_PUBLIC_URL`
- **Решение**: Проверьте публичный URL бакета в CloudFlare

## 🏗️ Архитектура

```
Frontend (React)
       ↓
cloudflareR2Service.ts
       ↓
AWS S3 SDK (browser)
       ↓
CloudFlare R2 API
       ↓
CloudFlare R2 Storage
```

**Преимущества этой архитектуры:**
- ✅ Прямая загрузка без нагрузки на backend
- ✅ Быстрая загрузка файлов
- ✅ Автоматическое масштабирование CloudFlare
- ✅ CDN для быстрой раздачи файлов

**Требования:**
- ⚠️ Правильная настройка CORS
- ⚠️ API ключи в переменных окружения
- ⚠️ Публичный URL для отображения файлов

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