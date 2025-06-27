import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import dotenv from "dotenv";

// 1. --- НАСТРОЙКА И КОНФИГУРАЦИЯ ---
dotenv.config({ path: '../../.env' }); // Убедимся, что .env читается из корня проекта

const { 
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
    DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
} = process.env;

// Проверка наличия всех необходимых переменных окружения
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME || !DB_PORT) {
    console.error("🔥 Ошибка: Не все переменные окружения заданы. Проверьте ваш .env файл.");
    process.exit(1);
}

// Клиент для Supabase Storage
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Клиент для R2 (S3-совместимый)
const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// Клиент для прямого подключения к PostgreSQL
const pgClient = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
});

// --- ОСНОВНАЯ ЛОГИКА СКРИПТА ---
async function main() {
    console.log("🚀 Запуск миграции из Cloudflare R2 в Supabase Storage...");

    try {
        // 2. --- ПОЛУЧЕНИЕ СПИСКОВ ФАЙЛОВ ---
        const allR2Files = await getAllR2Files();
        console.log(`🔍 Найдено в R2: ${allR2Files.length} файлов.`);

        await pgClient.connect();
        console.log('🔗 Подключено к базе данных PostgreSQL.');

        const usedDbFiles = await getUsedDbFiles();
        console.log(`🗃️ Используется в БД: ${usedDbFiles.length} уникальных файлов.`);

        // 3. --- СРАВНЕНИЕ И АНАЛИЗ ---
        const usedDbFilesSet = new Set(usedDbFiles);
        const filesToMigrate: string[] = [];
        const unusedFiles: string[] = [];

        for (const r2File of allR2Files) {
            if (usedDbFilesSet.has(r2File)) {
                filesToMigrate.push(r2File);
            } else {
                unusedFiles.push(r2File);
            }
        }

        console.log('📊 Анализ завершен:');
        console.log(`   - 🚚 К миграции: ${filesToMigrate.length} файлов.`);
        console.log(`   - 🗑️ Ненужные (мертвый груз): ${unusedFiles.length} файлов.`);

        if (unusedFiles.length > 0) {
            console.log('   - Список ненужных файлов:');
            unusedFiles.forEach(file => console.log(`     - ${file}`));
        }

        // 4. --- МИГРАЦИЯ ---
        // TODO: Реализовать цикл миграции файлов
        // TODO: Определить файлы для миграции и "мертвые" файлы

        // 4. --- МИГРАЦИЯ ---
        // TODO: Реализовать цикл миграции файлов

        // 5. --- ОТЧЕТ ---
        // TODO: Вывести финальный отчет в консоль

        console.log("✅ Миграция успешно завершена!");

    } catch (error) {
        console.error("❌ Произошла критическая ошибка во время миграции:", error);
    } finally {
        await pgClient.end();
        console.log('🛑 Соединение с базой данных закрыто.');
    }
}

main();

// --- Вспомогательные функции ---

/**
 * Получает полный список ключей всех объектов в бакете R2.
 * Автоматически обрабатывает пагинацию.
 */
async function getAllR2Files(): Promise<string[]> {
    const allKeys: string[] = [];
    let continuationToken: string | undefined;

    console.log('📥 Получение списка файлов из R2...');

    do {
        const command = new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
            response.Contents.forEach(item => {
                if (item.Key) {
                    allKeys.push(item.Key);
                }
            });
        }

        continuationToken = response.NextContinuationToken;

    } while (continuationToken);

    return allKeys;
}

/**
 * Получает из базы данных список всех уникальных путей к файлам, которые используются в проекте.
 */
async function getUsedDbFiles(): Promise<string[]> {
    const query = `
        SELECT cover_image_path AS path FROM course_stages WHERE cover_image_path IS NOT NULL AND cover_image_path <> ''
        UNION
        SELECT cover_image_path AS path FROM lessons WHERE cover_image_path IS NOT NULL AND cover_image_path <> ''
        UNION
        SELECT file_url AS path FROM submissions WHERE file_url IS NOT NULL AND file_url <> ''
        UNION
        SELECT cover_image_path AS path FROM materials WHERE cover_image_path IS NOT NULL AND cover_image_path <> ''
        UNION
        SELECT content_url AS path FROM material_blocks WHERE content_url IS NOT NULL AND content_url <> '' AND content_url NOT LIKE 'https://kinescope.io%';
    `;

    console.log('🔎 Выполняется SQL-запрос для поиска используемых файлов...');
    const res = await pgClient.query(query);
    
    // Преобразуем результат в простой массив строк (путей)
    return res.rows.map(row => row.path);
}
