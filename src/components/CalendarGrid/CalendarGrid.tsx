import React from 'react';
import { clsx } from 'clsx';
import './CalendarGrid.css';

export interface ModulePeriod {
  moduleId: string;
  moduleName: string;
  color: string;
  startDate: string;
  endDate: string;
}

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  events: Array<{ event_date: string; module_color: string | null; module_name?: string | null; module_id?: string | null }>;
  modulePeriods?: ModulePeriod[];
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
  modulePeriods = [],
  onDateClick,
  onPrevMonth,
  onNextMonth,
}) => {
  // Форматируем дату в YYYY-MM-DD без учёта часового пояса
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Проверяем, находится ли дата в каком-либо периоде модуля
  const isDateInPeriod = (dateStr: string): { inPeriod: boolean; color: string | null; moduleId: string | null } => {
    for (const period of modulePeriods) {
      if (dateStr >= period.startDate && dateStr <= period.endDate) {
        return { inPeriod: true, color: period.color, moduleId: period.moduleId };
      }
    }
    return { inPeriod: false, color: null, moduleId: null };
  };

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

  // Вычисляем границы для каждой ячейки - обводка только в пределах одной строки
  const getBorderClasses = (date: Date, index: number): string[] => {
    const dateStr = formatDateLocal(date);
    const { inPeriod, color, moduleId } = isDateInPeriod(dateStr);

    if (!inPeriod || !color) return [];

    const classes: string[] = [];

    // Индекс в сетке
    const col = index % 7; // 0 = Пн, 6 = Вс

    // Проверяем соседей слева и справа (только в пределах строки)
    const prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const prevDayInfo = isDateInPeriod(formatDateLocal(prevDay));
    const nextDayInfo = isDateInPeriod(formatDateLocal(nextDay));

    // Проверяем, что сосед в ТОМ ЖЕ модуле
    const prevDayInSameModule = prevDayInfo.inPeriod && prevDayInfo.moduleId === moduleId;
    const nextDayInSameModule = nextDayInfo.inPeriod && nextDayInfo.moduleId === moduleId;

    // Проверяем, что предыдущий/следующий день в том же месяце
    const prevDayInMonth = prevDay.getMonth() === month;
    const nextDayInMonth = nextDay.getMonth() === month;

    // Верхняя и нижняя границы ВСЕГДА есть (обводка только в пределах строки)
    classes.push('calendar-day-border-top');
    classes.push('calendar-day-border-bottom');

    // Левая граница: если это понедельник ИЛИ слева нет дня в том же модуле
    const needLeftBorder = col === 0 || !prevDayInSameModule || !prevDayInMonth;
    // Правая граница: если это воскресенье ИЛИ справа нет дня в том же модуле
    const needRightBorder = col === 6 || !nextDayInSameModule || !nextDayInMonth;

    if (needLeftBorder) classes.push('calendar-day-border-left');
    if (needRightBorder) classes.push('calendar-day-border-right');

    // Скругления углов
    if (needLeftBorder) classes.push('calendar-day-corner-tl');
    if (needRightBorder) classes.push('calendar-day-corner-tr');
    if (needLeftBorder) classes.push('calendar-day-corner-bl');
    if (needRightBorder) classes.push('calendar-day-corner-br');

    return classes;
  };

  // Получить цвет модуля для даты
  const getModuleColor = (date: Date): string | null => {
    const dateStr = formatDateLocal(date);
    return isDateInPeriod(dateStr).color;
  };

  // Проверяем есть ли события на эту дату
  const hasEventsOnDate = (date: Date): boolean => {
    const dateStr = formatDateLocal(date);
    return events.some((event) => event.event_date === dateStr);
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
          <svg width="7" height="14" viewBox="0 0 7 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6 1L1 7L6 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h2 className="calendar-title">
          {monthNames[month]} {year}
        </h2>

        <button className="calendar-nav-btn" onClick={onNextMonth} aria-label="Следующий месяц">
          <svg width="7" height="14" viewBox="0 0 7 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M1 1L6 7L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
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

          const hasEvents = hasEventsOnDate(date);
          const moduleColor = getModuleColor(date);
          const borderClasses = getBorderClasses(date, index);
          const todayDate = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={clsx(
                'calendar-day',
                {
                  'calendar-day-today': todayDate,
                  'calendar-day-selected': isSelected(date),
                  'calendar-day-has-events': hasEvents,
                },
                ...borderClasses
              )}
              onClick={() => onDateClick(date)}
              style={moduleColor ? {
                '--module-border-color': moduleColor,
              } as React.CSSProperties : undefined}
            >
              {/* Белая обводка для сегодняшнего дня */}
              {todayDate && (
                <div className="calendar-day-today-ring" />
              )}

              <span className="calendar-day-number">{date.getDate()}</span>

              {/* Индикатор события - чёрный кружок */}
              {hasEvents && (
                <div className="calendar-day-indicator" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
