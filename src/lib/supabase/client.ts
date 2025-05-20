import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../logger';

// Проверяем, есть ли переменные окружения для Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Создаем клиент, если переменные окружения доступны
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        // Параметры для Realtime соединения (если нужны)
      },
    })
  : null;

// Логгируем информацию о клиенте
if (supabase) {
  logger.info(`Supabase client initialized with URL: ${supabaseUrl?.substr(0, 30)}...`);
} else {
  logger.error('Failed to initialize Supabase client: missing environment variables');
}

// Функция для подписки на изменения пользователя по telegram_id
// Теперь опциональная, поскольку мы предпочитаем не использовать realtime подписки для уменьшения нагрузки
export function subscribeToUserChanges(telegramId: number, callback: (payload: any) => void): RealtimeChannel | null {
  if (!supabase) {
    logger.error('Cannot subscribe to user changes: Supabase client is not available');
    return null;
  }
  
  logger.warn('⚠️ subscribeToUserChanges is deprecated and may cause excessive updates');
  
  try {
    const channel = supabase.channel(`public:users:telegram_id=eq.${telegramId}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `telegram_id=eq.${telegramId}`,
        },
        callback
      )
      .subscribe((status) => {
        logger.info(`User changes subscription status for telegram_id=${telegramId}: ${status}`);
      });
      
    return channel;
  } catch (error) {
    logger.error('Error subscribing to user changes:', error);
    return null;
  }
} 