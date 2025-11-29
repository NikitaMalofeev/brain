import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Page } from '@/components/Page';
import { CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import EventCardImage from '@/shared/assets/images/eventCard.png';
import './EventPage.css';

/**
 * Страница события календаря
 * Отображает детальную информацию о событии
 */
const EventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Получаем данные события из state навигации
  const event = location.state?.event as CalendarEvent | undefined;

  // Форматирование даты
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return `${day} ${monthNames[date.getMonth()]}`;
  };

  // Форматирование времени
  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
  };

  // Обработчик кнопки "Перейти"
  const handleGoClick = () => {
    if (event?.external_url) {
      window.open(event.external_url, '_blank');
    }
  };

  if (!event) {
    return (
      <Page back>
        <div className="event-page-error">
          <p>Событие не найдено</p>
        </div>
      </Page>
    );
  }

  return (
    <Page back>
      <div className="event-page">
        {/* Обложка события */}
        <div className="event-page-cover">
          <img
            src={event.cover_image || EventCardImage}
            alt={event.title}
          />
        </div>

        {/* Контент */}
        <div className="event-page-content">
          {/* Дата */}
          <div className="event-page-date">
            {formatDate(event.event_date)}
          </div>

          {/* Время */}
          {event.event_time && (
            <div className="event-page-time">
              {formatTime(event.event_time)}
            </div>
          )}

          {/* Заголовок */}
          <h1 className="event-page-title">{event.title}</h1>

          {/* Описание */}
          {event.description && (
            <p className="event-page-description">{event.description}</p>
          )}
        </div>

        {/* Кнопка "Перейти" */}
        {event.external_url && (
          <div className="event-page-footer">
            <button
              className="event-page-button"
              onClick={handleGoClick}
            >
              Перейти
            </button>
          </div>
        )}
      </div>
    </Page>
  );
};

export default EventPage;
