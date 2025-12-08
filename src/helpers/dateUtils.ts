// dateUtils.ts
// Единый модуль для работы с датами и часовыми поясами
// ВАЖНО: Все даты в БД хранятся в UTC. В админке используется МСК (UTC+3), на клиенте - локальное время пользователя.

const MOSCOW_OFFSET_HOURS = 3; // UTC+3

// ============================================
// КОНСТАНТЫ
// ============================================

export const TIMEZONE_LABELS = {
  MOSCOW: 'МСК',
  UTC: 'UTC',
  LOCAL: 'местное время',
} as const;

// ============================================
// КОНВЕРТАЦИЯ UTC <-> МОСКОВСКОЕ ВРЕМЯ (для админки)
// ============================================

/**
 * Переводит ISO строку (UTC) в YYYY-MM-DDTHH:mm по Москве для input type="datetime-local"
 */
export function utcToMoscow(utcDateString?: string): string {
  if (!utcDateString) return '';
  const date = new Date(utcDateString);
  const msk = new Date(date.getTime() + MOSCOW_OFFSET_HOURS * 60 * 60 * 1000);
  return formatToDateTimeLocal(msk);
}

/**
 * Переводит значение из <input type="datetime-local"> (московское) в UTC ISO
 */
export function moscowToUtc(localDateString?: string): string | undefined {
  if (!localDateString) return undefined;
  const msk = new Date(localDateString);
  const utc = new Date(msk.getTime() - MOSCOW_OFFSET_HOURS * 60 * 60 * 1000);
  return utc.toISOString();
}

/**
 * Форматирует дату для отображения по Москве (ДД.ММ.ГГГГ ЧЧ:мм)
 */
export function formatMoscowDateTime(isoString?: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const msk = new Date(date.getTime() + MOSCOW_OFFSET_HOURS * 60 * 60 * 1000);
  return formatRussianDateTime(msk);
}

/**
 * Форматирует дату для отображения по Москве с меткой часового пояса
 */
export function formatMoscowDateTimeWithLabel(isoString?: string): string {
  if (!isoString) return '-';
  return `${formatMoscowDateTime(isoString)} (${TIMEZONE_LABELS.MOSCOW})`;
}

// ============================================
// КОНВЕРТАЦИЯ UTC <-> ЛОКАЛЬНОЕ ВРЕМЯ ПОЛЬЗОВАТЕЛЯ (для клиента)
// ============================================

/**
 * Переводит ISO строку (UTC) в локальное время пользователя для input type="datetime-local"
 */
export function utcToLocal(utcDateString?: string): string {
  if (!utcDateString) return '';
  const date = new Date(utcDateString);
  return formatToDateTimeLocal(date);
}

/**
 * Переводит значение из <input type="datetime-local"> (локальное) в UTC ISO
 */
export function localToUtc(localDateString?: string): string | undefined {
  if (!localDateString) return undefined;
  const local = new Date(localDateString);
  return local.toISOString();
}

/**
 * Форматирует UTC дату в локальное время пользователя (ДД.ММ.ГГГГ ЧЧ:мм)
 */
export function formatLocalDateTime(isoString?: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return formatRussianDateTime(date);
}

/**
 * Форматирует UTC дату в локальное время пользователя (только дата: ДД.ММ.ГГГГ)
 */
export function formatLocalDate(isoString?: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Форматирует UTC дату в локальное время пользователя (только время: ЧЧ:мм)
 */
export function formatLocalTime(isoString?: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Форматирует UTC дату в локальное время с относительным описанием
 * Примеры: "Сегодня, 14:30", "Завтра, 10:00", "15.01.2024, 09:00"
 */
export function formatLocalDateTimeRelative(isoString?: string): string {
  if (!isoString) return '-';

  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (dateOnly.getTime() === today.getTime()) {
    return `Сегодня, ${time}`;
  }

  if (dateOnly.getTime() === tomorrow.getTime()) {
    return `Завтра, ${time}`;
  }

  return `${formatLocalDate(isoString)}, ${time}`;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Форматирует Date в строку для input type="datetime-local" (YYYY-MM-DDTHH:mm)
 */
function formatToDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Форматирует Date в русский формат (ДД.ММ.ГГГГ ЧЧ:мм)
 */
function formatRussianDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Получает текущий часовой пояс пользователя в формате "UTC+X" или "UTC-X"
 */
export function getUserTimezoneLabel(): string {
  const offset = -new Date().getTimezoneOffset() / 60;
  const sign = offset >= 0 ? '+' : '';
  return `UTC${sign}${offset}`;
}

/**
 * Проверяет, истёк ли дедлайн (в локальном времени пользователя)
 */
export function isDeadlineExpired(deadlineIso?: string): boolean {
  if (!deadlineIso) return false;
  return new Date(deadlineIso) < new Date();
}

/**
 * Проверяет, наступает ли дедлайн сегодня (в локальном времени пользователя)
 */
export function isDeadlineToday(deadlineIso?: string): boolean {
  if (!deadlineIso) return false;

  const deadline = new Date(deadlineIso);
  const now = new Date();

  return (
    deadline.getFullYear() === now.getFullYear() &&
    deadline.getMonth() === now.getMonth() &&
    deadline.getDate() === now.getDate()
  );
}

/**
 * Проверяет, наступает ли дедлайн завтра (в локальном времени пользователя)
 */
export function isDeadlineTomorrow(deadlineIso?: string): boolean {
  if (!deadlineIso) return false;

  const deadline = new Date(deadlineIso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    deadline.getFullYear() === tomorrow.getFullYear() &&
    deadline.getMonth() === tomorrow.getMonth() &&
    deadline.getDate() === tomorrow.getDate()
  );
}

// ============================================
// РАБОТА С ДАТАМИ БЕЗ ВРЕМЕНИ (для start_date, event_date)
// ============================================

/**
 * Парсит дату в формате YYYY-MM-DD в локальную дату (без сдвига часового пояса)
 */
export function parseDateOnly(dateString?: string): Date | null {
  if (!dateString) return null;
  // Добавляем T00:00:00 чтобы парсить как локальную дату
  return new Date(dateString + 'T00:00:00');
}

/**
 * Форматирует Date в YYYY-MM-DD для input type="date"
 */
export function formatToDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Форматирует дату YYYY-MM-DD в русский формат ДД.ММ.ГГГГ
 */
export function formatDateOnlyRussian(dateString?: string): string {
  if (!dateString) return '-';
  const date = parseDateOnly(dateString);
  if (!date) return '-';
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
