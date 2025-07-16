// Утилита для автоматической записи пользователей на курс
import { supabase } from '../client';
import { COURSE_CONFIG } from '../../config/constants';
import { logger } from '../../logger';

/**
 * Автоматически записывает пользователя на активный курс
 * @param userId - UUID пользователя из таблицы users
 * @returns Promise<boolean> - успешность операции
 */
export async function autoEnrollUserToCourse(userId: string): Promise<boolean> {
    // Проверяем, включена ли автоматическая подписка
    if (!COURSE_CONFIG.AUTO_ENROLLMENT.ENABLED) {
        logger.debug('Auto-enrollment disabled, skipping', { userId });
        return true; // Не ошибка, просто отключено
    }

    if (!supabase) {
        logger.error('Supabase client not available for auto-enrollment', { userId });
        return false;
    }

    try {
        // Получаем активный курс пользователя из user_course_enrollments
        const { data: activeEnrollment, error: enrollmentError } = await supabase
            .from('user_course_enrollments')
            .select('course_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (enrollmentError && enrollmentError.code !== 'PGRST116') {
            logger.error('Error checking active enrollment', { userId, error: enrollmentError });
            return false;
        }

        // Если у пользователя уже есть активный курс, используем его
        const courseId = activeEnrollment?.course_id || COURSE_CONFIG.AUTO_ENROLLMENT.COURSE_ID;

        logger.debug('Starting auto-enrollment process', { userId, courseId });

        // Проверяем, не записан ли пользователь уже на этот курс
        const { data: existingEnrollment, error: checkError } = await supabase
            .from('user_course_enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .eq('is_active', true)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = "No rows found"
            logger.error('Error checking existing enrollment', { userId, courseId, error: checkError });
            return false;
        }

        // Если пользователь уже записан, ничего не делаем
        if (existingEnrollment) {
            logger.debug('User already enrolled, skipping auto-enrollment', { userId, courseId });
            return true;
        }

        // Записываем пользователя на курс
        const { error: insertError } = await supabase
            .from('user_course_enrollments')
            .insert({
                user_id: userId,
                course_id: courseId,
                enrollment_date: new Date().toISOString(),
                is_active: true,
            });

        if (insertError) {
            logger.error('Failed to auto-enroll user', { userId, courseId, error: insertError });
            return false;
        }

        logger.info('User successfully auto-enrolled to course', { userId, courseId });
        return true;

    } catch (error) {
        logger.error('Unexpected error during auto-enrollment', { userId, error });
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