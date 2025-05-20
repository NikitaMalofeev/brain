import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import './Player.css';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  description?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title, description }) => {
  const { state, play, pause, seekTo, togglePlay, setVolume } = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Флаг для отслеживания перемещения ползунка прогресса
  const [isTrackingProgress] = useState(false);

  // Синхронизация с аудио элементом
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Установка начальной громкости
    audio.volume = state.muted ? 0 : state.volume;
    
    // Установка скорости воспроизведения
    audio.playbackRate = state.playbackRate;
    
    // Обработчики событий
    const handlePlay = () => play();
    const handlePause = () => pause();
    const handleTimeUpdate = () => {
      if (!isTrackingProgress && audio.currentTime !== state.currentTime) {
        seekTo(audio.currentTime);
      }
    };
    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        seekTo(0);
      }
    };
    const handleEnded = () => pause();

    // Добавление обработчиков
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    // Очистка обработчиков
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [play, pause, seekTo, state.volume, state.muted, state.playbackRate, isTrackingProgress]);

  // Управление воспроизведением
  useEffect(() => {
    if (!audioRef.current) return;

    if (state.playing) {
      audioRef.current.play().catch(error => console.error('Ошибка воспроизведения:', error));
    } else {
      audioRef.current.pause();
    }
  }, [state.playing]);

  // Изменение времени воспроизведения
  useEffect(() => {
    if (!audioRef.current || isTrackingProgress) return;

    if (Math.abs(audioRef.current.currentTime - state.currentTime) > 0.5) {
      audioRef.current.currentTime = state.currentTime;
    }
  }, [state.currentTime, isTrackingProgress]);

  // Изменение громкости
  useEffect(() => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = state.muted ? 0 : state.volume;
  }, [state.volume, state.muted]);

  // Изменение скорости воспроизведения
  useEffect(() => {
    if (!audioRef.current) return;
    
    audioRef.current.playbackRate = state.playbackRate;
  }, [state.playbackRate]);

  // Обработка клика на прогресс-бар
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = offsetX / rect.width;
    const newTime = percent * (audioRef.current.duration || 0);
    
    seekTo(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Расчет ширины прогресс-бара
  const progressWidth = () => {
    if (!audioRef.current || !audioRef.current.duration) return 0;
    const percent = (state.currentTime / audioRef.current.duration) * 100;
    return `${percent}%`;
  };

  return (
    <div className="audio-player-container">
      <div className="audio-player-header">
        <h2>{title}</h2>
        {description && <p className="audio-description">{description}</p>}
      </div>
      
      <div className="audio-player-wrapper">
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata" 
          loop={false}
        />
        
        <div className="audio-player-background" style={{ backgroundImage: state.backgroundImage ? `url(${state.backgroundImage})` : 'none' }}>
          <div className="audio-controls">
            <button className="play-pause-btn" onClick={togglePlay}>
              {state.playing ? 'Пауза' : 'Играть'}
            </button>
            
            <div className="progress-container">
              <div 
                ref={progressBarRef} 
                className="progress-bar"
                onClick={handleProgressBarClick}
              >
                <div className="progress-fill" style={{ width: progressWidth() }}></div>
              </div>
              <div className="time-display">
                <span>{formatTime(state.currentTime)}</span>
                <span>{formatTime(audioRef.current?.duration || 0)}</span>
              </div>
            </div>
            
            <div className="volume-control">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={state.volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))} 
              />
            </div>
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

export default AudioPlayer; 