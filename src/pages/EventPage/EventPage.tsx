import React, { useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import EventCardImage from '@/shared/assets/images/eventCard.png';
import { useWebView } from '@/hooks/useWebView';
import { convertMskToLocal, isMskTimeReached } from '@/lib/utils/timezone';
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

  // Проверяем, прошло ли время события (с учётом МСК)
  const isEventTimeReached = useMemo(() => {
    if (!event) return false;
    return isMskTimeReached(event.event_date, event.event_time);
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
        {/* Обложка события - fullscreen до верха */}
        <div
          className="event-page-cover"
          style={{
            position: 'relative',
            height: 'calc(193px + env(safe-area-inset-top, 0px))',
            backgroundImage: `url(${event.cover_image || EventCardImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '0 0 32px 32px',
          }}
        />

        {/* Контент */}
        <div className="event-page-content">
          {/* Дата */}
          <div className="event-page-date">
            {formatDate(event.event_date)}
          </div>

          {/* Время */}
          {event.event_time && (
            <div className="event-page-time">
              {convertMskToLocal(event.event_time, event.event_date)}
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
