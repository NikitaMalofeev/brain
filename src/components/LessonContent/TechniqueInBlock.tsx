import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import darkAudioIcon from '@/shared/assets/icons/darkAudio.svg';

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
      navigate(`/techniques/${technique.id}`);
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
        padding: '12px 0',
        cursor: 'pointer',
        marginTop: 12,
      }}
    >
      {/* Иконка darkAudio */}
      <img
        src={darkAudioIcon}
        alt="audio"
        style={{
          width: 24,
          height: 24,
          flexShrink: 0,
        }}
      />

      {/* Название техники */}
      <p
        style={{
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 600,
          fontSize: 16,
          lineHeight: '100%',
          color: '#222222',
          margin: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {technique.name}
      </p>

      {/* Стрелка */}
      <svg
        width="5"
        height="10"
        viewBox="0 0 5 10"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M1 1L4 5L1 9"
          stroke="#ADADAD"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default TechniqueInBlock;
