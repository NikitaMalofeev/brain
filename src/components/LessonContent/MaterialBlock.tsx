import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { LessonBlock } from '@/lib/supabase/types';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { MarkdownContent } from './MarkdownContent';

// Функция для преобразования текста с ссылками
function linkifyText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#007AFF', textDecoration: 'underline' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface MaterialBlockProps {
  block: LessonBlock;
}

interface Material {
  id: string;
  name: string;
  description?: string | null;
  cover_image_path?: string | null;
  material_type: 'video' | 'audio' | 'article' | 'link' | 'file';
  course_id?: string | null;
  release_date?: string | null;
}

const MaterialBlock: React.FC<MaterialBlockProps> = ({ block }) => {
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загружаем данные материала
  useEffect(() => {
    const loadMaterial = async () => {
      if (!block.material_id || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('id', block.material_id)
          .lte('release_date', now) // Только если дата открытия <= текущей
          .single();

        if (error) throw error;
        setMaterial(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMaterial();
  }, [block.material_id]);

  const handleMaterialClick = () => {
    if (material) {
      navigate(`/material/${material.id}`);
    }
  };

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'article': return '📄';
      case 'link': return '🔗';
      case 'file': return '📎';
      default: return '📄';
    }
  };

  const getMaterialTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Видео';
      case 'audio': return 'Аудио';
      case 'article': return 'Статья';
      case 'link': return 'Ссылка';
      case 'file': return 'Файл';
      default: return 'Материал';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-2xl">
          <div className="text-gray-500">Загрузка материала...</div>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-2xl">
          <div className="text-gray-500">
            Материал ещё не доступен
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Кнопка материала */}
      <div 
        onClick={handleMaterialClick}
        className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 shadow-sm"
      >
        {/* Обложка материала */}
        <div className="flex-shrink-0">
          {material.cover_image_path ? (
            <img
              src={buildFileUrl(material.cover_image_path) || ''}
              alt={material.name}
              className="w-16 h-16 object-cover rounded-xl"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
              <span className="text-2xl">{getMaterialTypeIcon(material.material_type)}</span>
            </div>
          )}
        </div>

        {/* Информация о материале */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">{getMaterialTypeIcon(material.material_type)}</span>
            <span className="text-sm text-gray-500">{getMaterialTypeLabel(material.material_type)}</span>
          </div>
          <h4 className="font-semibold text-gray-900 truncate">{material.name}</h4>
          {material.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{material.description}</p>
          )}
        </div>

        {/* Иконка перехода */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Описание блока, если есть */}
      {block.content_text && (
        <MarkdownContent content={block.content_text} className="mt-4" />
      )}
    </div>
  );
};

export default MaterialBlock; 