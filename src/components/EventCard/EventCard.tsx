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
    if (isGuest && !event.can_access) {
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

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="event-card"
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

        {/* Время справа */}
        {event.event_time && (
          <div className="event-card-time">
            {formatTime(event.event_time)}
          </div>
        )}
      </motion.div>

      {/* Модалка для гостей */}
      <GuestBlockedModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        ctaUrl="https://brainprogramming.ru/enroll"
      />
    </>
  );
};

export default EventCard;
