import React, { useState, useMemo } from 'react';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useCalendarEvents } from '@/lib/supabase/hooks/useCalendar';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { logger } from '@/lib/logger';
import CalendarGrid from '@/components/CalendarGrid/CalendarGrid';
import EventCard from '@/components/EventCard/EventCard';
import { motion, AnimatePresence } from 'framer-motion';
import './CalendarPage.css';

/**
 * Страница календаря
 * Отображает сетку календаря с событиями и список событий выбранного дня
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

  // Логирование для отладки
  React.useEffect(() => {
    logger.debug('CalendarPage state', {
      userId: supabaseUser?.id,
      isGuest,
      selectedMonth: selectedMonth.toISOString(),
      eventsCount: events?.length || 0,
    });
  }, [supabaseUser, isGuest, selectedMonth, events]);

  // Общее состояние загрузки
  const loading = userLoading || guestCheckLoading || eventsLoading;

  // Фильтруем события для выбранной даты
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate || !events) return [];

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return events.filter((event) => event.event_date === selectedDateStr);
  }, [selectedDate, events]);

  // Навигация по месяцам
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  // Выбор даты
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

        {/* Список событий */}
        <div className="calendar-events-section">
          <AnimatePresence mode="wait">
            {selectedDate ? (
              <motion.div
                key={`events-${selectedDate.toISOString()}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="calendar-events-container"
              >
                <div className="calendar-events-header">
                  <h2 className="calendar-events-title">
                    События на {selectedDate.getDate()}{' '}
                    {selectedDate.toLocaleDateString('ru-RU', { month: 'long' })}
                  </h2>
                </div>

                {selectedDateEvents.length > 0 ? (
                  <div className="calendar-events-list">
                    {selectedDateEvents.map((event) => (
                      <EventCard key={event.event_id} event={event} isGuest={isGuest} />
                    ))}
                  </div>
                ) : (
                  <div className="calendar-events-empty">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="32" fill="#F5F5F7" />
                      <path
                        d="M45 20H19C17.8954 20 17 20.8954 17 22V44C17 45.1046 17.8954 46 19 46H45C46.1046 46 47 45.1046 47 44V22C47 20.8954 46.1046 20 45 20Z"
                        stroke="#8E8E93"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M39 17V23"
                        stroke="#8E8E93"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M25 17V23"
                        stroke="#8E8E93"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M17 29H47"
                        stroke="#8E8E93"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p>На эту дату нет событий</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="no-date"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="calendar-events-placeholder"
              >
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#F5F5F7" />
                  <path
                    d="M32 42C37.5228 42 42 37.5228 42 32C42 26.4772 37.5228 22 32 22C26.4772 22 22 26.4772 22 32C22 37.5228 26.4772 42 32 42Z"
                    stroke="#8E8E93"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M32 27V32L35 35"
                    stroke="#8E8E93"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>Выберите дату, чтобы увидеть события</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Сообщение если нет событий вообще */}
        {!loading && events && events.length === 0 && (
          <div className="calendar-no-events">
            <p>На этот месяц нет запланированных событий</p>
          </div>
        )}
      </div>
    </Page>
  );
};

export default CalendarPage;
