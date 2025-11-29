import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { usePlayer, PlayerType } from '@/contexts/PlayerContext';
import { useAppContext } from '@/contexts/AppContext';
import { LessonBlock } from '@/lib/supabase/types';
import StreamingAudioBlock from './StreamingAudioBlock';
import HLSAudioBlock from './HLSAudioBlock';

interface AudioBlockProps {
    block: LessonBlock;
}

const AudioBlock: React.FC<AudioBlockProps> = ({ block }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [duration, setDuration] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isTrackingProgress, setIsTrackingProgress] = useState<boolean>(false);

    const {
        state,
        play,
        pause,
        seekTo,
        togglePlay,
        setVolume,
        setActiveType,
        setContentId,
        formatTime,
        setPlaybackRate
    } = usePlayer();

    const {
        isTelegramApp
    } = useAppContext();

    // Проверяем, является ли URL HLS потоком
    const isHLSUrl = (url: string): boolean => {
        return url.endsWith('.m3u8') || url.includes('master.m3u8');
    };

    // Проверяем, что URL ведет на Supabase Storage аудио
    const isValidAudioUrl = (url: string): boolean => {
        if (!url) return false;

        // Проверяем Supabase Storage аудио или общие аудио форматы (iOS совместимые)
        return (
            url.includes('/storage/v1/object/public/media/audio/') ||
            url.endsWith('.mp3') ||
            url.endsWith('.wav') ||
            url.endsWith('.m4a') ||
            url.endsWith('.aac') ||
            isHLSUrl(url)
        );
    };

    const audioUrl = block.content_url || '';
    const isValidAudio = isValidAudioUrl(audioUrl);

    // Если это HLS поток, используем HLSAudioBlock
    if (isHLSUrl(audioUrl)) {
        return <HLSAudioBlock block={block} />;
    }
    
    // Для обычных MP3 используем StreamingAudioBlock
    return <StreamingAudioBlock block={block} />;

    // Уникальный ID для этого аудио-плеера
    const audioId = `audio-${audioUrl}`;

    // Проверяем, активен ли именно этот плеер
    const isThisPlayerActive = state.activeType === PlayerType.AUDIO && state.contentId === audioId;

    // Загрузка метаданных аудио
    useEffect(() => {
        if (!audioRef.current || !isValidAudio) return;

        const audio = audioRef.current;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration || 0);
            setIsLoading(false);
        };

        const handleError = () => {
            setIsLoading(false);
            console.error('Ошибка загрузки аудио:', audioUrl);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('error', handleError);
        };
    }, [audioUrl, isValidAudio]);

    // Синхронизация с HTML5 audio элементом для активного плеера
    useEffect(() => {
        if (!audioRef.current || !isThisPlayerActive) {
            // Если этот плеер не активен, принудительно ставим на паузу
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
            }
            return;
        }

        const audio = audioRef.current;

        // Установка громкости
        audio.volume = state.muted ? 0 : state.volume;

        // Установка скорости воспроизведения
        audio.playbackRate = state.playbackRate;

        // Обработчики событий
        const handleTimeUpdate = () => {
            // ВСЕГДА обновляем время, если не идет ручное перемещение
            if (!isTrackingProgress) {
                seekTo(audio.currentTime);
            }
        };

        const handleDurationChange = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
                // НЕ сбрасываем время при загрузке
            }
        };

        const handleEnded = () => pause();

        // Управление воспроизведением
        if (state.playing) {
            audio.play().catch(error => console.error('Ошибка воспроизведения:', error));
        } else {
            audio.pause();
        }

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
    }, [isThisPlayerActive, state.playing, state.volume, state.muted, state.playbackRate, seekTo, pause, isTrackingProgress]);

    // Изменение позиции воспроизведения
    useEffect(() => {
        if (!audioRef.current || !isThisPlayerActive || isTrackingProgress) return;

        // Уменьшаем чувствительность, чтобы избежать конфликта с ручной перемоткой
        if (Math.abs(audioRef.current.currentTime - state.currentTime) > 1.5) {
            audioRef.current.currentTime = state.currentTime;
        }
    }, [state.currentTime, isThisPlayerActive, isTrackingProgress]);

    // Обработчик запуска воспроизведения
    const handlePlayRequest = () => {
        if (isThisPlayerActive) {
            togglePlay();
        } else {
            setActiveType(PlayerType.AUDIO);
            setContentId(audioId);
            play();
        }
    };

    // Расчет ширины прогресс-бара (перемещаем определение до его использования)
    const progressWidth = (): string => {
        if (!duration || !isThisPlayerActive) return '0%';
        const percent = (state.currentTime / duration) * 100;
        return `${Math.min(100, Math.max(0, percent))}%`;
    };

    // Обработчик клика по прогресс-бару (оставляем для кликов без перетаскивания)
    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !audioRef.current || !isThisPlayerActive || !duration || isTrackingProgress) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percent = offsetX / rect.width;
        const newTime = percent * duration;

        seekTo(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!isThisPlayerActive || !duration || !progressBarRef.current || !audioRef.current) return;
        setIsTrackingProgress(true);

        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const offsetX = clientX - rect.left;
        let percent = offsetX / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        const newTime = percent * duration;

        seekTo(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }

        if (!('touches' in e)) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        }
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isTrackingProgress || !progressBarRef.current || !audioRef.current || !duration) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const offsetX = clientX - rect.left;
        let percent = offsetX / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        const newTime = percent * duration;

        seekTo(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
        if (!isTrackingProgress) return;
        setIsTrackingProgress(false);

        if (!('touches' in e) || e.type === 'mouseup') {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        }
        // Оставляем здесь возможный финальный seekTo, если понадобится более строгая синхронизация
        // if (audioRef.current && state.playing) { // Только если плеер играет, чтобы не сбивать паузу
        //     seekTo(audioRef.current.currentTime);
        // }
    };

    if (!isValidAudio) {
        return (
            <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '120px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    color: '#6d6d6d',
                    fontSize: '16px',
                }}>
                    🎵 Аудио недоступно
                </div>
            </div>
        );
    }

    return (
        <React.Fragment>
            <style>{`
                .volume-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 4px; /* Высота трека */
                    background: rgba(0, 0, 0, 0.12); /* Цвет трека как у прогресс-бара */
                    border-radius: 4px;
                    outline: none;
                    cursor: pointer;
                }

                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 12px; /* Размер ползунка */
                    width: 12px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.8);
                    cursor: pointer;
                    margin-top: -4px; /* Центрирование thumb относительно трека (4px трек - 12px ползунок) */
                }

                .volume-slider::-moz-range-thumb {
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.8);
                    cursor: pointer;
                    border: none;
                }

                /* Стили для трека Firefox */
                .volume-slider::-moz-range-track {
                    width: 100%;
                    height: 4px;
                    background: rgba(0, 0, 0, 0.12); /* Трек */
                    border-radius: 4px;
                    cursor: pointer;
                }

                .volume-slider::-moz-range-progress {
                     background: rgba(0, 0, 0, 0.8); /* Заполненная часть */
                     border-radius: 4px;
                     height: 4px;
                }

                /* Стили для IE / Edge */
                .volume-slider::-ms-track {
                    width: 100%;
                    height: 4px;
                    cursor: pointer;
                    background: transparent; /* Прозрачный фон, чтобы цвет был виден через ms-fill-lower/upper */
                    border-color: transparent;
                    color: transparent;
                }

                .volume-slider::-ms-fill-lower {
                    background: rgba(0, 0, 0, 0.8); /* Заполненная часть */
                    border-radius: 4px;
                }

                .volume-slider::-ms-fill-upper {
                    background: rgba(0, 0, 0, 0.12); /* Не заполненная часть */
                    border-radius: 4px;
                }

                .volume-slider::-ms-thumb {
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.8);
                    cursor: pointer;
                    border: none; /* Убираем стандартную рамку */
                    margin-top: 0px; /* Центрирование thumb для IE/Edge */
                }

                /* Стили для Webkit */
                .volume-slider::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 4px;
                    background: linear-gradient(to right, rgba(0, 0, 0, 0.8) var(--volume-progress), rgba(0, 0, 0, 0.12) var(--volume-progress));
                    border-radius: 4px;
                }

                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 12px; /* Размер ползунка */
                    width: 12px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.8);
                    cursor: pointer;
                    margin-top: -4px; /* Центрирование thumb относительно трека (4px трек - 12px ползунок) */
                }
            `}</style>
            <div style={{ marginBottom: '24px' }}>
                {/* Заголовок отдельно */}
                {block.title && (
                    <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#242424',
                        marginBottom: '12px',
                    }}>
                        {block.title}
                    </div>
                )}

                {/* Аудио плеер в стиле Figma */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '24px',
                    padding: '16px',
                    marginBottom: '12px',
                    position: 'relative',
                    border: '0.7px solid rgba(0, 0, 0, 0.12)',
                }}>
                    {/* Скрытый audio элемент с оптимизацией для стриминга */}
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="none"
                        crossOrigin="anonymous"
                        style={{ display: 'none' }}
                    />

                    {/* Горизонтальный layout как в Figma */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        {/* Кнопка Play/Pause */}
                        <div style={{
                            backgroundColor: 'rgba(88, 88, 88, 0.08)',
                            borderRadius: '32px',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={handlePlayRequest}
                                disabled={isLoading}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isLoading ? (
                                    <div style={{ fontSize: '8px', color: '#000000' }}>...</div>
                                ) : (
                                    isThisPlayerActive && state.playing ?
                                        <Pause size={14} color="#000000" fill="#000000" /> :
                                        <Play size={14} color="#000000" fill="#000000" />
                                )}
                            </button>
                        </div>

                        {/* Прогресс-бар с ползунком */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '4px',
                            flex: 1,
                        }}>
                            {/* Простая линия прогресса с ползунком */}
                            <div
                                ref={progressBarRef}
                                onClick={handleProgressBarClick}
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                                onTouchMove={(e) => handleDragMove(e.nativeEvent as unknown as TouchEvent)}
                                onTouchEnd={(e) => handleDragEnd(e.nativeEvent as unknown as TouchEvent)}
                                style={{
                                    width: '100%',
                                    height: '4px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.12)',
                                    borderRadius: '2px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                            >
                                {/* Заполненная часть */}
                                <div style={{
                                    width: progressWidth(),
                                    height: '100%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    borderRadius: '2px',
                                    position: 'relative',
                                }}>
                                    {/* Ползунок */}
                                    {isThisPlayerActive && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '-6px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '12px',
                                            height: '12px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            zIndex: 2
                                        }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Время справа */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            minWidth: '60px',
                            flexShrink: 0,
                        }}>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: '400',
                                lineHeight: '1em',
                                letterSpacing: '-0.03em',
                                color: 'rgba(0, 0, 0, 0.5)',
                                textAlign: 'right',
                            }}>
                                {isThisPlayerActive ?
                                    `${formatTime(state.currentTime)} / ${formatTime(duration)}` :
                                    formatTime(duration)
                                }
                            </div>
                        </div>
                    </div>

                    {/* Дополнительные контролы */}
                    {(isThisPlayerActive) && (
                        <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                        }}>
                            {/* Контрол скорости воспроизведения - только для активного плеера */}
                            {isThisPlayerActive && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'rgba(0, 0, 0, 0.5)',
                                        minWidth: 'fit-content',
                                    }}>
                                        Скорость:
                                    </span>
                                    <select
                                        value={state.playbackRate}
                                        onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                        style={{
                                            fontSize: '12px',
                                            color: 'rgba(0, 0, 0, 0.7)',
                                            backgroundColor: 'rgba(88, 88, 88, 0.08)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '4px 8px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value={0.5}>0.5x</option>
                                        <option value={0.75}>0.75x</option>
                                        <option value={1}>1x</option>
                                        <option value={1.25}>1.25x</option>
                                        <option value={1.5}>1.5x</option>
                                        <option value={2}>2x</option>
                                    </select>
                                </div>
                            )}

                            {/* Регулятор громкости - отображаем, если плеер активен */}
                            {isThisPlayerActive && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flex: 1, // Позволим ему занимать доступное место
                                    maxWidth: '150px', // Немного увеличим, если нужно
                                }}>
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'rgba(0, 0, 0, 0.5)',
                                    }}>
                                        <Volume2 size={16} color="rgba(0, 0, 0, 0.5)" />
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={state.muted ? 0 : state.volume}
                                        onChange={(e) => {
                                            const newVolume = parseFloat(e.target.value);
                                            setVolume(newVolume);
                                        }}
                                        style={{
                                            flex: 1,
                                            height: '4px', // Высота инпута соответствует высоте трека
                                            borderRadius: '4px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                            backgroundColor: 'transparent',
                                            '--volume-progress': `${state.volume * 100}%`,
                                        }}
                                        className="volume-slider"
                                        data-volume={state.volume}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Описание отдельно под плеером */}
                {block.content_text && (
                    <div style={{
                        fontSize: '16px',
                        fontWeight: '400',
                        lineHeight: '1.5em',
                        color: '#424242',
                    }}>
                        {block.content_text}
                    </div>
                )}
            </div>
        </React.Fragment>
    );
};

export default AudioBlock; 