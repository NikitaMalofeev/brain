import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Читаем переменные окружения
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const CLOUDFLARE_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const CLOUDFLARE_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

// Единый бакет
const BUCKET_NAME = 'brain-programming';

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ACCESS_KEY_ID || !CLOUDFLARE_SECRET_ACCESS_KEY) {
  console.error('❌ CloudFlare R2 credentials not found. Check your .env file.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

async function uploadTestFiles() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.resolve(__dirname, '../public/mediman.png');

  // Тестируем загрузку в единый бакет с префиксами
  const tests = [
    {
      bucket: BUCKET_NAME,
      key: 'images/test-image.png',
      contentType: 'image/png',
      description: 'изображение в папку images/'
    },
    {
      bucket: BUCKET_NAME,
      key: 'audio/test-audio.mp3',
      contentType: 'audio/mpeg',
      description: 'тестовый аудио файл (копия изображения) в папку audio/'
    }
  ];

  for (const test of tests) {
    const fileStream = fs.createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: test.bucket,
      Key: test.key,
      Body: fileStream,
      ContentType: test.contentType,
    });

    try {
      console.log(`📤 Загружаем ${test.description} в бакет: ${test.bucket}`);
      await s3.send(command);
      console.log('✅ Файл успешно загружен!');
      console.log('URL:', `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${test.bucket}/${test.key}`);
    } catch (e) {
      console.error(`❌ Ошибка загрузки в ${test.bucket}:`, e);
    }
  }
}

uploadTestFiles(); 