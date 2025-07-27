/*
name: StoragePrefixes
role: Subsystem
responsibility: Defines constants and types for Supabase Storage file paths.
*/

// @anchor: storage-prefixes-constants-a1b2
export const BUCKET_NAME = 'media';

// Отдельные бакеты для разных типов файлов
export const BUCKET_NAMES = {
  AUDIO: 'audio',
  MEDIA: 'media', // для остальных файлов
} as const;

export const FILE_PREFIXES = {
  IMAGE: 'images/',
  AUDIO: 'audio/',
  VIDEO: 'video/', // Reserved for future use
  DOCUMENT: 'documents/',
  AVATAR: 'avatars/'
} as const;

// @anchor: file-prefix-type-c3d4
export type FilePrefix = typeof FILE_PREFIXES[keyof typeof FILE_PREFIXES];
