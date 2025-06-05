// dateMoscow.ts
// Вспомогательные функции для работы с датой по московскому времени (UTC+3)

/**
 * Переводит ISO строку (UTC) в YYYY-MM-DDTHH:mm по Москве для input type="datetime-local"
 */
export function utcToMoscowLocal(utcDateString?: string): string {
    if (!utcDateString) return '';
    const date = new Date(utcDateString);
    // Переводим в московское время (UTC+3)
    const msk = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    // YYYY-MM-DDTHH:mm
    const year = msk.getFullYear();
    const month = String(msk.getMonth() + 1).padStart(2, '0');
    const day = String(msk.getDate()).padStart(2, '0');
    const hours = String(msk.getHours()).padStart(2, '0');
    const minutes = String(msk.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Переводит значение из <input type="datetime-local"> (московское) в UTC ISO
 */
export function moscowLocalToUtc(localDateString?: string): string | undefined {
    if (!localDateString) return undefined;
    // localDateString = 'YYYY-MM-DDTHH:mm' (московское время)
    const msk = new Date(localDateString);
    // Вычитаем 3 часа, чтобы получить UTC
    const utc = new Date(msk.getTime() - 3 * 60 * 60 * 1000);
    return utc.toISOString();
}

/**
 * Форматирует дату для отображения по Москве
 */
export function formatDateTimeMoscow(isoString: string | undefined): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    // Москва UTC+3
    const msk = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    return msk.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
} 