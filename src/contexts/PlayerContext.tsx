import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Типы плееров
export enum PlayerType {
  VIDEO = 'video',
  AUDIO = 'audio',
  TIMER = 'timer',
}

// Состояние плеера
export interface PlayerState {
  playing: boolean;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  fullscreen: boolean;
  displayControls: boolean;
  activeType: PlayerType | null;
  contentId: string | null;
  contentData: any | null; // Данные контента (видео URL, аудио URL, информация и т.д.)
  backgroundImage: string | null; // Фоновое изображение для аудио плеера и таймера
}

// Интерфейс контекста
interface PlayerContextType {
  state: PlayerState;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleFullscreen: () => void;
  showControls: () => void;
  hideControls: () => void;
  setActiveType: (type: PlayerType | null) => void;
  setContentId: (id: string | null) => void;
  setContentData: (data: any) => void;
  setBackgroundImage: (url: string | null) => void;
  resetPlayer: () => void;
  formatTime: (time: number) => string;
}

// Начальное состояние
const initialState: PlayerState = {
  playing: false,
  volume: 1.0,
  muted: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  fullscreen: false,
  displayControls: true,
  activeType: null,
  contentId: null,
  contentData: null,
  backgroundImage: null,
};

// Создание контекста
const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Провайдер контекста
export const PlayerProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [state, setState] = useState<PlayerState>(() => {
    // Попытка восстановить настройки плеера из localStorage
    const savedSettings = localStorage.getItem('playerSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        ...initialState,
        volume: parsed.volume || initialState.volume,
        playbackRate: parsed.playbackRate || initialState.playbackRate,
        muted: parsed.muted || initialState.muted,
      };
    }
    return initialState;
  });

  // Сохранение настроек плеера в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('playerSettings', JSON.stringify({
      volume: state.volume,
      playbackRate: state.playbackRate,
      muted: state.muted,
    }));
  }, [state.volume, state.playbackRate, state.muted]);

  // Методы управления плеером
  const play = () => {
    setState(prev => ({ ...prev, playing: true }));
  };

  const pause = () => {
    setState(prev => ({ ...prev, playing: false }));
  };

  const togglePlay = () => {
    setState(prev => ({ ...prev, playing: !prev.playing }));
  };

  const setVolume = (volume: number) => {
    const newVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: newVolume, muted: newVolume === 0 }));
  };

  const toggleMute = () => {
    setState(prev => ({ ...prev, muted: !prev.muted }));
  };

  const seekTo = (time: number) => {
    const newTime = Math.max(0, Math.min(state.duration, time));
    setState(prev => ({ ...prev, currentTime: newTime }));
  };

  const setPlaybackRate = (rate: number) => {
    setState(prev => ({ ...prev, playbackRate: rate }));
  };

  const toggleFullscreen = () => {
    setState(prev => ({ ...prev, fullscreen: !prev.fullscreen }));
  };

  const showControls = () => {
    setState(prev => ({ ...prev, displayControls: true }));
  };

  const hideControls = () => {
    setState(prev => ({ ...prev, displayControls: false }));
  };

  const setActiveType = (type: PlayerType | null) => {
    setState(prev => ({ 
      ...prev, 
      activeType: type,
      // Сбрасываем состояние плеера при смене типа
      playing: false,
      currentTime: 0,
      duration: 0,
      fullscreen: false,
    }));
  };

  const setContentId = (id: string | null) => {
    setState(prev => ({ ...prev, contentId: id }));
  };

  const setContentData = (data: any) => {
    setState(prev => ({ 
      ...prev, 
      contentData: data,
      duration: data?.duration || 0
    }));
  };

  const setBackgroundImage = (url: string | null) => {
    setState(prev => ({ ...prev, backgroundImage: url }));
  };

  const resetPlayer = () => {
    setState(prev => ({ 
      ...initialState,
      // Сохраняем пользовательские настройки
      volume: prev.volume,
      playbackRate: prev.playbackRate,
      muted: prev.muted
    }));
  };

  // Форматирование времени (из секунд в MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <PlayerContext.Provider
      value={{
        state,
        play,
        pause,
        togglePlay,
        setVolume,
        toggleMute,
        seekTo,
        setPlaybackRate,
        toggleFullscreen,
        showControls,
        hideControls,
        setActiveType,
        setContentId,
        setContentData,
        setBackgroundImage,
        resetPlayer,
        formatTime,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

// Хук для использования контекста
export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}; 