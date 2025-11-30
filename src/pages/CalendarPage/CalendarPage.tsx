import React, { useState, useMemo } from 'react';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useCalendarEvents, CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import { useUserStreamModules } from '@/lib/supabase/hooks/useUserStreamModules';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import CalendarGrid, { ModulePeriod } from '@/components/CalendarGrid/CalendarGrid';
import EventCard from '@/components/EventCard/EventCard';
import Background1 from '@/shared/assets/images/background1.png';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
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
    isPlaceholderData,
  } = useCalendarEvents(supabaseUser?.id, selectedMonth);

  // Получаем модули пользователя
  const { modules } = useUserStreamModules(supabaseUser?.id);

  // Получаем дату начала потока пользователя
  const { data: streamStartDate } = useQuery({
    queryKey: ['user-stream-start-date', supabaseUser?.id],
    queryFn: async () => {
      if (!supabaseUser?.id || !supabase) return null;

      const { data } = await supabase
        .from('user_stream_enrollments')
        .select('streams(start_date)')
        .eq('user_id', supabaseUser.id)
        .single();

      return (data?.streams as any)?.start_date || null;
    },
    enabled: !!supabaseUser?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Вычисляем периоды модулей
  const modulePeriods = useMemo((): ModulePeriod[] => {
    if (!modules || modules.length === 0 || !streamStartDate) return [];

    const startDate = new Date(streamStartDate);
    const sortedModules = [...modules].sort((a, b) => a.module_order_num - b.module_order_num);

    return sortedModules.map((module, index) => {
      // Дата начала модуля = start_date потока + unlock_day - 1
      const moduleStart = new Date(startDate);
      moduleStart.setDate(moduleStart.getDate() + (module.unlock_day || 0));

      // Дата окончания = начало следующего модуля - 1 день, или +6 дней если последний
      let moduleEnd: Date;
      if (index < sortedModules.length - 1) {
        const nextModule = sortedModules[index + 1];
        moduleEnd = new Date(startDate);
        moduleEnd.setDate(moduleEnd.getDate() + (nextModule.unlock_day || 0) - 1);
      } else {
        // Последний модуль - добавляем 6 дней (неделя)
        moduleEnd = new Date(moduleStart);
        moduleEnd.setDate(moduleEnd.getDate() + 6);
      }

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      return {
        moduleId: module.module_id,
        moduleName: module.module_name,
        color: module.module_color || '#007AFF',
        startDate: formatDate(moduleStart),
        endDate: formatDate(moduleEnd),
      };
    });
  }, [modules, streamStartDate]);

  // Начальная загрузка (только когда данных ещё нет совсем)
  const initialLoading = userLoading || guestCheckLoading || (eventsLoading && !events);

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

  if (initialLoading) {
    return (
      <Page>
        <LoadingSpinner />
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
      <div
        className="calendar-page"
        style={{
          backgroundImage: `url(${Background1})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
        }}
      >
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
          modulePeriods={modulePeriods}
          onDateClick={handleDateClick}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        {/* Список всех событий месяца */}
        <div className="calendar-events-section">
          {eventsByDate.length > 0 ? (
            <div className="calendar-events-container">
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
            </div>
          ) : (
            !eventsLoading && (
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
