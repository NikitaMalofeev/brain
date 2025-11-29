import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import './CalendarGrid.css';

interface ModulePeriod {
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
  const [showLegend, setShowLegend] = useState(false);

  // Форматируем дату в YYYY-MM-DD без учёта часового пояса
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Получаем уникальные модули для легенды
  const moduleColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    events.forEach((event) => {
      if (event.module_color && event.module_name) {
        colorMap.set(event.module_color, event.module_name);
      }
    });
    return Array.from(colorMap.entries()).map(([color, name]) => ({ color, name }));
  }, [events]);

  // Вычисляем периоды модулей из событий
  const modulePeriods = useMemo((): ModulePeriod[] => {
    const periodMap = new Map<string, ModulePeriod>();

    events.forEach((event) => {
      if (!event.module_id || !event.module_color) return;

      const existing = periodMap.get(event.module_id);
      if (existing) {
        // Обновляем min/max даты
        if (event.event_date < existing.startDate) {
          existing.startDate = event.event_date;
        }
        if (event.event_date > existing.endDate) {
          existing.endDate = event.event_date;
        }
      } else {
        periodMap.set(event.module_id, {
          moduleId: event.module_id,
          moduleName: event.module_name || '',
          color: event.module_color,
          startDate: event.event_date,
          endDate: event.event_date,
        });
      }
    });

    return Array.from(periodMap.values());
  }, [events]);

  // Получить цвет обводки для даты (от модуля в периоде которого она находится)
  const getModuleBorderColor = (date: Date): string | null => {
    const dateStr = formatDateLocal(date);

    for (const period of modulePeriods) {
      if (dateStr >= period.startDate && dateStr <= period.endDate) {
        return period.color;
      }
    }
    return null;
  };

  // Определить позицию даты в периоде модуля (для скругления углов)
  const getDatePositionInPeriod = (date: Date): { isStart: boolean; isEnd: boolean; isInPeriod: boolean } => {
    const dateStr = formatDateLocal(date);

    for (const period of modulePeriods) {
      if (dateStr >= period.startDate && dateStr <= period.endDate) {
        return {
          isStart: dateStr === period.startDate,
          isEnd: dateStr === period.endDate,
          isInPeriod: true,
        };
      }
    }
    return { isStart: false, isEnd: false, isInPeriod: false };
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
      {/* Легенда цветов модулей */}
      {showLegend && moduleColors.length > 0 && (
        <div className="calendar-legend-popup">
          <div className="calendar-legend-header">
            <h3>Цвета модулей</h3>
            <button onClick={() => setShowLegend(false)} className="calendar-legend-close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="calendar-legend-list">
            {moduleColors.map(({ color, name }) => (
              <div key={color} className="calendar-legend-item">
                <div className="calendar-legend-color" style={{ backgroundColor: color }} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

        {/* Кнопка легенды */}
        {moduleColors.length > 0 && (
          <button
            className="calendar-legend-btn"
            onClick={() => setShowLegend(!showLegend)}
            aria-label="Показать легенду цветов"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="6" r="1" fill="currentColor" />
            </svg>
          </button>
        )}

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

          const hasEvents = hasEventsOnDate(date);
          const moduleBorderColor = getModuleBorderColor(date);
          const position = getDatePositionInPeriod(date);
          const todayDate = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={clsx('calendar-day', {
                'calendar-day-today': todayDate,
                'calendar-day-selected': isSelected(date),
                'calendar-day-has-events': hasEvents,
                'calendar-day-in-period': position.isInPeriod,
                'calendar-day-period-start': position.isStart,
                'calendar-day-period-end': position.isEnd,
              })}
              onClick={() => onDateClick(date)}
              style={moduleBorderColor ? {
                '--module-border-color': moduleBorderColor,
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
