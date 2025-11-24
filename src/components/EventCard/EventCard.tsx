import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarEvent } from '@/lib/supabase/hooks/useCalendar';
import { clsx } from 'clsx';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import './EventCard.css';

interface EventCardProps {
  event: CalendarEvent;
  isGuest?: boolean;
}

/**
 * Карточка события календаря
 * Отображает информацию о событии и кнопку действия
 */
const EventCard: React.FC<EventCardProps> = ({ event, isGuest = false }) => {
  const navigate = useNavigate();
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Форматирование даты
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Форматирование времени
  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
  };

  // Определение типа события для бейджа
  const getEventTypeBadge = () => {
    switch (event.event_type) {
      case 'zoom':
        return { label: 'Онлайн', color: '#4CAF50' };
      case 'offline':
        return { label: 'Оффлайн', color: '#FF9800' };
      case 'lesson_unlock':
        return { label: 'Урок', color: '#2196F3' };
      case 'material_unlock':
        return { label: 'Материал', color: '#9C27B0' };
      case 'technique_unlock':
        return { label: 'Техника', color: '#E91E63' };
      default:
        return { label: 'Событие', color: '#757575' };
    }
  };

  const eventTypeBadge = getEventTypeBadge();

  // Обработчик действия
  const handleAction = () => {
    // Для гостей показываем модалку
    if (isGuest && !event.can_access) {
      setShowGuestModal(true);
      return;
    }

    // Если нет доступа (не гость, но недоступно по тарифу) - не делаем ничего,
    // кнопка повышения тарифа отображается отдельно
    if (!event.can_access) {
      return;
    }

    // Навигация в зависимости от типа события
    switch (event.event_type) {
      case 'zoom':
      case 'offline':
        if (event.external_url) {
          window.open(event.external_url, '_blank');
        }
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="event-card"
    >
      {/* Обложка события */}
      {event.cover_image && (
        <div className="event-card-cover">
          <img src={event.cover_image} alt={event.title} />
        </div>
      )}

      <div className="event-card-content">
        {/* Бейджи */}
        <div className="event-card-badges">
          {/* Модуль */}
          {event.module_name && (
            <div
              className="event-card-badge"
              style={{ backgroundColor: event.module_color || '#757575' }}
            >
              {event.module_name}
            </div>
          )}

          {/* Тип события */}
          <div
            className="event-card-badge"
            style={{ backgroundColor: eventTypeBadge.color }}
          >
            {eventTypeBadge.label}
          </div>
        </div>

        {/* Заголовок */}
        <h3 className="event-card-title">{event.title}</h3>

        {/* Описание */}
        {event.description && (
          <p className="event-card-description">{event.description}</p>
        )}

        {/* Дата и время */}
        <div className="event-card-datetime">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12.6667 2.66667H3.33333C2.59695 2.66667 2 3.26362 2 4V13.3333C2 14.0697 2.59695 14.6667 3.33333 14.6667H12.6667C13.403 14.6667 14 14.0697 14 13.3333V4C14 3.26362 13.403 2.66667 12.6667 2.66667Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.6667 1.33334V4.00001"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5.33333 1.33334V4.00001"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 6.66667H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            {formatDate(event.event_date)}
            {event.event_time && `, ${formatTime(event.event_time)}`}
          </span>
        </div>

        {/* Кнопка действия */}
        {event.can_access ? (
          <button
            className="event-card-action"
            onClick={handleAction}
          >
            {event.event_type === 'zoom' || event.event_type === 'offline' ? 'Перейти' : 'Открыть'}
          </button>
        ) : isGuest ? (
          <button
            className="event-card-action event-card-action-disabled"
            onClick={handleAction}
          >
            Недоступно гостям
          </button>
        ) : (
          <div className="event-card-tariff-block">
            <div className="event-card-tariff-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="11" r="0.5" fill="currentColor"/>
              </svg>
              <span>Недоступно на вашем тарифе</span>
            </div>
            <a
              href="https://t.me/brainprogramming_sales"
              target="_blank"
              rel="noopener noreferrer"
              className="event-card-upgrade-btn"
            >
              Повысить тариф
            </a>
          </div>
        )}
      </div>

      {/* Модалка для гостей */}
      <GuestBlockedModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        ctaUrl="https://brainprogramming.ru/enroll"
      />
    </motion.div>
  );
};

export default EventCard;
