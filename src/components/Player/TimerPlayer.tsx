import React, { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import './Player.css';

interface TimerPlayerProps {
  duration: number;
  title: string;
  meditationObject?: string; // Объект для концентрации (мысль, дыхание, тело, без объекта)
  instructions?: string;
}

const TimerPlayer: React.FC<TimerPlayerProps> = ({ 
  duration, 
  title, 
  meditationObject = 'Дыхание',
  instructions = 'Закройте глаза и сфокусируйтесь на своем дыхании'
}) => {
  const { state, pause, seekTo, togglePlay } = usePlayer();
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number | null>(null);

  // Инициализация таймера
  useEffect(() => {
    setTimeLeft(duration);
    seekTo(0);
  }, [duration, seekTo]);

  // Обработка плей/пауза
  useEffect(() => {
    if (state.playing) {
      // Если таймер запускается заново
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      } else if (timerRef.current === null) {
        // Если таймер был на паузе, обновляем стартовое время
        const elapsedSeconds = duration - timeLeft;
        startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
      }
      
      // Запускаем таймер
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const startTime = startTimeRef.current || now;
        const elapsedMilliseconds = now - startTime;
        const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
        const newTimeLeft = Math.max(0, duration - elapsedSeconds);
        
        setTimeLeft(newTimeLeft);
        seekTo(duration - newTimeLeft);
        
        // Если таймер закончился
        if (newTimeLeft <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          startTimeRef.current = null;
          pause();
        }
      }, 100);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.playing, duration, pause, seekTo, timeLeft]);

  // Отрисовка кругового таймера
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Размеры и центр холста
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Очистка холста
    ctx.clearRect(0, 0, width, height);

    // Рисуем фоновый круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Рисуем прогресс
    if (duration > 0) {
      const progress = (duration - timeLeft) / duration;
      const startAngle = -0.5 * Math.PI; // Начинаем с верхней точки
      const endAngle = startAngle + (2 * Math.PI * progress);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(77, 171, 247, 0.8)';
      ctx.lineWidth = 10;
      ctx.stroke();
    }

    // Рисуем текст с оставшимся временем
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(timeLeft), centerX, centerY);
  }, [timeLeft, duration]);

  return (
    <div className="timer-player-container">
      <div className="timer-player-header">
        <h2>{title}</h2>
        <p className="meditation-object">Объект концентрации: {meditationObject}</p>
        <p className="meditation-instructions">{instructions}</p>
      </div>
      
      <div className="timer-player-wrapper" style={{ backgroundImage: state.backgroundImage ? `url(${state.backgroundImage})` : 'none' }}>
        <div className="timer-display">
          <canvas ref={canvasRef} width={300} height={300} className="timer-canvas"></canvas>
          
          <div className="timer-controls">
            <button className="play-pause-btn" onClick={togglePlay}>
              {state.playing ? 'Пауза' : 'Старт'}
            </button>
            <button className="stop-btn" onClick={() => {
              pause();
              setTimeLeft(duration);
              seekTo(0);
              startTimeRef.current = null;
            }}>
              Сбросить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Вспомогательная функция для форматирования времени (MM:SS)
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default TimerPlayer; 