import { useEffect, useState, useRef, useMemo } from 'react';

interface WaveformData {
    samples: number[]; // Сырые данные амплитуд
    sampleRate?: number;
    duration?: number;
}

interface HLSWaveformProps {
    audioUrl: string;
    progress: number;
    onSeek: (percent: number) => void;
}

const HLSWaveform = ({ audioUrl, progress, onSeek }: HLSWaveformProps) => {
    const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Константы для визуализации (как в WaveSurfer)
    const BAR_WIDTH = 4;
    const BAR_GAP = 4;
    const BAR_HEIGHT = 32;
    const BAR_RADIUS = 3;

    // Вычисляем количество баров, которое поместится в контейнер
    const barCount = useMemo(() => {
        if (containerWidth === 0) return 0;
        // Точно такой же расчет как в WaveSurfer
        // Вычитаем один gap так как последний бар не имеет gap после себя
        const availableWidth = containerWidth + BAR_GAP;
        return Math.floor(availableWidth / (BAR_WIDTH + BAR_GAP));
    }, [containerWidth]);

    // Измеряем ширину контейнера
    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                console.log('HLSWaveform container width (ResizeObserver):', width);
                setContainerWidth(width);
            }
        });

        resizeObserver.observe(containerRef.current);
        
        // Начальное измерение
        const initialWidth = containerRef.current.offsetWidth;
        console.log('HLSWaveform initial width:', initialWidth);
        setContainerWidth(initialWidth);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Загрузка данных волны
    useEffect(() => {
        const loadWaveformData = async () => {
            try {
                // Формируем URL для waveform.json
                // Убираем имя файла и добавляем waveform.json
                const urlParts = audioUrl.split('/');
                urlParts[urlParts.length - 1] = 'waveform.json';
                const waveformUrl = urlParts.join('/');
                console.log('Loading waveform from:', waveformUrl);
                
                const response = await fetch(waveformUrl);
                if (!response.ok) {
                    console.warn('Waveform data not found, using mock data');
                    generateMockWaveform();
                    return;
                }

                const data = await response.json();
                setWaveformData(data);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading waveform data:', error);
                generateMockWaveform();
            }
        };

        loadWaveformData();
    }, [audioUrl]);

    // Генерация моковых данных волны
    const generateMockWaveform = () => {
        // Генерируем реалистичные данные как музыкальная волна
        const sampleCount = 8000; // Много сэмплов для точности
        const samples: number[] = [];
        
        for (let i = 0; i < sampleCount; i++) {
            const t = i / sampleCount;
            
            // Симулируем разные части трека
            let amplitude = 0;
            
            // Intro (тихое начало)
            if (t < 0.1) {
                amplitude = Math.random() * 0.3;
            }
            // Основная часть
            else if (t < 0.9) {
                // Биты
                const beat = Math.sin(t * 200) * 0.3;
                // Мелодия
                const melody = Math.sin(t * 50) * 0.4;
                // Басы
                const bass = Math.sin(t * 10) * 0.2;
                // Шум
                const noise = (Math.random() - 0.5) * 0.2;
                
                amplitude = Math.abs(beat + melody + bass + noise);
            }
            // Outro
            else {
                amplitude = Math.random() * 0.2;
            }
            
            samples.push(Math.min(1, Math.max(0, amplitude)));
        }

        setWaveformData({ 
            samples,
            duration: 180
        });
        setIsLoading(false);
    };

    // Преобразование сырых данных в бары для отображения
    const bars = useMemo(() => {
        if (!waveformData || barCount === 0) return [];

        const { samples } = waveformData;
        const bars: number[] = [];
        const samplesPerBar = Math.floor(samples.length / barCount);

        // Для каждого бара находим пиковую амплитуду
        for (let i = 0; i < barCount; i++) {
            const start = i * samplesPerBar;
            const end = Math.min(start + samplesPerBar, samples.length);
            
            // Берем максимальное значение в диапазоне (как делает WaveSurfer)
            let peak = 0;
            for (let j = start; j < end; j++) {
                peak = Math.max(peak, samples[j] || 0);
            }
            
            bars.push(peak);
        }

        // Нормализация высоты баров
        const maxPeak = Math.max(...bars, 0.1);
        return bars.map(bar => {
            const normalized = bar / maxPeak;
            // Минимальная высота 25% для визуала
            return normalized * 0.75 + 0.25;
        });
    }, [waveformData, barCount]);

    // Обработка клика для перемотки
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || isDragging) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        
        onSeek(Math.max(0, Math.min(1, percent)));
    };

    // Обработчики перетаскивания полоски
    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percent = x / rect.width;
            
            onSeek(percent);
        };

        const handleGlobalMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, onSeek]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
    };

    // Анимация загрузки - всегда с ref для измерения
    if (isLoading || barCount === 0) {
        return (
            <div ref={containerRef} className="h-full w-full flex items-center gap-1 overflow-hidden">
                {Array.from({ length: 60 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-1 min-w-[4px] bg-[#B8B8B8] rounded-sm flex-shrink-0 animate-pulse"
                        style={{
                            height: `${Math.random() * 20 + 8}px`,
                            animationDelay: `${i * 0.05}s`
                        }}
                    />
                ))}
            </div>
        );
    }

    // Вычисляем точную позицию прогресса
    const exactProgressPosition = (progress / 100) * bars.length;
    const progressBarIndex = Math.floor(exactProgressPosition);
    const partialFill = exactProgressPosition - progressBarIndex; // От 0 до 1 - насколько заполнен текущий бар

    // Отладочная информация
    console.log('HLSWaveform debug:', {
        containerWidth,
        barCount,
        barsLength: bars.length,
        totalWidth: barCount * (BAR_WIDTH + BAR_GAP) - BAR_GAP
    });

    return (
        <div 
            ref={containerRef}
            className={`h-full w-full relative ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
            onClick={handleClick}
        >
            {/* Волна */}
            <div className="h-full w-full flex items-center justify-between">
                {bars.map((height, i) => {
                    // Определяем цвет бара
                    const isFullyFilled = i < progressBarIndex;
                    const isPartiallyFilled = i === progressBarIndex;
                    
                    return (
                        <div
                            key={i}
                            className="w-1 min-w-[4px] max-w-[4px] rounded-sm relative overflow-hidden"
                            style={{
                                height: `${height * BAR_HEIGHT}px`,
                                backgroundColor: '#B8B8B8'
                            }}
                        >
                            {/* Заполненная часть */}
                            {(isFullyFilled || isPartiallyFilled) && (
                                <div 
                                    className="absolute inset-0 bg-[#B862EA] transition-all duration-150"
                                    style={{
                                        width: isFullyFilled ? '100%' : `${partialFill * 100}%`
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Полоска прогресса для перетаскивания */}
            <div
                className="absolute top-0 bottom-0 w-px bg-[#B862EA] cursor-grab z-10"
                style={{ left: `${progress}%` }}
                onMouseDown={handleMouseDown}
            >
                {/* Увеличенная область для захвата */}
                <div className="absolute -left-2.5 -right-2.5 top-0 bottom-0 cursor-grab" />
            </div>
        </div>
    );
};

export default HLSWaveform;