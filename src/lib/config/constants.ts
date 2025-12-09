// Конфигурация курсов и автоматической подписки
// Все настройки курсов собраны в одном месте для удобного управления

// Конфигурация Telegram бота
export const BOT_CONFIG = {
    // Имя бота (без @), можно переопределить через переменную окружения
    BOT_NAME: import.meta.env.VITE_TELEGRAM_BOT_NAME || 'brain_programming_stage_bot',
} as const;

export const COURSE_CONFIG = {
    // ID курса по умолчанию (ранее HARDCODED_COURSE_ID)
    DEFAULT_COURSE_ID: '1d66bf31-dc5b-4291-9581-f7f12cc373b6',

    // Настройки автоматической подписки
    AUTO_ENROLLMENT: {
        // ВКЛЮЧЕНА: автоматическое назначение максимального тарифа и последнего потока
        ENABLED: true,

        // ID курса для автоматической подписки (по умолчанию = DEFAULT_COURSE_ID)
        COURSE_ID: '1d66bf31-dc5b-4291-9581-f7f12cc373b6',

        // Проверять ли существующих пользователей на наличие подписки
        // Если true - при каждом входе проверяем и назначаем тариф/поток если их нет
        CHECK_EXISTING_USERS: true,
    },
} as const;

// Экспорт для обратной совместимости
export const HARDCODED_COURSE_ID = COURSE_CONFIG.DEFAULT_COURSE_ID;

// Конфигурация требований к паролям для кураторов
export const CURATOR_PASSWORD_CONFIG = {
    MIN_LENGTH: 8,
    PLACEHOLDER: 'Минимум 8 символов',
    ERROR_MESSAGE: 'Пароль должен содержать минимум 8 символов'
} as const; 