import React, { useEffect, useRef, useState } from 'react';
import { usePlayer, PlayerType } from '../../contexts/PlayerContext';
import './Player.css';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  description?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title, description }) => {
  const {
    state,
    play,
    pause,
    seekTo,
    togglePlay,
    setVolume,
    setActiveType,
    setContentId,
    formatTime
  } = usePlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isTrackingProgress] = useState(false);

  // Уникальный ID для этого аудио-плеера
  const audioId = `audio-${audioUrl}`;

  // Проверяем, активен ли именно этот плеер
  const isThisPlayerActive = state.activeType === PlayerType.AUDIO && state.contentId === audioId;

  // Обработчик запуска воспроизведения
  const handlePlayRequest = () => {
    if (isThisPlayerActive) {
      // Если этот плеер уже активен, просто переключаем play/pause
      togglePlay();
    } else {
      // Если другой плеер активен или никто не активен, делаем этот активным
      setActiveType(PlayerType.AUDIO);
      setContentId(audioId);
      play();
    }
  };

  // Синхронизация с HTML5 audio элементом
  useEffect(() => {
    if (!audioRef.current || !isThisPlayerActive) return;

    const audio = audioRef.current;

    // Установка начальной громкости
    audio.volume = state.muted ? 0 : state.volume;

    // Установка скорости воспроизведения
    audio.playbackRate = state.playbackRate;

    // Обработчики событий
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
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    // Очистка обработчиков
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isThisPlayerActive, seekTo, pause, state.volume, state.muted, state.playbackRate, isTrackingProgress]);

  // Управление воспроизведением только для активного плеера
  useEffect(() => {
    if (!audioRef.current || !isThisPlayerActive) {
      // Если этот плеер не активен, принудительно ставим на паузу
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }

    if (state.playing) {
      audioRef.current.play().catch(error => console.error('Ошибка воспроизведения:', error));
    } else {
      audioRef.current.pause();
    }
  }, [state.playing, isThisPlayerActive]);

  // Изменение времени воспроизведения только для активного плеера
  useEffect(() => {
    if (!audioRef.current || !isThisPlayerActive || isTrackingProgress) return;

    if (Math.abs(audioRef.current.currentTime - state.currentTime) > 0.5) {
      audioRef.current.currentTime = state.currentTime;
    }
  }, [state.currentTime, isThisPlayerActive, isTrackingProgress]);

  // Изменение громкости только для активного плеера
  useEffect(() => {
    if (!audioRef.current || !isThisPlayerActive) return;

    audioRef.current.volume = state.muted ? 0 : state.volume;
  }, [state.volume, state.muted, isThisPlayerActive]);

  // Изменение скорости воспроизведения только для активного плеера
  useEffect(() => {
    if (!audioRef.current || !isThisPlayerActive) return;

    audioRef.current.playbackRate = state.playbackRate;
  }, [state.playbackRate, isThisPlayerActive]);

  // Обработка клика на прогресс-бар
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || !isThisPlayerActive) return;

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
    if (!audioRef.current || !audioRef.current.duration || !isThisPlayerActive) return 0;
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
            <button className="play-pause-btn" onClick={handlePlayRequest}>
              {isThisPlayerActive && state.playing ? 'Пауза' : 'Играть'}
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
                <span>{formatTime(isThisPlayerActive ? state.currentTime : 0)}</span>
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
                disabled={!isThisPlayerActive}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer; 