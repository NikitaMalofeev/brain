import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { uploadFile, buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { FILE_PREFIXES } from '@/lib/supabase/storage_prefixes';
import { Plus, Video, X, Loader2 } from 'lucide-react';

interface VideoSelectProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  disabled?: boolean;
}

interface VideoItem {
  name: string;
  url: string;
}

export const VideoSelect: React.FC<VideoSelectProps> = ({
  value,
  onChange,
  label = 'Анимация для плеера',
  disabled = false,
}) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загружаем список доступных видео из storage
  const loadVideos = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('media')
        .list(FILE_PREFIXES.VIDEO.replace('/', ''), {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.error('Error loading videos:', error);
        return;
      }

      const videoItems: VideoItem[] = (data || [])
        .filter(file => file.name.endsWith('.mp4'))
        .map(file => ({
          name: file.name,
          url: buildFileUrl(`${FILE_PREFIXES.VIDEO}${file.name}`) || '',
        }));

      setVideos(videoItems);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Загрузка нового видео
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('video/mp4') && !file.name.endsWith('.mp4')) {
      alert('Пожалуйста, загрузите файл в формате MP4');
      return;
    }

    try {
      setUploading(true);
      const filePath = await uploadFile(file, FILE_PREFIXES.VIDEO);
      const fileUrl = buildFileUrl(filePath);

      if (fileUrl) {
        onChange(fileUrl);
        await loadVideos(); // Обновляем список
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Ошибка при загрузке видео');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Получаем имя файла из URL для отображения
  const getFileName = (url: string): string => {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Видео';
  };

  return (
    <div className="video-select" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="flex gap-2">
        {/* Select dropdown */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center gap-2 hover:border-gray-400 focus:ring-2 focus:ring-[#B862EA] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {value ? (
              <>
                <Video className="w-4 h-4 text-gray-500" />
                <span className="truncate flex-1">{getFileName(value)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </>
            ) : (
              <span className="text-gray-400">Выберите анимацию...</span>
            )}
          </button>

          {/* Dropdown menu */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Загрузка...
                </div>
              ) : videos.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Нет доступных видео
                </div>
              ) : (
                videos.map((video) => (
                  <button
                    key={video.url}
                    type="button"
                    onClick={() => {
                      onChange(video.url);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0 ${
                      value === video.url ? 'bg-purple-50' : ''
                    }`}
                  >
                    {/* Превью видео */}
                    <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      <video
                        src={video.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          // Показываем первый кадр
                          (e.target as HTMLVideoElement).currentTime = 0.1;
                        }}
                      />
                    </div>
                    <span className="truncate text-sm">{video.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Кнопка добавления */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="px-4 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Добавить</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,.mp4"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Превью выбранного видео */}
      {value && (
        <div className="mt-3 rounded-lg overflow-hidden bg-black aspect-video max-w-xs">
          <video
            src={value}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
      )}
    </div>
  );
};

export default VideoSelect;
