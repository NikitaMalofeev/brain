// Вспомогательные функции для работы с дедлайнами уроков

export type DeadlineStatus = 'missed' | 'today' | 'tomorrow' | null;

/**
 * Определяет статус дедлайна относительно текущего времени
 * @param deadline_at - строка с временем дедлайна в ISO формате
 * @returns статус дедлайна или null если дедлайна нет
 */
export const getDeadlineStatus = (deadline_at?: string): DeadlineStatus => {
    if (!deadline_at) return null;

    const now = new Date();
    const deadline = new Date(deadline_at);

    // Если дедлайн уже прошел
    if (now > deadline) {
        return 'missed';
    }

    // Получаем даты без времени для сравнения дней
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    // Проверяем, дедлайн сегодня
    if (deadlineDate.getTime() === todayDate.getTime()) {
        return 'today';
    }

    // Проверяем, дедлайн завтра
    if (deadlineDate.getTime() === tomorrowDate.getTime()) {
        return 'tomorrow';
    }

    return null;
};

/**
 * Проверяет, пропущен ли дедлайн
 * @param deadline_at - строка с временем дедлайна в ISO формате
 * @returns true если дедлайн пропущен
 */
export const isAfterDeadline = (deadline_at?: string): boolean => {
    if (!deadline_at) return false;

    const now = new Date();
    const deadline = new Date(deadline_at);

    return now > deadline;
};

/**
 * Проверяет, дедлайн сегодня
 * @param deadline_at - строка с временем дедлайна в ISO формате
 * @returns true если дедлайн сегодня
 */
export const isDeadlineToday = (deadline_at?: string): boolean => {
    return getDeadlineStatus(deadline_at) === 'today';
};

/**
 * Проверяет, дедлайн завтра
 * @param deadline_at - строка с временем дедлайна в ISO формате
 * @returns true если дедлайн завтра
 */
export const isDeadlineTomorrow = (deadline_at?: string): boolean => {
    return getDeadlineStatus(deadline_at) === 'tomorrow';
};

/**
 * Форматирует дату и время дедлайна для отображения пользователю
 * @param deadline_at - строка с временем дедлайна в ISO формате
 * @returns отформатированная строка с датой и временем
 */
export const formatDeadline = (deadline_at?: string): string => {
    if (!deadline_at) return '';

    const deadline = new Date(deadline_at);

    return deadline.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}; 