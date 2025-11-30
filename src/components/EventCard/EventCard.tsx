import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import EventCardImage from '@/shared/assets/images/eventCard.png';
import './EventCard.css';

interface EventCardProps {
  event: CalendarEvent;
  isGuest?: boolean;
}

/**
 * Карточка события календаря
 */
const EventCard: React.FC<EventCardProps> = ({ event, isGuest = false }) => {
  const navigate = useNavigate();
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Форматирование времени
  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
  };

  // Определение типа события для бейджа - берём из event_type
  const getEventTypeLabel = () => {
    switch (event.event_type) {
      case 'zoom':
        return 'Zoom вебинар';
      case 'offline':
        return 'Оффлайн встреча';
      case 'lesson_unlock':
        return 'Открытие урока';
      case 'material_unlock':
        return 'Открытие материала';
      case 'technique_unlock':
        return 'Открытие техники';
      default:
        return 'Событие';
    }
  };

  // Обработчик действия
  const handleAction = () => {
    // Для гостей ВСЕГДА показываем модалку
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    if (!event.can_access) {
      return;
    }

    switch (event.event_type) {
      case 'zoom':
      case 'offline':
        // Переход на страницу события
        navigate(`/calendar/event/${event.event_id}`, { state: { event } });
        break;
      case 'lesson_unlock':
        if (event.lesson_id) {
          navigate(`/library/lesson/${event.lesson_id}`);
        }
        break;
      case 'material_unlock':
        if (event.material_id) {
          navigate(`/library/material/${event.material_id}`);
        }
        break;
      case 'technique_unlock':
        if (event.technique_id) {
          navigate(`/techniques/${event.technique_id}`);
        }
        break;
    }
  };

  // Для гостей показываем заблюренную карточку
  const isBlurred = isGuest;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`event-card ${isBlurred ? 'event-card-blurred' : ''}`}
        onClick={handleAction}
      >
        {/* Обложка слева */}
        <div className="event-card-cover">
          <img src={event.cover_image || EventCardImage} alt={event.title} />
        </div>

        {/* Контент */}
        <div className="event-card-content">
          {/* Тег типа события */}
          <div className="event-card-tag">
            {getEventTypeLabel()}
          </div>

          {/* Название */}
          <h3 className="event-card-title">{event.title}</h3>
        </div>

        {/* Время справа или замочек для гостей */}
        {isBlurred ? (
          <div className="event-card-lock">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
                stroke="#666"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
                stroke="#666"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          event.event_time && (
            <div className="event-card-time">
              {formatTime(event.event_time)}
            </div>
          )
        )}

        {/* Оверлей блюра для гостей */}
        {isBlurred && <div className="event-card-blur-overlay" />}
      </motion.div>

      {/* Модалка для гостей */}
      <GuestBlockedModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        title="Доступно только ученикам"
        description="Станьте учеником, чтобы получить полный доступ к календарю событий"
        ctaText="Стать учеником"
        ctaUrl="https://brainprogramming.ru/enroll"
      />
    </>
  );
};

export default EventCard;
