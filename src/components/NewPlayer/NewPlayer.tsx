import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Ripple } from '@/components/ui/Ripple/Ripple';

// SVG иконки для Play и Pause
const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M6 17.3336V6.66698C6 5.78742 6 5.34715 6.18509 5.08691C6.34664 4.85977 6.59564 4.71064 6.87207 4.67499C7.18868 4.63415 7.57701 4.84126 8.35254 5.25487L18.3525 10.5882L18.3562 10.5898C19.2132 11.0469 19.642 11.2756 19.7826 11.5803C19.9053 11.8462 19.9053 12.1531 19.7826 12.4189C19.6418 12.7241 19.212 12.9537 18.3525 13.4121L8.35254 18.7454C7.57645 19.1593 7.1888 19.3657 6.87207 19.3248C6.59564 19.2891 6.34664 19.1401 6.18509 18.9129C6 18.6527 6 18.2132 6 17.3336Z"
            fill="url(#paint0_linear_1056_751)" />
        <defs>
            <linearGradient id="paint0_linear_1056_751" x1="11.0982" y1="10.3593" x2="12.1454" y2="-3.89361"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="white" />
                <stop offset="1" stopColor="white" stopOpacity="0.45" />
            </linearGradient>
        </defs>
    </svg>
);

const PauseIcon = () => (
    <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="white" />
    </svg>
);

const NewPlayer = ({ audioUrl }: { audioUrl: string }) => {
    const waveformRef = useRef<HTMLDivElement | null>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState('0:00');
    const [isLoading, setIsLoading] = useState(true);
    const [containerWidth, setContainerWidth] = useState(0);

    // Функция для форматирования времени из секунд в ММ:СС
    const formatTime = (seconds: number) => {
        const date = new Date(seconds * 1000);
        const minutes = date.getUTCMinutes();
        const secs = `0${date.getUTCSeconds()}`.slice(-2);
        return `${minutes}:${secs}`;
    };

    // Функция для расчета количества полосок на основе ширины контейнера
    const calculateBarsCount = () => {
        if (containerWidth === 0) return 25; // Дефолтное значение
        
        // Примерно 8px на полоску (4px ширина + 4px отступ)
        const barWidth = 8;
        const barsCount = Math.floor(containerWidth / barWidth);
        
        // Ограничиваем количество полосок разумными пределами
        return Math.max(10, Math.min(100, barsCount));
    };

    useEffect(() => {
        // Сбрасываем состояние загрузки при смене аудио
        setIsLoading(true);
        
        // Получаем ширину контейнера для расчета количества полосок
        if (waveformRef.current) {
            const width = waveformRef.current.offsetWidth;
            setContainerWidth(width);
        }
        
        // Инициализация WaveSurfer
        if (waveformRef.current) {
            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#B8B8B8',      // Цвет волны
                progressColor: '#B862EA',   // Цвет прогресса неотличим
                cursorWidth: 1,            // Убираем курсор
                barWidth: 4,               // Ширина полосок
                barGap: 4,                 // Расстояние между полосками
                barRadius: 3,              // Скругление углов полосок
                height: 32,                // Высота волны
                normalize: true,           // Нормализация громкости для лучшей визуализации
            });

            wavesurferRef.current.load(audioUrl);

            // Обработчики событий
            wavesurferRef.current.on('ready', () => {
                setDuration(formatTime(wavesurferRef.current?.getDuration() || 0));
                setIsLoading(false);
            });

            wavesurferRef.current.on('play', () => setIsPlaying(true));
            wavesurferRef.current.on('pause', () => setIsPlaying(false));
            wavesurferRef.current.on('finish', () => setIsPlaying(false));
            wavesurferRef.current.on('error', () => {
                setIsLoading(false);
                console.error('Ошибка загрузки аудио файла');
            });

            // Очистка при размонтировании компонента
            return () => {
                wavesurferRef.current?.destroy();
            };
        }
    }, [audioUrl]);

    // Обработчик изменения размера окна для пересчета полосок
    useEffect(() => {
        const handleResize = () => {
            if (waveformRef.current) {
                const width = waveformRef.current.offsetWidth;
                setContainerWidth(width);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePlayPause = () => {
        if (isLoading) return; // Не выполняем действие если загружается
        wavesurferRef.current?.playPause();
    };

    return (
        <div className={'border border-[#595959]/14 p-4 rounded-full flex items-center gap-3'}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
            `}</style>
            <Ripple className="rounded-full overflow-hidden inline-block">
                <button 
                    onClick={handlePlayPause} 
                    disabled={isLoading}
                    className={`outline-none p-2 rounded-full bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)] transition-opacity ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
            </Ripple>
            <div className={'h-8 flex-1 relative'}>
                {isLoading && (
                    <div className={'absolute inset-0 flex items-center'}>
                        {Array.from({ length: calculateBarsCount() }).map((_, i) => (
                            <div
                                key={i}
                                className={'flex-1 bg-[#B8B8B8] rounded-sm mx-1'}
                                style={{
                                    height: `${Math.random() * 20 + 8}px`,
                                    animationDelay: `${i * 0.1}s`,
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }}
                            />
                        ))}
                    </div>
                )}
                <div ref={waveformRef} className={'h-full'} />
            </div>
            <span className={'text-xs text-[#9F9F9F]'}>{duration}</span>
        </div>
    );
};

export default NewPlayer;