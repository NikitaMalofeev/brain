import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type InitData as TelegramInitDataType } from '@telegram-apps/sdk-react';
import { supabase } from '../client';
import { type SupabaseUser, type TelegramUserData } from '../types';
import { logger } from '../../logger';
import { autoEnrollUserToCourse, checkAndEnrollExistingUser } from '../utils/autoEnrollUser';

// Определяем тип для возвращаемого значения хука
interface UseSupabaseUserReturn {
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void; // Функция для повторного запроса
  markOnboardingCompleted: () => void; // Функция для отметки завершения онбординга
}

// Функция для создания или обновления пользователя
const upsertUser = async (telegramData: TelegramUserData): Promise<SupabaseUser> => {
  if (!supabase) {
    throw new Error('Supabase client недоступен');
  }

  logger.info('Processing user authentication', { telegramId: telegramData.id });

  // Проверяем существующего пользователя
  let { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramData.id)
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 - "No rows found"
    throw selectError;
  }

  if (existingUser) {
    // Обновляем существующего пользователя
    logger.info('Updating existing user', { telegramId: telegramData.id });
    const updates: Partial<SupabaseUser> = {
      last_login: new Date().toISOString(),
      first_name: telegramData.first_name,
      last_name: telegramData.last_name,
      username: telegramData.username,
      photo_url: telegramData.photo_url,
      auth_date: telegramData.auth_date,
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('telegram_id', telegramData.id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    logger.info('User updated successfully');

    // Проверяем и при необходимости записываем существующего пользователя на курс
    await checkAndEnrollExistingUser(updatedUser.id);

    return updatedUser;
  } else {
    // Создаем нового пользователя
    logger.info('Creating new user', { telegramId: telegramData.id });
    const newUserPayload: Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at' | 'last_login'> & { last_login?: string } = {
      telegram_id: telegramData.id,
      first_name: telegramData.first_name,
      last_name: telegramData.last_name,
      username: telegramData.username,
      photo_url: telegramData.photo_url,
      auth_date: telegramData.auth_date,
      hash: telegramData.hash,
      last_login: new Date().toISOString(),
    };

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(newUserPayload)
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    logger.info('New user created successfully');

    // Автоматически записываем нового пользователя на дефолтный курс
    await autoEnrollUserToCourse(newUser.id);

    return newUser;
  }
};

// Функция для отметки завершения онбординга
const markOnboardingCompletedMutation = async (userId: string): Promise<SupabaseUser> => {
  if (!supabase) {
    throw new Error('Supabase client недоступен');
  }

  logger.info('Marking onboarding as completed', { userId });

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  logger.info('Onboarding marked as completed successfully');
  return updatedUser;
};



/**
 * Хук для "аутентификации" пользователя Telegram в Supabase с использованием React Query.
 * Принимает initData (или initDataUnsafe) от Telegram SDK.
 */
export function useSupabaseUser(initDataRaw: TelegramInitDataType | undefined): UseSupabaseUserReturn {
  const queryClient = useQueryClient();

  // Попытка получить данные пользователя из initData
  const telegramUserFromInitData = initDataRaw?.user;
  const authDateFromInitData = initDataRaw?.auth_date; // Это Unix timestamp (число)
  const hashFromInitData = initDataRaw?.hash;

  // Создаем объект с данными для запроса
  const telegramData: TelegramUserData | null = telegramUserFromInitData && authDateFromInitData ? {
    id: telegramUserFromInitData.id,
    // @ts-expect-error SDK типы могут быть неточными для initDataUnsafe, пробуем оба варианта
    first_name: telegramUserFromInitData.first_name || telegramUserFromInitData.firstName,
    // @ts-expect-error
    last_name: telegramUserFromInitData.last_name || telegramUserFromInitData.lastName,
    username: telegramUserFromInitData.username,
    // @ts-expect-error
    photo_url: telegramUserFromInitData.photo_url || telegramUserFromInitData.photoUrl,
    auth_date: typeof authDateFromInitData === 'number' ? authDateFromInitData : Math.floor(new Date(authDateFromInitData as any).getTime() / 1000),
    hash: hashFromInitData || '',
  } : null;

  // Query для получения/создания пользователя
  const {
    data: supabaseUser,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['supabase-user', telegramData?.id],
    queryFn: () => upsertUser(telegramData!),
    enabled: !!telegramData, // Запрос выполняется только если есть данные Telegram
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 минут - данные пользователя редко меняются
    gcTime: 30 * 60 * 1000, // 30 минут в кэше
  });

  // Мутация для отметки завершения онбординга
  const onboardingMutation = useMutation({
    mutationFn: markOnboardingCompletedMutation,
    onSuccess: (updatedUser) => {
      // Обновляем кэш пользователя
      queryClient.setQueryData(['supabase-user', telegramData?.id], updatedUser);
      logger.info('Onboarding completion cache updated');
    },
    onError: (err) => {
      logger.error('Error marking onboarding as completed:', err);
    },
  });

  // Функция для отметки завершения онбординга
  const markOnboardingCompleted = useCallback(() => {
    if (!supabaseUser?.id) {
      logger.warn('Cannot mark onboarding completed: no user found');
      return;
    }
    onboardingMutation.mutate(supabaseUser.id);
  }, [supabaseUser?.id, onboardingMutation]);

  return {
    supabaseUser: supabaseUser || null,
    loading,
    error: error as Error | null,
    refetch,
    markOnboardingCompleted
  };
} 