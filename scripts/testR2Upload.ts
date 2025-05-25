import { uploadFileToR2, uploadImageToR2, BUCKET_NAME } from '../src/lib/cloudflareR2Service.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Полифилл File для Node.js
class NodeFile extends Blob {
  name: string;
  lastModified: number;
  constructor(chunks: any[], name: string, options: any = {}) {
    super(chunks, options);
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
  }
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.resolve(__dirname, '../public/mediman.png');
  const fileBuffer = fs.readFileSync(filePath);

  // Используем NodeFile вместо File
  const file = new NodeFile([fileBuffer], 'mediman.png', { type: 'image/png' });

  try {
    console.log('📤 Тестируем загрузку изображения в бакет:', BUCKET_NAME);

    // Тест 1: автоматическое определение бакета
    const url1 = await uploadFileToR2(file as any);
    console.log('✅ Автоматическое определение бакета:', url1);

    // Тест 2: явное указание бакета
    const url2 = await uploadImageToR2(file as any);
    console.log('✅ Явное указание бакета изображений:', url2);

  } catch (e) {
    console.error('❌ Ошибка загрузки:', e);
  }
}

main(); 