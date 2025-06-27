import { CURATOR_PASSWORD_CONFIG } from '@/lib/config/constants';

/**
 * Валидация пароля для куратора
 * @param password - пароль для проверки
 * @returns null если пароль валиден, иначе текст ошибки
 */
export const validateCuratorPassword = (password: string): string | null => {
    if (!password || password.length < CURATOR_PASSWORD_CONFIG.MIN_LENGTH) {
        return CURATOR_PASSWORD_CONFIG.ERROR_MESSAGE;
    }
    return null;
};

/**
 * Валидация логина для куратора
 * @param login - логин для проверки
 * @returns null если логин валиден, иначе текст ошибки
 */
export const validateLoginFormat = (login: string): string | null => {
    if (!login.trim()) {
        return 'Логин обязателен для заполнения';
    }
    // Регулярка БЕЗ точки, как указано в UI: "Только a-z, A-Z, 0-9, _, -"
    if (!/^[a-zA-Z0-9_-]+$/.test(login)) {
        return 'Логин может содержать только латинские буквы, цифры, дефис (-) и подчеркивание (_)';
    }
    if (login.length < 4) {
        return 'Логин должен быть не менее 4 символов';
    }
    return null;
}; 