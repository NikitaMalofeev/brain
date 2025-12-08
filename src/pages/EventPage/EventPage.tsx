import React, { useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import EventCardImage from '@/shared/assets/images/eventCard.png';
import { useWebView } from '@/hooks/useWebView';
import './EventPage.css';

/**
 * Страница события календаря
 * Отображает детальную информацию о событии
 */
const EventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { openWebView } = useWebView();

  // Получаем данные события из state навигации
  const event = location.state?.event as CalendarEvent | undefined;

  // Проверяем, прошло ли время события
  const isEventTimeReached = useMemo(() => {
    if (!event) return false;

    const now = new Date();
    // Формируем дату события
    let eventDateTime: Date;

    if (event.event_time) {
      // Если есть время - используем дату + время
      eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    } else {
      // Если нет времени - начало дня (00:00)
      eventDateTime = new Date(`${event.event_date}T00:00:00`);
    }

    return now >= eventDateTime;
  }, [event]);

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
    if (!event) return;

    // Для внешних ссылок (zoom, offline)
    if (event.external_url) {
      openWebView(event.external_url);
      return;
    }

    // Для открытия урока - переход на страницу урока
    if (event.event_type === 'lesson_unlock' && event.lesson_id && isEventTimeReached) {
      navigate(`/lessons/${event.lesson_id}`);
      return;
    }
  };

  // Определяем, можно ли показать кнопку перехода
  const canShowButton = useMemo(() => {
    if (!event) return false;

    // Внешние ссылки - всегда показываем (для zoom можно заранее показать)
    if (event.external_url) return true;

    // Для lesson_unlock показываем кнопку, если есть lesson_id
    if (event.event_type === 'lesson_unlock' && event.lesson_id) return true;

    return false;
  }, [event]);

  // Текст кнопки
  const buttonText = useMemo(() => {
    if (!event) return 'Перейти';

    if (event.event_type === 'lesson_unlock') {
      return 'Перейти к уроку';
    }

    return 'Перейти';
  }, [event]);

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
        <div className="event-page-cover page-bg-container">
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
        {canShowButton && (
          <div className="event-page-footer">
            <button
              className="event-page-button"
              onClick={handleGoClick}
            >
              {buttonText}
            </button>
          </div>
        )}
      </div>
    </Page>
  );
};

export default EventPage;
