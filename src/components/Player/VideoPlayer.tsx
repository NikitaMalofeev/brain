import React, { useRef, useEffect, useState } from 'react';
import { usePlayer, PlayerType } from '../../contexts/PlayerContext';
import KinescopePlayer from '@kinescope/react-kinescope-player';
import './Player.css';

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  description?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, title: _title, description: _description }) => {
  const {
    state,
    play,
    pause,
    seekTo,
    setActiveType,
    setContentId
  } = usePlayer();

  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Уникальный ID для этого видео-плеера
  const videoIdKey = `video-${videoId}`;

  // Проверяем, активен ли именно этот плеер
  const isThisPlayerActive = state.activeType === PlayerType.VIDEO && state.contentId === videoIdKey;

  // Обработчики событий для Kinescope Player
  const handleReady = () => {
    setIsPlayerReady(true);
  };

  const handlePlay = () => {
    // Игнорируем события, вызванные программно через useEffect
    if (state.programmaticChange) {
      return;
    }

    if (!isThisPlayerActive) {
      // Если другой плеер активен, делаем этот активным
      setActiveType(PlayerType.VIDEO);
      setContentId(videoIdKey);
    }
    play();
  };

  const handlePause = () => {
    // Игнорируем события, вызванные программно через useEffect
    if (state.programmaticChange) {
      return;
    }

    pause();
  };

  const handleTimeUpdate = ({ currentTime }: { currentTime: number }) => {
    if (isThisPlayerActive) {
      seekTo(currentTime);
    }
  };

  const handleEnded = () => {
    pause();
  };

  // Сбрасываем состояние готовности при смене видео
  useEffect(() => {
    setIsPlayerReady(false);
  }, [videoId]);

  // Управление полноэкранным режимом только для активного плеера
  useEffect(() => {
    if (!isThisPlayerActive) return;

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
  }, [state.fullscreen, isThisPlayerActive]);

  // Управление воспроизведением только для активного плеера
  useEffect(() => {
    if (!playerRef.current || !isThisPlayerActive || !isPlayerReady) {
      // Если этот плеер не активен или не готов, пытаемся поставить на паузу
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.pause().catch(() => {
            // Игнорируем ошибки при pause неактивного плеера
          });
        } catch (error) {
          // Игнорируем синхронные ошибки (например, iframe не готов)
        }
      }
      return;
    }

    // Проверяем, что плеер готов к работе
    const executePlayerAction = async () => {
      try {
        if (state.playing) {
          await playerRef.current.play();
        } else {
          await playerRef.current.pause();
        }
      } catch (error) {
        // Игнорируем ошибки воспроизведения (плеер может быть не готов)
        console.debug('Player action error (ignored):', error);
      }
    };

    executePlayerAction();
  }, [state.playing, isThisPlayerActive, isPlayerReady]);

  // Управление громкостью только для активного плеера
  useEffect(() => {
    if (!playerRef.current || !isThisPlayerActive || !isPlayerReady) return;

    const updateVolume = async () => {
      try {
        if (state.muted) {
          await playerRef.current.mute();
        } else {
          await playerRef.current.unmute();
          await playerRef.current.setVolume(state.volume);
        }
      } catch (error) {
        // Игнорируем ошибки управления громкостью
        console.debug('Volume control error (ignored):', error);
      }
    };

    updateVolume();
  }, [state.volume, state.muted, isThisPlayerActive, isPlayerReady]);

  // Управление скоростью воспроизведения только для активного плеера
  useEffect(() => {
    if (!playerRef.current || !isThisPlayerActive || !isPlayerReady) return;

    const updatePlaybackRate = async () => {
      try {
        await playerRef.current.setPlaybackRate(state.playbackRate);
      } catch (error) {
        // Игнорируем ошибки управления скоростью
        console.debug('Playback rate error (ignored):', error);
      }
    };

    updatePlaybackRate();
  }, [state.playbackRate, isThisPlayerActive, isPlayerReady]);

  return (
    <div className="video-player-container">
      <div className="video-player-wrapper">
        {videoId ? (
          <KinescopePlayer
            ref={playerRef}
            videoId={videoId}
            width="100%"
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
            onReady={handleReady}
          />
        ) : (
          <div className="error-message">Ошибка: ID видео не указан</div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer; 