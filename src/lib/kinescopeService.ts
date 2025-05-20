// Сервис для работы с Kinescope API
// Документация: https://kinescope.io/api/

// Типы для Kinescope API
export interface KinescopeVideo {
  id: string;
  title: string;
  duration: number; // длительность в секундах
  status: string;
  created_at: string;
  thumbnails: {
    default: string;
    high: string;
  };
  // Другие поля из API...
}

export interface KinescopeVideoResponse {
  data: KinescopeVideo[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

/**
 * Получает метаданные видео из Kinescope по ID
 * @param videoId ID видео в Kinescope
 * @returns Объект с метаданными видео или null, если видео не найдено
 */
export const getKinescopeVideoMetadata = async (videoId: string): Promise<KinescopeVideo | null> => {
  try {
    // Используем публичный embed API, который не требует авторизации
    const response = await fetch(`https://kinescope.io/embed/${videoId}/player.json`);
    
    if (!response.ok) {
      console.error(`Ошибка при получении метаданных видео: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Преобразуем данные из embed API в наш формат
    if (data && data.video) {
      return {
        id: data.video.id,
        title: data.video.title,
        duration: data.video.duration,
        status: 'active',
        created_at: data.video.created_at || new Date().toISOString(),
        thumbnails: {
          default: data.video.poster_url || '',
          high: data.video.poster_url || ''
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при запросе к Kinescope API:', error);
    return null;
  }
};

/**
 * Получает метаданные для списка видео по их ID
 * @param videoIds Массив ID видео
 * @returns Объект, где ключи - это ID видео, а значения - метаданные
 */
export const getMultipleVideosMetadata = async (videoIds: string[]): Promise<Record<string, KinescopeVideo | null>> => {
  const result: Record<string, KinescopeVideo | null> = {};
  
  // Используем Promise.all для параллельных запросов
  const promises = videoIds.map(async (id) => {
    try {
      const metadata = await getKinescopeVideoMetadata(id);
      result[id] = metadata;
    } catch (error) {
      console.error(`Ошибка при получении метаданных для видео ${id}:`, error);
      result[id] = null;
    }
  });
  
  await Promise.all(promises);
  return result;
};

/**
 * Получает метаданные для всех видео из базы данных Supabase
 * @param supabase Клиент Supabase
 * @returns Объект с метаданными видео
 */
export const getMetadataForAllVideos = async (supabase: any): Promise<Record<string, KinescopeVideo | null>> => {
  try {
    // Получаем все записи с kinescope_id из таблицы contents
    const { data, error } = await supabase
      .from('contents')
      .select('id, kinescope_id')
      .not('kinescope_id', 'is', null);
    
    if (error) {
      throw error;
    }
    
    // Собираем уникальные ID видео
    const videoIds = [...new Set(data.map((item: any) => item.kinescope_id))].filter(Boolean) as string[];
    console.log(`Найдено ${videoIds.length} уникальных видео для получения метаданных`);
    
    // Получаем метаданные для всех видео
    return await getMultipleVideosMetadata(videoIds);
  } catch (error) {
    console.error('Ошибка при получении ID видео из базы данных:', error);
    return {};
  }
};

/**
 * Обновляет длительность видео в базе данных
 * @param supabase Клиент Supabase
 * @param contentId ID контента в базе данных
 * @param durationSeconds Длительность в секундах
 */
export const updateVideoDuration = async (
  supabase: any, 
  contentId: string, 
  durationSeconds: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contents')
      .update({ duration: durationSeconds })
      .eq('id', contentId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Ошибка при обновлении длительности для контента ${contentId}:`, error);
    return false;
  }
};

/**
 * Обновляет длительность для всех видео в базе данных
 * @param supabase Клиент Supabase
 */
export const updateAllVideoDurations = async (supabase: any): Promise<{ 
  success: number; 
  failed: number; 
  skipped: number 
}> => {
  try {
    // Получаем все записи с kinescope_id из таблицы contents
    const { data, error } = await supabase
      .from('contents')
      .select('id, kinescope_id')
      .not('kinescope_id', 'is', null);
    
    if (error) {
      throw error;
    }
    
    console.log(`Найдено ${data.length} записей с kinescope_id`);
    
    // Получаем метаданные для всех видео
    const metadata = await getMetadataForAllVideos(supabase);
    
    // Счетчики для статистики
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    // Обновляем длительность для каждой записи
    for (const item of data) {
      const videoId = item.kinescope_id;
      const contentId = item.id;
      
      // Если нет метаданных для видео, пропускаем
      if (!metadata[videoId]) {
        console.warn(`Нет метаданных для видео ${videoId}, пропускаем`);
        skipped++;
        continue;
      }
      
      // Получаем длительность из метаданных
      const duration = metadata[videoId]?.duration;
      
      // Если нет длительности, пропускаем
      if (!duration) {
        console.warn(`Нет данных о длительности для видео ${videoId}, пропускаем`);
        skipped++;
        continue;
      }
      
      // Обновляем длительность в базе данных
      const updated = await updateVideoDuration(supabase, contentId, duration);
      
      if (updated) {
        console.log(`Обновлена длительность для контента ${contentId}: ${duration} секунд`);
        success++;
      } else {
        failed++;
      }
    }
    
    return { success, failed, skipped };
  } catch (error) {
    console.error('Ошибка при обновлении длительности видео:', error);
    return { success: 0, failed: 0, skipped: 0 };
  }
}; 