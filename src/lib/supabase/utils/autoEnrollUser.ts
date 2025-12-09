// Утилита для автоматической записи пользователей на курс и поток
import { supabase } from '../client';
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

    logger.info('Starting auto-enrollment for user', { userId });

    try {
        // Сначала пробуем RPC функцию (она должна работать даже с RLS)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('assign_tariff_and_stream_to_user', {
            p_user_id: userId
        });

        if (!rpcError && rpcResult) {
            logger.info('RPC auto-enrollment completed', { userId, result: rpcResult });

            // Проверяем, были ли реально назначены тариф и поток
            const tariffAssigned = rpcResult.tariff_assigned === true;
            const streamAssigned = rpcResult.stream_assigned === true;

            if (tariffAssigned || streamAssigned) {
                logger.info('User enrolled successfully via RPC', {
                    userId,
                    tariffAssigned,
                    streamAssigned,
                    tariffId: rpcResult.tariff_id,
                    streamId: rpcResult.stream_id
                });
                return true;
            }

            // Если RPC вернулся без ошибки но ничего не назначил,
            // возможно данные уже есть - проверяем
            const hasData = await checkUserHasTariffAndStream(userId);
            if (hasData.hasTariff && hasData.hasStream) {
                logger.info('User already has tariff and stream', { userId });
                return true;
            }
        }

        if (rpcError) {
            logger.warn('RPC function failed, trying direct insert', { userId, error: rpcError.message });
        }

        // Fallback: прямые запросы к базе
        return await directEnrollment(userId);

    } catch (error) {
        logger.error('Unexpected error during auto-enrollment', { userId, error });
        // Последняя попытка - прямые запросы
        return await directEnrollment(userId);
    }
}

/**
 * Проверяет, есть ли у пользователя тариф и поток
 */
async function checkUserHasTariffAndStream(userId: string): Promise<{ hasTariff: boolean; hasStream: boolean }> {
    if (!supabase) return { hasTariff: false, hasStream: false };

    try {
        const [tariffResult, streamResult] = await Promise.all([
            supabase
                .from('user_tariffs')
                .select('id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle(),
            supabase
                .from('user_stream_enrollments')
                .select('id')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle()
        ]);

        return {
            hasTariff: !!tariffResult.data,
            hasStream: !!streamResult.data
        };
    } catch (error) {
        logger.error('Error checking user tariff/stream', { userId, error });
        return { hasTariff: false, hasStream: false };
    }
}

/**
 * Прямое назначение тарифа и потока через INSERT
 * Используется как fallback если RPC не работает
 */
async function directEnrollment(userId: string): Promise<boolean> {
    if (!supabase) return false;

    logger.info('Attempting direct enrollment', { userId });

    try {
        // Получаем максимальный тариф (T4)
        const { data: tariff, error: tariffError } = await supabase
            .from('tariffs')
            .select('id, code')
            .eq('code', 'T4')
            .single();

        if (tariffError) {
            logger.warn('T4 tariff not found, trying to get any tariff', { error: tariffError.message });

            // Fallback: берём любой тариф с максимальным кодом
            const { data: anyTariff } = await supabase
                .from('tariffs')
                .select('id, code')
                .order('code', { ascending: false })
                .limit(1)
                .single();

            if (anyTariff) {
                logger.info('Found fallback tariff', { tariffId: anyTariff.id, code: anyTariff.code });
            }
        }

        const tariffId = tariff?.id;

        // Получаем последний поток
        const { data: stream, error: streamError } = await supabase
            .from('streams')
            .select('id, name, start_date')
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (streamError) {
            logger.error('No streams found', { error: streamError.message });
        }

        const streamId = stream?.id;

        let tariffAssigned = false;
        let streamAssigned = false;

        // Назначаем тариф
        if (tariffId) {
            // Сначала проверяем, нет ли уже тарифа
            const { data: existingTariff } = await supabase
                .from('user_tariffs')
                .select('id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle();

            if (!existingTariff) {
                const { error: insertTariffError } = await supabase
                    .from('user_tariffs')
                    .insert({
                        user_id: userId,
                        tariff_id: tariffId,
                        is_active: true
                    });

                if (insertTariffError) {
                    logger.error('Failed to assign tariff', {
                        userId,
                        tariffId,
                        error: insertTariffError.message,
                        code: insertTariffError.code,
                        details: insertTariffError.details
                    });
                } else {
                    tariffAssigned = true;
                    logger.info('Tariff assigned successfully', { userId, tariffId });
                }
            } else {
                logger.info('User already has active tariff', { userId, existingTariffId: existingTariff.id });
                tariffAssigned = true;
            }
        } else {
            logger.error('No tariff found to assign', { userId });
        }

        // Записываем на поток
        if (streamId) {
            // Сначала проверяем, не записан ли уже
            const { data: existingEnrollment } = await supabase
                .from('user_stream_enrollments')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (!existingEnrollment) {
                const { error: insertStreamError } = await supabase
                    .from('user_stream_enrollments')
                    .insert({
                        user_id: userId,
                        stream_id: streamId,
                        enrolled_at: new Date().toISOString()
                    });

                if (insertStreamError) {
                    logger.error('Failed to enroll to stream', {
                        userId,
                        streamId,
                        error: insertStreamError.message,
                        code: insertStreamError.code,
                        details: insertStreamError.details
                    });
                } else {
                    streamAssigned = true;
                    logger.info('Stream enrollment successful', { userId, streamId, streamName: stream?.name });
                }
            } else {
                logger.info('User already enrolled to a stream', { userId, existingEnrollmentId: existingEnrollment.id });
                streamAssigned = true;
            }
        } else {
            logger.error('No stream found to enroll', { userId });
        }

        const success = tariffAssigned && streamAssigned;
        logger.info('Direct enrollment completed', { userId, tariffAssigned, streamAssigned, success });

        return success;
    } catch (error) {
        logger.error('Direct enrollment failed', { userId, error });
        return false;
    }
}

/**
 * Проверяет и при необходимости записывает существующего пользователя на курс
 * Используется для пользователей, которые уже существуют в системе
 */
export async function checkAndEnrollExistingUser(userId: string): Promise<boolean> {
    // Проверяем, есть ли уже тариф и поток
    const { hasTariff, hasStream } = await checkUserHasTariffAndStream(userId);

    if (hasTariff && hasStream) {
        // Всё уже назначено
        return true;
    }

    logger.info('Existing user missing tariff or stream, enrolling', {
        userId,
        hasTariff,
        hasStream
    });

    return autoEnrollUserToCourse(userId);
}
