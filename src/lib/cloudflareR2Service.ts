import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const CLOUDFLARE_ACCOUNT_ID = '71573376c729a28ab28b9c46abc493ca';
const CLOUDFLARE_PUBLIC_ENDPOINT = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: 'auto',
  endpoint: CLOUDFLARE_PUBLIC_ENDPOINT,
  credentials: {
    accessKeyId: 'd26b767380cf0967af69e6d8761204c8',
    secretAccessKey: 'ab282718f4d2526f9257f55eca3c1dc67e2f42b935fda9644d1a935b4a54ff9f',
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

// Загрузка файла в R2 через S3 API
export const uploadFileToR2 = async (
  file: File | Blob,
  bucketName: 'audio' | 'image'
): Promise<string> => {
  const uniqueFileName = generateUniqueFileName((file as any).name || 'file');
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = (file as any).type || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFileName,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(command);
  // Публичный URL
  return `${CLOUDFLARE_PUBLIC_ENDPOINT}/${bucketName}/${uniqueFileName}`;
}; 