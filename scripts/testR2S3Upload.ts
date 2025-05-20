import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://71573376c729a28ab28b9c46abc493ca.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'd26b767380cf0967af69e6d8761204c8',
    secretAccessKey: 'ab282718f4d2526f9257f55eca3c1dc67e2f42b935fda9644d1a935b4a54ff9f',
  },
});

async function upload() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.resolve(__dirname, '../public/mediman.png');
  const fileStream = fs.createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: 'image',
    Key: 'mediman.png',
    Body: fileStream,
    ContentType: 'image/png',
  });

  try {
    await s3.send(command);
    console.log('✅ Файл успешно загружен!');
    console.log('URL:', `https://71573376c729a28ab28b9c46abc493ca.r2.cloudflarestorage.com/image/mediman.png`);
  } catch (e) {
    console.error('❌ Ошибка загрузки:', e);
  }
}

upload(); 