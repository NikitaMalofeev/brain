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
        // ОТКЛЮЧЕНА: теперь доступ предоставляется только через токены/тарифы
        ENABLED: false,

        // ID курса для автоматической подписки (по умолчанию = DEFAULT_COURSE_ID)
        COURSE_ID: '1d66bf31-dc5b-4291-9581-f7f12cc373b6',

        // Проверять ли существующих пользователей на наличие подписки
        CHECK_EXISTING_USERS: false,
    },
} as const;

// Экспорт для обратной совместимости
export const HARDCODED_COURSE_ID = COURSE_CONFIG.DEFAULT_COURSE_ID; 