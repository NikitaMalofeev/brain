import React, { useRef, useEffect } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import KinescopePlayer from '@kinescope/react-kinescope-player';
import './Player.css';

interface VideoPlayerProps {
  videoId: string;
  title: string;
  description?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, title, description }) => {
  const { state, play, pause, seekTo, toggleFullscreen } = usePlayer();
  const playerRef = useRef<any>(null);

  // Обработчики событий для Kinescope Player
  const handlePlay = () => {
    play();
  };

  const handlePause = () => {
    pause();
  };

  const handleTimeUpdate = ({ currentTime }: { currentTime: number }) => {
    seekTo(currentTime);
  };

  const handleEnded = () => {
    pause();
  };

  // Управление полноэкранным режимом
  useEffect(() => {
    const playerContainer = document.querySelector('.video-player-wrapper');
    if (!playerContainer) return;

    if (state.fullscreen) {
      if (document.fullscreenElement !== playerContainer) {
        playerContainer.requestFullscreen().catch(() => {
          // Ошибка перехода в полноэкранный режим (не используется)
        });
      }
    } else {
      if (document.fullscreenElement === playerContainer) {
        document.exitFullscreen().catch(() => {
          // Ошибка выхода из полноэкранного режима (не используется)
        });
      }
    }
  }, [state.fullscreen]);

  // Управление воспроизведением
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (state.playing) {
      playerRef.current.play().catch(() => {
        // Ошибка при запуске воспроизведения (не используется)
      });
    } else {
      playerRef.current.pause().catch(() => {
        // Ошибка при постановке на паузу (не используется)
      });
    }
  }, [state.playing]);

  // Управление громкостью
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (state.muted) {
      playerRef.current.mute().catch(() => {
        // Ошибка при mute (не используется)
      });
    } else {
      playerRef.current.unmute().catch(() => {
        // Ошибка при unmute (не используется)
      });
      playerRef.current.setVolume(state.volume).catch(() => {
        // Ошибка при setVolume (не используется)
      });
    }
  }, [state.volume, state.muted]);

  // Управление скоростью воспроизведения
  useEffect(() => {
    if (!playerRef.current) return;
    
    playerRef.current.setPlaybackRate(state.playbackRate).catch(() => {
      // Ошибка при setPlaybackRate (не используется)
    });
  }, [state.playbackRate]);

  return (
    <div className="video-player-container">
      <div className="video-player-header">
        <h2>{title || 'Без заголовка'}</h2>
        {description && <p className="video-description">{description}</p>}
      </div>
      
      <div className="video-player-wrapper">
        {videoId ? (
          <KinescopePlayer
            ref={playerRef}
            videoId={videoId}
            width="100%"
            height="100%"
            controls={true}
            autoPlay={false}
            muted={state.muted}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => {
              // Оставляем только критичные ошибки
            }}
          />
        ) : (
          <div className="error-message">Ошибка: ID видео не указан</div>
        )}
        
        {/* Пользовательские элементы управления */}
        {state.displayControls && (
          <div className="custom-controls">
            <button className="fullscreen-btn" onClick={toggleFullscreen}>
              {state.fullscreen ? 'Выйти из полноэкрана' : 'Полный экран'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer; 