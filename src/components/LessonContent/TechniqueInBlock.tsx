import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';

interface TechniqueInBlockProps {
  techniqueId: string;
}

interface Technique {
  id: string;
  name: string;
  description?: string | null;
  cover_image_path?: string | null;
  material_type: 'video' | 'audio' | 'article' | 'link' | 'file';
}

const TechniqueInBlock: React.FC<TechniqueInBlockProps> = ({ techniqueId }) => {
  const navigate = useNavigate();
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTechnique = async () => {
      if (!techniqueId || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('materials')
          .select('id, name, description, cover_image_path, material_type')
          .eq('id', techniqueId)
          .single();

        if (error) throw error;
        setTechnique(data);
      } catch (err: any) {
        console.error('Error loading technique:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTechnique();
  }, [techniqueId]);

  const handleClick = () => {
    if (technique) {
      navigate(`/material/${technique.id}`);
    }
  };

  if (loading || !technique) {
    return null;
  }

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: '#F0F7FF',
        borderRadius: 16,
        cursor: 'pointer',
        marginTop: 12,
        border: '1px solid #D6E8FF',
        transition: 'all 0.2s',
      }}
    >
      {/* Иконка типа */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: '#E0EFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {technique.material_type === 'audio' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : technique.material_type === 'video' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        ) : (
          <span style={{ fontSize: 18 }}>🎯</span>
        )}
      </div>

      {/* Название и описание */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            lineHeight: '120%',
            color: '#1A5DAB',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          🎯 Техника: {technique.name}
        </p>
        {technique.description && (
          <p
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 400,
              fontSize: 12,
              lineHeight: '120%',
              color: '#6B9BD1',
              margin: 0,
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {technique.description}
          </p>
        )}
      </div>

      {/* Стрелка */}
      <div style={{ flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B9BD1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
};

export default TechniqueInBlock;
