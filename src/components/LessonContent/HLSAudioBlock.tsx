import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2 } from 'lucide-react';
import { usePlayer, PlayerType } from '@/contexts/PlayerContext';
import { useAppContext } from '@/contexts/AppContext';
import { LessonBlock } from '@/lib/supabase/types';

interface HLSAudioBlockProps {
    block: LessonBlock;
}

const HLSAudioBlock: React.FC<HLSAudioBlockProps> = ({ block }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [duration, setDuration] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isTrackingProgress, setIsTrackingProgress] = useState<boolean>(false);
    const [isHLSSupported, setIsHLSSupported] = useState<boolean>(true);

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

    const audioUrl = block.content_url || '';
    const audioId = `hls-audio-${audioUrl}`;
    const isThisPlayerActive = state.activeType === PlayerType.AUDIO && state.contentId === audioId;

    // Проверяем, является ли URL HLS потоком
    const isHLSUrl = (url: string): boolean => {
        console.log(isHLSUrl)
        return url.endsWith('.m3u8') || url.includes('master.m3u8');
    };

    // Проверяем, может ли браузер воспроизводить HLS нативно (Safari)
    const canPlayHLS = (): boolean => {
        const audio = document.createElement('audio');
        return Boolean(audio.canPlayType('application/vnd.apple.mpegurl'));
    };

    useEffect(() => {
        if (!audioRef.current || !isHLSUrl(audioUrl)) return;

        const audio = audioRef.current;

        if (canPlayHLS()) {
            // Safari и другие браузеры с нативной поддержкой HLS
            audio.src = audioUrl;
            setIsHLSSupported(true);
        } else if (Hls.isSupported()) {
            // Используем HLS.js для остальных браузеров
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000, // 60 MB
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 2,
                nudgeOffset: 0.1,
                nudgeMaxRetry: 3,
                maxFragLookUpTolerance: 0.25,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: Infinity,
                liveDurationInfinity: true,
                preferManagedMediaSource: true,
            });

            hlsRef.current = hls;

            hls.loadSource(audioUrl);
            hls.attachMedia(audio);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Ошибка сети при загрузке HLS:', data);
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Ошибка медиа при воспроизведении HLS:', data);
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('Фатальная ошибка HLS:', data);
                            setIsHLSSupported(false);
                            break;
                    }
                }
            });

            setIsHLSSupported(true);
        } else {
            // HLS не поддерживается
            console.error('HLS не поддерживается в этом браузере');
            setIsHLSSupported(false);
        }

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
            
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [audioUrl]);

    // Синхронизация с HTML5 audio элементом для активного плеера
    useEffect(() => {
        if (!audioRef.current || !isThisPlayerActive) {
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
            }
            return;
        }

        const audio = audioRef.current;

        audio.volume = state.muted ? 0 : state.volume;
        audio.playbackRate = state.playbackRate;

        const handleTimeUpdate = () => {
            if (!isTrackingProgress) {
                seekTo(audio.currentTime);
            }
        };

        const handleDurationChange = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const handleEnded = () => pause();

        if (state.playing) {
            audio.play().catch(error => console.error('Ошибка воспроизведения:', error));
        } else {
            audio.pause();
        }

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [isThisPlayerActive, state.playing, state.volume, state.muted, state.playbackRate, seekTo, pause, isTrackingProgress]);

    // Изменение позиции воспроизведения
    useEffect(() => {
        if (!audioRef.current || !isThisPlayerActive || isTrackingProgress) return;

        if (Math.abs(audioRef.current.currentTime - state.currentTime) > 1.5) {
            audioRef.current.currentTime = state.currentTime;
        }
    }, [state.currentTime, isThisPlayerActive, isTrackingProgress]);

    const handlePlayRequest = () => {
        if (isThisPlayerActive) {
            togglePlay();
        } else {
            setActiveType(PlayerType.AUDIO);
            setContentId(audioId);
            play();
        }
    };

    const progressWidth = (): string => {
        if (!duration || !isThisPlayerActive) return '0%';
        const percent = (state.currentTime / duration) * 100;
        return `${Math.min(100, Math.max(0, percent))}%`;
    };

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
    };

    if (!isHLSSupported || !isHLSUrl(audioUrl)) {
        // Fallback на обычный AudioBlock для не-HLS контента
        return null;
    }

    return (
        <React.Fragment>
            <style>{`
                .volume-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 4px;
                    background: rgba(0, 0, 0, 0.12);
                    border-radius: 4px;
                    outline: none;
                    cursor: pointer;
                }

                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.8);
                    cursor: pointer;
                    margin-top: -4px;
                }

                .volume-slider::-moz-range-thumb {
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.8);
                    cursor: pointer;
                    border: none;
                }

                .volume-slider::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 4px;
                    background: linear-gradient(to right, rgba(0, 0, 0, 0.8) var(--volume-progress), rgba(0, 0, 0, 0.12) var(--volume-progress));
                    border-radius: 4px;
                }
            `}</style>
            <div style={{ marginBottom: '24px' }}>
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

                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '24px',
                    padding: '16px',
                    marginBottom: '12px',
                    position: 'relative',
                    border: '0.7px solid rgba(0, 0, 0, 0.12)',
                }}>
                    <audio
                        ref={audioRef}
                        preload="metadata"
                        style={{ display: 'none' }}
                    />

                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
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

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '4px',
                            flex: 1,
                        }}>
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
                                <div style={{
                                    width: progressWidth(),
                                    height: '100%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    borderRadius: '2px',
                                    position: 'relative',
                                }}>
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

                    {(isThisPlayerActive) && (
                        <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                        }}>
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

                            {isThisPlayerActive && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flex: 1,
                                    maxWidth: '150px',
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
                                            height: '4px',
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

export default HLSAudioBlock;