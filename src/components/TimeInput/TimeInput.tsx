import React, { useState, useEffect } from 'react';
import './TimeInput.css';

interface TimeInputProps {
  totalSeconds: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}

// Вспомогательная функция для конвертации секунд в часы, минуты, секунды
const secondsToTime = (totalSeconds: number): { hours: number; minutes: number; seconds: number } => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = totalSeconds - hours * 3600 - minutes * 60;
  return { hours, minutes, seconds };
};

// Вспомогательная функция для конвертации часов, минут, секунд в общее количество секунд
const timeToSeconds = (hours: number, minutes: number, seconds: number): number => {
  return hours * 3600 + minutes * 60 + seconds;
};

// Вспомогательная функция для форматирования времени в строку
export const formatTimeFromSeconds = (totalSeconds: number): string => {
  const { hours, minutes, seconds } = secondsToTime(totalSeconds);
  if (hours > 0) {
    return `${hours} ч ${minutes} мин ${seconds} сек`;
  } else if (minutes > 0) {
    return `${minutes} мин ${seconds} сек`;
  } else {
    return `${seconds} сек`;
  }
};

const TimeInput: React.FC<TimeInputProps> = ({ totalSeconds, onChange, disabled = false }) => {
  // Конвертируем начальное значение в часы, минуты, секунды
  const [time, setTime] = useState(secondsToTime(totalSeconds));

  // Обновляем состояние при изменении входных секунд
  useEffect(() => {
    setTime(secondsToTime(totalSeconds));
  }, [totalSeconds]);

  // Обработчики изменения часов, минут, секунд
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = parseInt(e.target.value) || 0;
    const newTime = { ...time, hours };
    setTime(newTime);
    onChange(timeToSeconds(newTime.hours, newTime.minutes, newTime.seconds));
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value) || 0;
    // Нормализуем минуты (0-59)
    const normalizedMinutes = Math.min(59, Math.max(0, minutes));
    const newTime = { ...time, minutes: normalizedMinutes };
    setTime(newTime);
    onChange(timeToSeconds(newTime.hours, newTime.minutes, newTime.seconds));
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = parseInt(e.target.value) || 0;
    // Нормализуем секунды (0-59)
    const normalizedSeconds = Math.min(59, Math.max(0, seconds));
    const newTime = { ...time, seconds: normalizedSeconds };
    setTime(newTime);
    onChange(timeToSeconds(newTime.hours, newTime.minutes, newTime.seconds));
  };

  return (
    <div className="time-input-container">
      <div className="time-input-field">
        <input
          type="number"
          min="0"
          value={time.hours}
          onChange={handleHoursChange}
          disabled={disabled}
          aria-label="Часы"
        />
        <label>ч</label>
      </div>
      <div className="time-input-field">
        <input
          type="number"
          min="0"
          max="59"
          value={time.minutes}
          onChange={handleMinutesChange}
          disabled={disabled}
          aria-label="Минуты"
        />
        <label>мин</label>
      </div>
      <div className="time-input-field">
        <input
          type="number"
          min="0"
          max="59"
          value={time.seconds}
          onChange={handleSecondsChange}
          disabled={disabled}
          aria-label="Секунды"
        />
        <label>сек</label>
      </div>
      <div className="time-input-total">
        Всего: {formatTimeFromSeconds(totalSeconds)}
      </div>
    </div>
  );
};

export default TimeInput; 