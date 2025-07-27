/*
name: SupabaseStorageService
role: Subsystem
responsibility: Предоставляет утилиты для работы с Supabase Storage, такие как формирование публичных URL-адресов для файлов.
*/

import { supabase } from './client';

const BUCKET_NAME = 'media';

/**
 * // @anchor: build-file-url-a1b2
 * Формирует публичный URL для файла в Supabase Storage.
 * @param filePath - Путь к файлу в бакете (например, 'images/avatar.png').
 * @returns Публичный URL файла или null, если путь не указан.
 */
export const buildFileUrl = (filePath: string | null | undefined): string | null => {
  if (!supabase) {
    console.error('Supabase client is not initialized. Cannot build file URL.');
    return null;
  }

  if (!filePath) {
    return null;
  }

  // Убираем возможные лишние слеши в начале пути
  const cleanedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

  // Определяем бакет на основе типа файла
  // HLS файлы (.m3u8 и .ts) хранятся в бакете 'audio'
  const isHLSFile = cleanedPath.endsWith('.m3u8') || cleanedPath.endsWith('.ts');
  const bucketName = isHLSFile ? '' : BUCKET_NAME;

  const { data } = supabase.storage.from(bucketName).getPublicUrl(cleanedPath);

  if (!data?.publicUrl) {
    console.warn(`Не удалось получить publicUrl для файла: ${cleanedPath} из бакета: ${bucketName}`);
    return null;
  }

  return data.publicUrl;
};

/**
 * // @anchor: upload-file-c3d4
 * Загружает файл в Supabase Storage.
 * @param file - Файл для загрузки.
 * @param prefix - Префикс/папка в бакете (например, 'images/').
 * @returns Путь к загруженному файлу.
 */
export const uploadFile = async (file: File, prefix: string = ''): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${prefix}${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (error) {
    console.error('Ошибка загрузки файла в Supabase:', error);
    throw new Error(`Не удалось загрузить файл: ${error.message}`);
  }

  return filePath;
};

/**
 * // @anchor: delete-file-e5f6
 * Удаляет файл из Supabase Storage.
 * @param filePath - Полный путь к файлу в бакете.
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error('Ошибка удаления файла из Supabase:', error);
    throw new Error(`Не удалось удалить файл: ${error.message}`);
  }
};

