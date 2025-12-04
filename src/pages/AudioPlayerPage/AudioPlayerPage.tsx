import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Page } from '@/components/Page';
import { motion } from 'framer-motion';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import './AudioPlayerPage.css';

// Иконки
import playerPrev from '@/shared/assets/icons/playerPrev.svg';
import playerNext from '@/shared/assets/icons/playerNext.svg';
import playerPlay from '@/shared/assets/icons/playerPlay.svg';
import playerArrow from '@/shared/assets/icons/playerArrow.svg';

interface AudioPlayerState {
  title: string;
  description?: string;
  audioUrl: string;
  coverImage?: string;
  moduleName?: string;
  animationUrl?: string;
}

// Компонент анимированной сферы из частиц
const ParticleSphere: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    z: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    size: number;
    alpha: number;
  }>>([]);
  const timeRef = useRef(0);

  // Инициализация частиц
  useEffect(() => {
    const particles: typeof particlesRef.current = [];
    const numParticles = 800;

    for (let i = 0; i < numParticles; i++) {
      // Распределяем точки по сфере с использованием Fibonacci sphere
      const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const radius = 100;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles.push({
        x, y, z,
        baseX: x,
        baseY: y,
        baseZ: z,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.5
      });
    }

    particlesRef.current = particles;
  }, []);

  // Анимация
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      timeRef.current += isPlaying ? 0.02 : 0.005;
      const time = timeRef.current;

      // Интенсивность пульсации
      const pulseIntensity = isPlaying ? 0.15 : 0.05;
      const rotationSpeed = isPlaying ? 0.3 : 0.1;

      // Сортируем частицы по Z для правильного отображения
      const sortedParticles = [...particlesRef.current].map(p => {
        // Добавляем пульсацию
        const pulse = 1 + Math.sin(time * 2 + p.baseX * 0.05) * pulseIntensity;

        // Вращение
        const cosR = Math.cos(time * rotationSpeed);
        const sinR = Math.sin(time * rotationSpeed);

        const rotatedX = p.baseX * cosR - p.baseZ * sinR;
        const rotatedZ = p.baseX * sinR + p.baseZ * cosR;

        return {
          ...p,
          x: rotatedX * pulse,
          y: p.baseY * pulse + Math.sin(time * 3 + p.baseX * 0.1) * (isPlaying ? 5 : 2),
          z: rotatedZ * pulse
        };
      }).sort((a, b) => a.z - b.z);

      // Рисуем частицы
      sortedParticles.forEach(p => {
        const scale = (p.z + 150) / 300; // Псевдо-перспектива
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;
        const size = p.size * scale * (isPlaying ? 1.2 : 1);
        const alpha = p.alpha * scale * (isPlaying ? 1 : 0.7);

        // Градиент цвета от золотистого к белому
        const colorIntensity = (p.z + 100) / 200;
        const r = Math.floor(255);
        const g = Math.floor(200 + colorIntensity * 55);
        const b = Math.floor(120 + colorIntensity * 135);

        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying]);

  return (
    <div className="particle-sphere-container">
      <div className={`particle-sphere ${isPlaying ? 'playing' : ''}`}>
        {/* Световые пятна */}
        <div className="particle-sphere-glow particle-sphere-glow-1" />
        <div className="particle-sphere-glow particle-sphere-glow-2" />
        <div className="particle-sphere-glow particle-sphere-glow-3" />

        {/* Canvas для частиц */}
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="particle-sphere-canvas"
        />
      </div>
    </div>
  );
};

/**
 * Страница полноэкранного аудиоплеера
 * Используется для техник и уроков
 */
const AudioPlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем данные из state навигации
  const state = location.state as AudioPlayerState | null;

  // Состояние плеера
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Логирование для отладки
  useEffect(() => {
    console.log('=== AudioPlayerPage DEBUG ===');
    console.log('State:', state);
    console.log('animationUrl:', state?.animationUrl);
    console.log('============================');
  }, [state]);

  // Если нет данных, возвращаемся назад
  useEffect(() => {
    if (!state) {
      navigate(-1);
    }
  }, [state, navigate]);

  // Обработчики аудио
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Перемотка на 15 секунд
  const handleSkipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15);
    }
  };

  // Клик по прогресс-бару
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const newTime = percent * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Процент прогресса
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!state) {
    return null;
  }

  return (
    <Page back showTabBar={false}>
      <div className="audio-player-page">
        {/* Скрытый audio элемент */}
        <audio
          ref={audioRef}
          src={state.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        {/* Область с видео-анимацией на фоне */}
        {state.animationUrl ? (
          <>
            <div className="audio-player-video-background">
              <BackgroundVideo
                videoSrc={state.animationUrl}
                fallbackImageSrc={state.coverImage}
                className="audio-player-video"
              />
            </div>
            {/* Градиентная подложка снизу */}
            <div className="audio-player-video-overlay" />
          </>
        ) : (
          <div className="audio-player-cover-area">
            {state.coverImage ? (
              <img
                src={state.coverImage}
                alt={state.title}
                className="audio-player-cover-image"
              />
            ) : (
              <ParticleSphere isPlaying={isPlaying} />
            )}
          </div>
        )}

        {/* Нижняя панель управления */}
        <div className="audio-player-controls-panel">
          {/* Название модуля */}
          {state.moduleName && (
            <div className="audio-player-module-label">
              {state.moduleName}
            </div>
          )}

          {/* Заголовок */}
          <h1 className="audio-player-title">{state.title}</h1>

          {/* Описание с анимированным раскрытием */}
          {state.description && (
            <div className="audio-player-description-container">
              <motion.div
                className="audio-player-description-wrapper"
                initial={false}
                animate={{
                  maxHeight: isDescriptionExpanded ? 500 : 20,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <p className="audio-player-description">
                  {state.description}
                </p>
              </motion.div>
              <button
                className="audio-player-read-more"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                Читать
                <img
                  src={playerArrow}
                  alt=""
                  className={`audio-player-arrow ${isDescriptionExpanded ? 'rotated' : ''}`}
                />
              </button>
            </div>
          )}

          {/* Прогресс-бар */}
          <div className="audio-player-progress-container">
            <div
              className="audio-player-progress-bar"
              onClick={handleProgressClick}
            >
              <div
                className="audio-player-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="audio-player-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="audio-player-buttons">
            <motion.button
              className="audio-player-btn"
              onClick={handleSkipBackward}
              whileTap={{ scale: 0.9 }}
            >
              <img src={playerPrev} alt="Назад" />
            </motion.button>

            <motion.button
              className="audio-player-btn audio-player-btn-play"
              onClick={handlePlayPause}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? (
                <div className="audio-player-pause-icon">
                  <div className="pause-bar" />
                  <div className="pause-bar" />
                </div>
              ) : (
                <img src={playerPlay} alt="Воспроизвести" />
              )}
            </motion.button>

            <motion.button
              className="audio-player-btn"
              onClick={handleSkipForward}
              whileTap={{ scale: 0.9 }}
            >
              <img src={playerNext} alt="Вперёд" />
            </motion.button>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default AudioPlayerPage;
