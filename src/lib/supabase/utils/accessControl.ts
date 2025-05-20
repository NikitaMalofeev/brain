import { supabase } from '../client';
import { logger } from '../../logger';

/**
 * Проверяет, имеет ли пользователь доступ к премиум контенту
 * Учитывает дату access_till и admin статус
 * 
 * @param userId - ID пользователя из Supabase
 * @returns Promise<boolean> - true если доступ разрешен
 */
export async function checkUserAccess(userId: string | null): Promise<boolean> {
  if (!userId || !supabase) {
    logger.warn('Access check failed: missing user ID or Supabase client');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('access_till, is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error checking user access:', error);
      return false;
    }

    // Админы всегда имеют доступ
    if (data?.is_admin === true) {
      return true;
    }

    // Если нет даты окончания доступа, доступ закрыт
    if (!data?.access_till) {
      return false;
    }

    // Проверяем не истек ли срок доступа
    const accessTill = new Date(data.access_till);
    const now = new Date();
    
    return accessTill > now;
  } catch (err) {
    logger.error('Unexpected error during access check:', err);
    return false;
  }
}

/**
 * HOF для создания middleware проверки доступа
 * Может использоваться как на клиенте, так и на сервере
 * 
 * @param onNoAccess - Функция, вызываемая при отсутствии доступа
 * @returns Функция middleware для проверки доступа
 */
export function createAccessMiddleware(onNoAccess: () => void) {
  return async (userId: string | null): Promise<boolean> => {
    const hasAccess = await checkUserAccess(userId);
    
    if (!hasAccess) {
      onNoAccess();
    }
    
    return hasAccess;
  };
} 