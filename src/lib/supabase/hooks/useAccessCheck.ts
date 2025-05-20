import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { logger } from '../../logger';

// Интерфейс для результата проверки доступа
interface AccessCheckResult {
  isLoading: boolean;
  hasAccess: boolean;
  accessTill: Date | null;
  isAdmin: boolean;
  error: string | null;
}

/**
 * Хук для проверки доступа пользователя по его ID
 * Проверяет дату окончания доступа и статус админа
 * Если пользователь админ, то он всегда имеет доступ
 */
export function useAccessCheck(userId: string | null): AccessCheckResult {
  const [result, setResult] = useState<AccessCheckResult>({
    isLoading: true,
    hasAccess: false,
    accessTill: null,
    isAdmin: false,
    error: null
  });

  useEffect(() => {
    if (!userId || !supabase) {
      setResult({
        ...result,
        isLoading: false,
        error: !userId ? 'Пользователь не авторизован' : 'Supabase недоступен'
      });
      return;
    }

    const checkAccess = async () => {
      try {
        // Проверяем что supabase клиент инициализирован
        if (!supabase) {
          setResult({
            isLoading: false,
            hasAccess: false,
            accessTill: null,
            isAdmin: false,
            error: 'Supabase клиент не инициализирован'
          });
          return;
        }

        // Получаем данные пользователя из Supabase
        const { data, error } = await supabase
          .from('users')
          .select('access_till, is_admin')
          .eq('id', userId)
          .single();

        if (error) {
          logger.error('Error checking user access:', error);
          setResult({
            isLoading: false,
            hasAccess: false,
            accessTill: null,
            isAdmin: false,
            error: 'Ошибка при проверке доступа'
          });
          return;
        }

        // Проверяем админский статус
        const isAdmin = data?.is_admin === true;
        
        // Проверяем дату доступа
        let hasAccess = false;
        let accessTill = null;
        
        if (data?.access_till) {
          accessTill = new Date(data.access_till);
          // Проверяем не истек ли срок доступа
          hasAccess = accessTill > new Date();
        }
        
        // Если пользователь админ, то у него всегда есть доступ
        if (isAdmin) {
          hasAccess = true;
        }

        setResult({
          isLoading: false,
          hasAccess,
          accessTill,
          isAdmin,
          error: null
        });

      } catch (err) {
        logger.error('Unexpected error during access check:', err);
        setResult({
          isLoading: false,
          hasAccess: false,
          accessTill: null,
          isAdmin: false,
          error: 'Непредвиденная ошибка при проверке доступа'
        });
      }
    };

    checkAccess();
  }, [userId]);

  return result;
}

/**
 * Форматирует дату окончания доступа в читаемый формат
 */
export function formatAccessDate(date: Date | null): string {
  if (!date) {
    return 'Нет информации';
  }
  
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
} 