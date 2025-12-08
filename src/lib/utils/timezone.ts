/**
 * Утилиты для работы с часовыми поясами
 * Все времена в базе хранятся как МСК (UTC+3)
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Подключаем плагины для работы с таймзонами
dayjs.extend(utc);
dayjs.extend(timezone);

// Московский часовой пояс
const MSK_TIMEZONE = 'Europe/Moscow';

/**
 * Конвертирует время из МСК в локальное время пользователя
 * @param timeStr - строка времени в формате "HH:MM" или "HH:MM:SS" (МСК)
 * @param dateStr - строка даты в формате "YYYY-MM-DD" (опционально, по умолчанию сегодня)
 * @returns строка времени в формате "HH:MM" в локальном времени пользователя
 */
export function convertMskToLocal(timeStr: string | null | undefined, dateStr?: string): string {
  if (!timeStr) return '';

  try {
    // Берём дату или используем сегодняшнюю
    const date = dateStr || dayjs().format('YYYY-MM-DD');

    // Нормализуем время до HH:MM
    const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;

    // Создаём дату в МСК таймзоне
    const mskDateTime = dayjs.tz(`${date} ${normalizedTime}`, MSK_TIMEZONE);

    // Конвертируем в локальное время пользователя
    const localDateTime = mskDateTime.local();

    return localDateTime.format('HH:mm');
  } catch (e) {
    console.error('Error converting MSK to local time:', e);
    return timeStr.substring(0, 5); // Fallback: вернуть как есть
  }
}

/**
 * Конвертирует дату-время из МСК в локальный Date объект
 * @param dateStr - строка даты в формате "YYYY-MM-DD"
 * @param timeStr - строка времени в формате "HH:MM" или "HH:MM:SS" (МСК)
 * @returns Date объект в локальном времени
 */
export function convertMskDateTimeToLocal(dateStr: string, timeStr: string | null | undefined): Date {
  const time = timeStr || '00:00';
  const normalizedTime = time.length === 5 ? `${time}:00` : time;

  // Создаём дату в МСК таймзоне
  const mskDateTime = dayjs.tz(`${dateStr} ${normalizedTime}`, MSK_TIMEZONE);

  // Возвращаем как Date объект (автоматически в локальном времени)
  return mskDateTime.toDate();
}

/**
 * Форматирует дату и время из МСК в локальное отображение
 * @param dateStr - строка даты в формате "YYYY-MM-DD"
 * @param timeStr - строка времени в формате "HH:MM" (МСК)
 * @returns объект с отформатированными датой и временем
 */
export function formatMskDateTimeToLocal(dateStr: string, timeStr: string | null | undefined): {
  date: string;
  time: string;
  fullDateTime: string;
} {
  const localDate = convertMskDateTimeToLocal(dateStr, timeStr);
  const localDayjs = dayjs(localDate);

  const dateFormatted = localDayjs.format('D MMMM');
  const timeFormatted = timeStr ? localDayjs.format('HH:mm') : '';

  const fullDateTime = timeStr
    ? `${dateFormatted}, ${timeFormatted}`
    : dateFormatted;

  return {
    date: dateFormatted,
    time: timeFormatted,
    fullDateTime
  };
}

/**
 * Проверяет, наступило ли указанное время по МСК
 * @param dateStr - строка даты в формате "YYYY-MM-DD"
 * @param timeStr - строка времени в формате "HH:MM" (МСК)
 * @returns true если текущее время >= указанного времени по МСК
 */
export function isMskTimeReached(dateStr: string, timeStr: string | null | undefined): boolean {
  const time = timeStr || '00:00';
  const normalizedTime = time.length === 5 ? `${time}:00` : time;

  // Создаём дату в МСК таймзоне
  const mskDateTime = dayjs.tz(`${dateStr} ${normalizedTime}`, MSK_TIMEZONE);

  // Сравниваем с текущим временем
  return dayjs().isAfter(mskDateTime) || dayjs().isSame(mskDateTime);
}
