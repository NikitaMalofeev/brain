import type { AudioWaveformData } from '@/lib/supabase/types';

/**
 * Генерирует данные волны из аудио файла
 * @param audioUrl - URL аудио файла
 * @param peaksCount - Количество пиков для визуализации (по умолчанию 150)
 * @returns Promise с данными волны
 */
export async function generateWaveformData(
  audioUrl: string,
  peaksCount: number = 150
): Promise<AudioWaveformData> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Загружаем аудио файл
    fetch(audioUrl)
      .then(response => response.arrayBuffer())
      .then(data => audioContext.decodeAudioData(data))
      .then(audioBuffer => {
        const channelData = audioBuffer.getChannelData(0); // Берем первый канал
        const samplesPerPeak = Math.floor(channelData.length / peaksCount);
        const peaks: number[] = [];
        
        // Генерируем пики
        for (let i = 0; i < peaksCount; i++) {
          const start = i * samplesPerPeak;
          const end = Math.min(start + samplesPerPeak, channelData.length);
          
          let max = 0;
          for (let j = start; j < end; j++) {
            const value = Math.abs(channelData[j]);
            if (value > max) {
              max = value;
            }
          }
          
          peaks.push(max);
        }
        
        // Нормализуем пики (0-1)
        const maxPeak = Math.max(...peaks);
        const normalizedPeaks = peaks.map(peak => peak / maxPeak);
        
        resolve({
          peaks: normalizedPeaks,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate
        });
      })
      .catch(error => {
        console.error('Ошибка при генерации волны:', error);
        reject(error);
      })
      .finally(() => {
        audioContext.close();
      });
  });
}

/**
 * Генерирует моковые данные волны (для тестирования)
 * @param duration - Длительность в секундах
 * @param peaksCount - Количество пиков
 * @returns Данные волны
 */
export function generateMockWaveformData(
  duration: number = 180,
  peaksCount: number = 150
): AudioWaveformData {
  const peaks: number[] = [];
  
  for (let i = 0; i < peaksCount; i++) {
    // Генерируем псевдо-случайные пики с некоторым паттерном
    const base = Math.sin(i * 0.1) * 0.3 + 0.5;
    const variation = Math.random() * 0.4;
    peaks.push(Math.max(0.1, Math.min(1, base + variation)));
  }
  
  return {
    peaks,
    duration,
    sampleRate: 44100
  };
}