// Утилита для автоматической записи пользователей на курс и поток
import { supabase } from '../client';
import { COURSE_CONFIG } from '../../config/constants';
import { logger } from '../../logger';

/**
 * Автоматически назначает пользователю максимальный тариф и последний поток
 * Вызывается при создании нового пользователя
 * @param userId - UUID пользователя из таблицы users
 * @returns Promise<boolean> - успешность операции
 */
export async function autoEnrollUserToCourse(userId: string): Promise<boolean> {
    if (!supabase) {
        logger.error('Supabase client not available for auto-enrollment', { userId });
        return false;
    }

    try {
        // Вызываем RPC функцию для назначения тарифа и потока
        // Эта функция также вызывается триггером при создании пользователя,
        // но вызываем её здесь на случай если триггер не сработал
        const { data, error } = await supabase.rpc('assign_tariff_and_stream_to_user', {
            p_user_id: userId
        });

        if (error) {
            logger.error('Error calling assign_tariff_and_stream_to_user', { userId, error });
            // Продолжаем со старой логикой как fallback
            return await fallbackEnrollment(userId);
        }

        logger.info('User auto-enrollment completed', { userId, result: data });
        return true;

    } catch (error) {
        logger.error('Unexpected error during auto-enrollment', { userId, error });
        return await fallbackEnrollment(userId);
    }
}

/**
 * Fallback логика если RPC функция недоступна
 */
async function fallbackEnrollment(userId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
        // Проверяем, включена ли автоматическая подписка
        if (!COURSE_CONFIG.AUTO_ENROLLMENT.ENABLED) {
            logger.debug('Auto-enrollment disabled, skipping', { userId });
            return true;
        }

        // Получаем максимальный тариф (T4)
        const { data: tariff, error: tariffError } = await supabase
            .from('tariffs')
            .select('id')
            .eq('code', 'T4')
            .single();

        if (tariffError && tariffError.code !== 'PGRST116') {
            logger.error('Error fetching max tariff', { error: tariffError });
        }

        // Получаем последний поток
        const { data: stream, error: streamError } = await supabase
            .from('streams')
            .select('id')
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (streamError && streamError.code !== 'PGRST116') {
            logger.error('Error fetching latest stream', { error: streamError });
        }

        // Назначаем тариф если его нет
        if (tariff?.id) {
            const { data: existingTariff } = await supabase
                .from('user_tariffs')
                .select('id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (!existingTariff) {
                await supabase
                    .from('user_tariffs')
                    .insert({ user_id: userId, tariff_id: tariff.id, is_active: true });
                logger.info('Assigned tariff to user (fallback)', { userId, tariffId: tariff.id });
            }
        }

        // Записываем на поток если не записан
        if (stream?.id) {
            const { data: existingEnrollment } = await supabase
                .from('user_stream_enrollments')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (!existingEnrollment) {
                await supabase
                    .from('user_stream_enrollments')
                    .insert({
                        user_id: userId,
                        stream_id: stream.id,
                        enrolled_at: new Date().toISOString()
                    });
                logger.info('Enrolled user to stream (fallback)', { userId, streamId: stream.id });
            }
        }

        return true;
    } catch (error) {
        logger.error('Fallback enrollment failed', { userId, error });
        return false;
    }
}

/**
 * Проверяет и при необходимости записывает существующего пользователя на курс
 * Используется для пользователей, которые уже существуют в системе
 */
export async function checkAndEnrollExistingUser(userId: string): Promise<boolean> {
    if (!COURSE_CONFIG.AUTO_ENROLLMENT.CHECK_EXISTING_USERS) {
        return true;
    }

    return autoEnrollUserToCourse(userId);
} 