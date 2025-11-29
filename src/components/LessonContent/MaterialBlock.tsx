import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { LessonBlock } from '@/lib/supabase/types';
import { MarkdownContent } from './MarkdownContent';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Кнопка материала - новый дизайн */}
      <div
        onClick={handleMaterialClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#F5F5F5',
          borderRadius: 16,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {/* Иконка типа материала */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: material.material_type === 'audio' ? '#E8F4FD' : '#F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {material.material_type === 'audio' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : material.material_type === 'video' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <span style={{ fontSize: 18 }}>{getMaterialTypeIcon(material.material_type)}</span>
          )}
        </div>

        {/* Название материала */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '120%',
              color: '#000',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {material.name}
          </p>
          {material.description && (
            <p
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 400,
                fontSize: 12,
                lineHeight: '120%',
                color: '#8C8C8C',
                margin: 0,
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {material.description}
            </p>
          )}
        </div>

        {/* Стрелка */}
        <div style={{ flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
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