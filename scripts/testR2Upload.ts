import { uploadFileToR2 } from '../src/lib/cloudflareR2Service.ts';
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
    const url = await uploadFileToR2(file as any, 'image');
    console.log('✅ Файл успешно загружен в Cloudflare R2:', url);
  } catch (e) {
    console.error('❌ Ошибка загрузки:', e);
  }
}

main(); 