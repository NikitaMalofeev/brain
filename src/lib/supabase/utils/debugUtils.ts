/**
 * Утилиты для отладки Supabase соединения
 */
import { supabase } from '../client';
import { logger } from '@/lib/logger';

/**
 * Проверяет и логирует статус подключения к Supabase
 */
export async function checkSupabaseConnection() {
  logger.info('Checking Supabase connection...');
  
  if (!supabase) {
    logger.error('Supabase client is not available');
    return {
      connected: false,
      error: 'Supabase client is not available',
      usersTableCount: null,
      realtimeConnected: false,
      features: null
    };
  }

  // Проверяем доступные фичи
  const features = {
    authEnabled: !!supabase?.auth,
    realtimeEnabled: !!supabase?.realtime,
    signUp: !!supabase?.auth?.signUp
  };
  
  // Проверяем подключение через запрос к таблице users
  try {
    const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact' }).limit(0);
    
    if (error) throw error;
    
    logger.info('Connection to Supabase successful', { count: data });
    
    // Проверяем Realtime соединение
    let realtimeConnected = false;
    
    try {
      const channel = supabase.channel('connection-check');
      channel
        .on('system', { event: 'connected' }, () => {
          realtimeConnected = true;
          logger.info('Realtime connection successful');
        })
        .subscribe((status) => {
          logger.info(`Realtime connection status: ${status}`);
          if (status === 'SUBSCRIBED') {
            realtimeConnected = true;
          }
        });
      
      // Дадим время на подключение (максимум 3 секунды)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Отписываемся, чтобы не держать соединение открытым
      channel.unsubscribe();
    } catch (realtimeError) {
      logger.error('Error checking Realtime connection:', realtimeError);
    }
    
    // Безопасное обращение к свойствам данных
    let usersCount = 0;
    if (Array.isArray(data) && data.length > 0 && 'count' in data[0]) {
      usersCount = data[0].count as number;
    }
    
    return {
      connected: true,
      error: null,
      usersTableCount: usersCount,
      realtimeConnected,
      features
    };
  } catch (err) {
    logger.error('Error connecting to Supabase:', err);
    
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      usersTableCount: null,
      realtimeConnected: false,
      features
    };
  }
}

/**
 * Проверяет публичные эндпоинты API сервера
 */
export const checkServerEndpoints = async (): Promise<{
  success: boolean;
  results: Record<string, any>;
}> => {
  const endpoints = [
    '/api/server-info',
    '/api/server-info-edge'
  ];
  
  const results: Record<string, any> = {};
  
  for (const endpoint of endpoints) {
    try {
      logger.info(`Checking endpoint: ${endpoint}`);
      const response = await fetch(endpoint);
      
      results[endpoint] = {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : null
      };
    } catch (err) {
      logger.warn(`Failed to check endpoint: ${endpoint}`, err);
      results[endpoint] = {
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }
  
  // Проверяем доступность логирования
  try {
    logger.info('Testing log endpoint');
    await logger.info('Test log message');
    results['logging'] = { tested: true };
  } catch (err) {
    results['logging'] = { 
      tested: true, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
  
  return {
    success: Object.values(results).some(r => r.ok || r.tested),
    results
  };
}; 