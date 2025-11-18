import React from 'react';
import { clsx } from 'clsx';
import './CalendarGrid.css';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  events: Array<{ event_date: string; module_color: string | null }>;
  onDateClick: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/**
 * Компонент сетки календаря
 * Отображает дни текущего месяца с подсветкой дней с событиями
 */
const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedDate,
  events,
  onDateClick,
  onPrevMonth,
  onNextMonth,
}) => {
  // Получаем информацию о месяце
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Первый день месяца
  const firstDay = new Date(year, month, 1);
  // Последний день месяца
  const lastDay = new Date(year, month + 1, 0);

  // День недели первого дня (0 = воскресенье, нужно преобразовать к понедельнику)
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Понедельник = 0

  // Количество дней в месяце
  const daysInMonth = lastDay.getDate();

  // Создаем массив дней для отображения
  const days: (Date | null)[] = [];

  // Пустые ячейки до первого дня
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  // Проверяем есть ли события на эту дату
  const hasEventsOnDate = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return events.some((event) => event.event_date === dateStr);
  };

  // Получаем цвета модулей для даты
  const getModuleColorsForDate = (date: Date): string[] => {
    const dateStr = date.toISOString().split('T')[0];
    const colors = events
      .filter((event) => event.event_date === dateStr && event.module_color)
      .map((event) => event.module_color as string);
    return [...new Set(colors)]; // Уникальные цвета
  };

  // Проверяем является ли дата сегодняшней
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Проверяем выбрана ли дата
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Название месяца
  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  return (
    <div className="calendar-grid-container">
      {/* Заголовок с месяцем и кнопками навигации */}
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={onPrevMonth} aria-label="Предыдущий месяц">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h2 className="calendar-title">
          {monthNames[month]} {year}
        </h2>

        <button className="calendar-nav-btn" onClick={onNextMonth} aria-label="Следующий месяц">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Сетка календаря */}
      <div className="calendar-grid">
        {/* Названия дней недели */}
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName) => (
          <div key={dayName} className="calendar-day-name">
            {dayName}
          </div>
        ))}

        {/* Дни месяца */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-day-empty" />;
          }

          const moduleColors = getModuleColorsForDate(date);
          const hasEvents = hasEventsOnDate(date);

          return (
            <div
              key={date.toISOString()}
              className={clsx('calendar-day', {
                'calendar-day-today': isToday(date),
                'calendar-day-selected': isSelected(date),
                'calendar-day-has-events': hasEvents,
              })}
              onClick={() => onDateClick(date)}
            >
              <span className="calendar-day-number">{date.getDate()}</span>

              {/* Индикаторы модулей (цветные точки) */}
              {moduleColors.length > 0 && (
                <div className="calendar-day-indicators">
                  {moduleColors.slice(0, 3).map((color, idx) => (
                    <div
                      key={idx}
                      className="calendar-day-indicator"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
