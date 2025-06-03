import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Получаем переменные окружения (с префиксом VITE_ для работы в браузере)
const CLOUDFLARE_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID;
const CLOUDFLARE_ACCESS_KEY_ID = import.meta.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID;
const CLOUDFLARE_SECRET_ACCESS_KEY = import.meta.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const CLOUDFLARE_PUBLIC_URL = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;

// Проверяем, что все переменные заданы
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ACCESS_KEY_ID || !CLOUDFLARE_SECRET_ACCESS_KEY) {
  throw new Error('CloudFlare R2 credentials are not configured. Please check your .env file.');
}

// S3-совместимый endpoint для API вызовов (загрузка, удаление)
const CLOUDFLARE_S3_ENDPOINT = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Единый бакет для прототипа (упрощение)
export const BUCKET_NAME = 'brain-programming';

// Префиксы для организации файлов внутри бакета
export const FILE_PREFIXES = {
  AUDIO: 'audio/',
  IMAGE: 'images/',
  DOCUMENTS: 'documents/'
} as const;

export type FilePrefix = typeof FILE_PREFIXES[keyof typeof FILE_PREFIXES];

const s3 = new S3Client({
  region: 'auto',
  endpoint: CLOUDFLARE_S3_ENDPOINT,
  credentials: {
    accessKeyId: CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

// Генерация уникального имени файла
const generateUniqueFileName = (originalName: string): string => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  const ext = originalName.split('.').pop();
  const safeName = originalName
    .split('.')[0]
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  return `${safeName}_${timestamp}_${random}.${ext}`;
};

// Определение префикса для файла по его типу
export const getFilePrefixByType = (file: File): FilePrefix => {
  const mimeType = file.type.toLowerCase();

  // Аудио файлы
  if (mimeType.startsWith('audio/')) {
    return FILE_PREFIXES.AUDIO;
  }

  // Изображения
  if (mimeType.startsWith('image/')) {
    return FILE_PREFIXES.IMAGE;
  }

  // Документы и прочее (PDF, DOC, и файлы ДЗ)
  return FILE_PREFIXES.DOCUMENTS;
};

// Определение префикса по расширению файла (fallback)
export const getFilePrefixByExtension = (fileName: string): FilePrefix => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  // Аудио расширения
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
  if (ext && audioExtensions.includes(ext)) {
    return FILE_PREFIXES.AUDIO;
  }

  // Изображения
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  if (ext && imageExtensions.includes(ext)) {
    return FILE_PREFIXES.IMAGE;
  }

  // Документы и прочее
  return FILE_PREFIXES.DOCUMENTS;
};

// CORS НАСТРОЙКА: Убедитесь что в CloudFlare R2 настроены CORS правила для вашего домена
// Перейдите в CloudFlare Dashboard > R2 > Ваш бакет > Settings > CORS Policy
// Добавьте правило:
// {
//   "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
//   "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
//   "AllowedHeaders": ["*"],
//   "ExposeHeaders": [],
//   "MaxAgeSeconds": 3600
// }


// Загрузка файла в R2 с автоматическим определением префикса
// НОВАЯ АРХИТЕКТУРА: возвращает только путь к файлу, а не полный URL
export const uploadFileToR2 = async (
  file: File | Blob,
  customPrefix?: FilePrefix
): Promise<string> => {
  let filePrefix: FilePrefix;

  if (customPrefix) {
    // Если префикс указан явно
    filePrefix = customPrefix;
  } else if (file instanceof File) {
    // Автоматическое определение по MIME типу
    filePrefix = getFilePrefixByType(file);
  } else {
    // Fallback для Blob без типа
    filePrefix = FILE_PREFIXES.DOCUMENTS;
  }

  // Настоящая загрузка в CloudFlare R2 (требует правильной настройки CORS)
  const uniqueFileName = generateUniqueFileName((file as any).name || 'file');
  const fullKey = `${filePrefix}${uniqueFileName}`;
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const contentType = (file as any).type || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullKey,
    Body: uint8Array,
    ContentType: contentType,
  });

  // Улучшенная обработка ошибок при загрузке
  try {
    await s3.send(command);
  } catch (error) {
    // Логируем полный объект ошибки для детального анализа
    console.error(`Full error object for ${fullKey} from R2:`, JSON.stringify(error, null, 2));

    // Формируем более информативное сообщение об ошибке
    let errorMessage = 'Unknown upload error';
    if (typeof error === 'object' && error !== null) {
      const awsError = error as any;
      errorMessage = awsError.message || awsError.name || JSON.stringify(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error(`Failed to upload file ${fullKey} to R2:`, errorMessage); // Используем новое сообщение
    // Перебрасываем ошибку, чтобы ее можно было поймать выше
    throw new Error(`Upload failed for ${fullKey}: ${errorMessage}`);
  }

  // НОВАЯ АРХИТЕКТУРА: возвращаем только путь к файлу
  return fullKey;
};

// Специализированные функции для каждого типа контента
export const uploadAudioToR2 = async (file: File | Blob): Promise<string> => {
  return uploadFileToR2(file, FILE_PREFIXES.AUDIO);
};

export const uploadImageToR2 = async (file: File | Blob): Promise<string> => {
  return uploadFileToR2(file, FILE_PREFIXES.IMAGE);
};

export const uploadDocumentToR2 = async (file: File | Blob): Promise<string> => {
  return uploadFileToR2(file, FILE_PREFIXES.DOCUMENTS);
};

/**
 * Построение публичного URL из пути к файлу
 * @param filePath - путь к файлу в формате "images/filename.jpg" или "audio/track.mp3"
 * @returns полный публичный URL для доступа к файлу
 */
export const buildFileUrl = (filePath: string): string => {
  if (!filePath) {
    throw new Error('File path is required');
  }

  // Убираем ведущий слеш, если есть
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

  // Используем правильный публичный URL
  // CloudFlare R2 с настроенным Custom Domain предоставляет прямой доступ к файлам
  if (CLOUDFLARE_PUBLIC_URL) {
    return `${CLOUDFLARE_PUBLIC_URL}/${cleanPath}`;
  } else {
    // Fallback: прямой доступ через S3 API (может не работать из-за CORS)
    console.warn('⚠️ CLOUDFLARE_PUBLIC_URL не настроен. Используется fallback URL, который может не работать в браузере.');
    return `${CLOUDFLARE_S3_ENDPOINT}/${BUCKET_NAME}/${cleanPath}`;
  }
};

/**
 * Специализированная функция для построения URL изображений
 * @param imagePath - путь к изображению (например, "galaxy-brain-m-stage-3.webp" или "images/galaxy-brain-m-stage-3.webp")
 * @returns полный URL изображения
 */
export const buildImageUrl = (imagePath: string): string => {
  console.log(`🔗 buildImageUrl: входящий путь -`, imagePath);

  if (!imagePath) {
    console.error(`❌ buildImageUrl: пустой путь изображения`);
    throw new Error('Image path is required');
  }

  // Если путь уже содержит префикс images/, используем как есть
  // Иначе добавляем префикс images/
  const fullPath = imagePath.startsWith('images/')
    ? imagePath
    : `images/${imagePath}`;

  console.log(`🛠️ buildImageUrl: полный путь после обработки -`, fullPath);

  const finalUrl = buildFileUrl(fullPath);
  console.log(`✅ buildImageUrl: финальный URL -`, finalUrl);

  return finalUrl;
};

/**
 * Удаление файла из CloudFlare R2
 * @param filePath - путь к файлу в формате "images/filename.jpg" или "audio/track.mp3"
 * @returns Promise<void>
 */
export const deleteFileFromR2 = async (filePath: string): Promise<void> => {
  if (!filePath) {
    throw new Error('File path is required for deletion');
  }

  // Убираем ведущий слеш, если есть
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanPath,
  });

  try {
    await s3.send(command);
    console.log(`✅ File ${cleanPath} successfully deleted from R2`);
  } catch (error) {
    // Логируем полный объект ошибки для детального анализа
    console.error(`Full error object for deleting ${cleanPath} from R2:`, JSON.stringify(error, null, 2));

    // Формируем более информативное сообщение об ошибке
    let errorMessage = 'Unknown deletion error';
    if (typeof error === 'object' && error !== null) {
      const awsError = error as any;
      errorMessage = awsError.message || awsError.name || JSON.stringify(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error(`Failed to delete file ${cleanPath} from R2:`, errorMessage);
    // Перебрасываем ошибку, чтобы ее можно было поймать выше
    throw new Error(`Deletion failed for ${cleanPath}: ${errorMessage}`);
  }
}; 