import React, { useState, useMemo } from 'react';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useCalendarEvents, CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import CalendarGrid from '@/components/CalendarGrid/CalendarGrid';
import EventCard from '@/components/EventCard/EventCard';
import { motion } from 'framer-motion';
import './CalendarPage.css';

// Группировка событий по дате
interface EventGroup {
  date: string;
  dateFormatted: string;
  events: CalendarEvent[];
}

/**
 * Страница календаря
 * Отображает сетку календаря с событиями и список всех событий месяца
 */
const CalendarPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Получаем данные пользователя
  const initDataSignal = useSignal(initDataState);
  const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);
  const { isGuest, isLoading: guestCheckLoading } = useGuestStatus(supabaseUser?.id);

  // Получаем события календаря на выбранный месяц
  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCalendarEvents(supabaseUser?.id, selectedMonth);

  // Общее состояние загрузки
  const loading = userLoading || guestCheckLoading || eventsLoading;

  // Форматируем дату для отображения (например: "16 октября")
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return `${day} ${monthNames[date.getMonth()]}`;
  };

  // Группируем события по дате и сортируем по дате
  const eventsByDate = useMemo((): EventGroup[] => {
    if (!events || events.length === 0) return [];

    const grouped = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      const existing = grouped.get(event.event_date);
      if (existing) {
        existing.push(event);
      } else {
        grouped.set(event.event_date, [event]);
      }
    });

    // Сортируем по дате (от ближайшей)
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        dateFormatted: formatDateDisplay(date),
        events,
      }));
  }, [events]);

  // Навигация по месяцам
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  // Выбор даты (оставляем для возможного использования в будущем)
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  if (loading) {
    return (
      <Page>
        <div className="calendar-loading">
          <div className="calendar-loading-spinner" />
          <p>Загрузка календаря...</p>
        </div>
      </Page>
    );
  }

  if (eventsError) {
    return (
      <Page>
        <div className="calendar-error">
          <p>Ошибка загрузки календаря</p>
          <p className="calendar-error-message">{eventsError.message}</p>
        </div>
      </Page>
    );
  }

  return (
    <Page back={false}>
      <div className="calendar-page">
        {/* Заголовок */}
        <div className="calendar-page-header">
          <h1 className="calendar-page-title">Календарь</h1>
          {isGuest && (
            <p className="calendar-page-guest-notice">
              Станьте учеником, чтобы получить полный доступ к событиям
            </p>
          )}
        </div>

        {/* Сетка календаря */}
        <CalendarGrid
          currentDate={selectedMonth}
          selectedDate={selectedDate}
          events={events || []}
          onDateClick={handleDateClick}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        {/* Список всех событий месяца */}
        <div className="calendar-events-section">
          {eventsByDate.length > 0 ? (
            <motion.div
              key={`events-${selectedMonth.toISOString()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="calendar-events-container"
            >
              {eventsByDate.map((group) => (
                <div key={group.date} className="calendar-event-group">
                  <h3 className="calendar-event-group-title">{group.dateFormatted}</h3>
                  <div className="calendar-events-list">
                    {group.events.map((event) => (
                      <EventCard key={event.event_id} event={event} isGuest={isGuest} />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            !loading && (
              <div className="calendar-no-events">
                <p>На этот месяц нет запланированных событий</p>
              </div>
            )
          )}
        </div>
      </div>
    </Page>
  );
};

export default CalendarPage;
