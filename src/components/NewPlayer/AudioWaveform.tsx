import { useEffect, useRef } from 'react';
import type { AudioWaveformData } from '@/lib/supabase/types';

interface AudioWaveformProps {
  waveformData: AudioWaveformData;
  progress: number; // 0-100
  onSeek?: (percent: number) => void;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  barWidth?: number;
  barGap?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  waveformData,
  progress,
  onSeek,
  height = 32,
  waveColor = '#B8B8B8',
  progressColor = '#B862EA',
  barWidth = 4,
  barGap = 4
}) => {
  console.log('AudioWaveform render:', {
    waveformData,
    progress,
    hasPeaks: waveformData?.peaks?.length > 0,
    peaksLength: waveformData?.peaks?.length
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    console.log('AudioWaveform useEffect:', {
      hasCanvas: !!canvas,
      hasContainer: !!container,
      containerWidth: container?.clientWidth,
      hasPeaks: !!waveformData.peaks?.length
    });
    
    if (!canvas || !container || !waveformData.peaks?.length) {
      console.log('AudioWaveform: Missing requirements, skipping render');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размеры canvas
    const width = container.clientWidth;
    canvas.width = width;
    canvas.height = height;

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    // Рассчитываем количество баров
    const barTotalWidth = barWidth + barGap;
    const barsCount = Math.floor(width / barTotalWidth);
    const step = waveformData.peaks.length / barsCount;
    
    console.log('AudioWaveform drawing:', {
      canvasWidth: width,
      canvasHeight: height,
      barsCount,
      step,
      firstPeaks: waveformData.peaks.slice(0, 5)
    });

    // Рисуем волну
    for (let i = 0; i < barsCount; i++) {
      const peakIndex = Math.floor(i * step);
      const peak = waveformData.peaks[peakIndex] || 0;
      const barHeight = Math.max(2, peak * height * 0.8); // Минимум 2px высота
      
      const x = i * barTotalWidth;
      const y = (height - barHeight) / 2;
      
      // Определяем цвет бара
      const progressPercent = progress / 100;
      const barProgress = (i / barsCount);
      const isPlayed = progress > 0 && barProgress <= progressPercent;
      
      ctx.fillStyle = isPlayed ? progressColor : waveColor;
      
      // Рисуем бар со скругленными углами
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1.5);
      ctx.fill();
    }
    
    // Рисуем вертикальную полоску курсора
    if (progress > 0) {
      const progressX = (width * progress) / 100;
      
      ctx.fillStyle = progressColor;
      ctx.fillRect(progressX, 0, 1, height);
    }
  }, [waveformData, progress, height, waveColor, progressColor, barWidth, barGap]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(Math.max(0, Math.min(1, percent)));
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative cursor-pointer"
      onClick={handleClick}
      style={{ minHeight: height }}
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          imageRendering: 'crisp-edges',
          display: 'block'
        }}
      />
    </div>
  );
};