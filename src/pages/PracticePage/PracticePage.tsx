import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayerProvider, usePlayer, PlayerType } from '../../contexts/PlayerContext';
import VideoPlayer from '../../components/Player/VideoPlayer';
import AudioPlayer from '../../components/Player/AudioPlayer';
import TimerPlayer from '../../components/Player/TimerPlayer';
import { supabase } from '../../lib/supabase/client';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { useRecommendedPractice, PracticeCriteria } from '../../lib/supabase/hooks/useRecommendedPractice';
import './PracticePage.css';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { initDataState as _initDataState, useSignal } from '@telegram-apps/sdk-react';
import { useQuiz } from '../../contexts/QuizContext';

// SVG иконка информации для критериев
const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// SVG иконка обновления для кнопки
const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 3V8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 16V21H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 8C17.6797 6.13033 16.1123 4.66053 14.1334 3.86301C12.1546 3.06548 9.9379 3.00208 7.9162 3.68259C5.8945 4.36311 4.20129 5.74065 3.13134 7.56327C2.06138 9.38589 1.69482 11.5325 2.09 13.61L3 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 13C21.1747 13.6991 21.26 14.4143 21.255 15.131C21.2505 15.7545 21.1915 16.3763 21.079 16.988C20.636 19.379 19.254 21.499 17.222 22.883C15.19 24.267 12.695 24.793 10.276 24.349C7.85707 23.9051 5.7371 22.5228 4.35297 20.4908C2.96883 18.4587 2.44315 15.9636 2.887 13.545" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Компонент для отображения критериев в попапе
const CriteriaPopup = ({ criteria }: { criteria: PracticeCriteria }) => {
  // Функция для форматирования значений критериев
  const formatCriteriaValue = (key: string, value: any): string => {
    if (value === undefined || value === null) return 'Любой';
    
    // Форматирование длительности в минуты
    if (key === 'duration') {
      return `${Math.floor(Number(value) / 60)} мин`;
    }
    
    // Перевод типов практик
    if (key === 'practice_type') {
      const practiceTypes: Record<string, string> = {
        'physical': 'Телесная',
        'breathing': 'Дыхательная',
        'meditation': 'Медитация',
        'short': 'Короткая'
      };
      return practiceTypes[value] || value;
    }
    
    // Перевод целей
    if (key === 'goal') {
      const goals: Record<string, string> = {
        'energize': 'Взбодриться',
        'relax': 'Расслабиться',
        'stretch': 'Растяжка',
        'focus': 'Концентрация',
        'sleep': 'Сон',
        'stress_relief': 'Снятие стресса'
      };
      return goals[value] || value;
    }
    
    // Перевод подходов
    if (key === 'approach') {
      const approaches: Record<string, string> = {
        'guided': 'С сопровождением',
        'self': 'Самостоятельная'
      };
      return approaches[value] || value;
    }
    
    return String(value);
  };
  
  // Функция для форматирования названий критериев
  const formatCriteriaKey = (key: string): string => {
    const keys: Record<string, string> = {
      'practice_type': 'Тип',
      'duration': 'Длительность',
      'goal': 'Цель',
      'approach': 'Подход'
    };
    return keys[key] || key;
  };
  
  return (
    <div className="criteria-popup">
      <div className="criteria-title">Текущие критерии:</div>
      {Object.entries(criteria).map(([key, value]) => (
        value !== undefined && (
          <div key={key} className="criteria-item">
            <span className="criteria-label">{formatCriteriaKey(key)}:</span>
            <span className="criteria-value">{formatCriteriaValue(key, value)}</span>
          </div>
        )
      ))}
    </div>
  );
};

// Компонент подбирает подходящий плеер в зависимости от типа контента
const PlayerSelector: React.FC = () => {
  const { state, setActiveType, setContentData } = usePlayer();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { contentId, meditationType, meditationObject } = useParams();

  // Получаем данные контента
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        
        if (!supabase) {
          throw new Error('Supabase клиент не инициализирован');
        }
        
        if (contentId) {
          // Запрос контента из Supabase
          const { data, error } = await supabase
            .from('contents')
            .select(`
              *,
              content_types(name, slug)
            `)
            .eq('id', contentId)
            .single();
            
          if (error) {
            throw error;
          }
          
          if (data) {
            setContent(data);
            setContentData(data);
            
            // Определяем тип плеера на основе типа контента
            if (data.content_types?.slug === 'video' || data.content_types?.slug === 'physical' || data.content_types?.slug === 'breathing') {
              setActiveType(PlayerType.VIDEO);
            } else if (data.content_types?.slug === 'audio' || data.content_types?.slug === 'meditation') {
              // Проверяем, если это медитация с таймером
              if (meditationType === 'self') {
                setActiveType(PlayerType.TIMER);
              } else {
                setActiveType(PlayerType.AUDIO);
              }
            } else {
              setActiveType(PlayerType.VIDEO); // По умолчанию видео
            }
          }
        } else if (meditationType === 'self') {
          // Для самостоятельных медитаций не нужен контент
          setActiveType(PlayerType.TIMER);
          setContent({
            title: 'Самостоятельная медитация',
            description: 'Сконцентрируйтесь на своем дыхании и следуйте инструкциям'
          });
          setContentData({
            title: 'Самостоятельная медитация',
            description: 'Сконцентрируйтесь на своем дыхании и следуйте инструкциям',
            duration: parseInt(meditationObject?.split('-')[1] || '600', 10)
          });
        } else {
          setError('Не указан ID контента');
        }
      } catch (err: any) {
        console.error('Ошибка загрузки контента:', err);
        setError(err.message || 'Ошибка загрузки контента');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [contentId, meditationType, meditationObject, setActiveType, setContentData]);

  // Обработка загрузки
  if (loading) {
    return <div className="player-loading">Загрузка практики...</div>;
  }

  // Обработка ошибок
  if (error) {
    return (
      <div className="player-error">
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="back-button">Вернуться назад</button>
      </div>
    );
  }

  // Выбор типа плеера
  const renderPlayer = () => {
    if (!content && state.activeType !== PlayerType.TIMER) {
      return <div className="player-error">Контент не найден</div>;
    }

    switch (state.activeType) {
      case PlayerType.VIDEO:
        return (
          <VideoPlayer
            videoId={content.kinescope_id}
            title={content.title}
            description={content.description}
          />
        );
      case PlayerType.AUDIO:
        return (
          <AudioPlayer
            audioUrl={content.audio_file_path}
            title={content.title}
            description={content.description}
          />
        );
      case PlayerType.TIMER:
        let duration = 600; // 10 минут по умолчанию
        let object = 'Дыхание';
        
        // Парсинг параметров самостоятельной медитации
        if (meditationObject) {
          const parts = meditationObject.split('-');
          if (parts.length >= 2) {
            object = parts[0];
            duration = parseInt(parts[1], 10);
          }
        }
        
        return (
          <TimerPlayer
            duration={duration}
            title="Самостоятельная медитация"
            meditationObject={object}
            instructions="Закройте глаза и сфокусируйтесь на выбранном объекте медитации"
          />
        );
      default:
        return <div className="player-error">Выберите тип практики</div>;
    }
  };

  // Функция для поделиться через Telegram
  const handleShare = () => {
    const shareText = `Попробуй эту практику: ${content?.title || 'Медитация'}`;
    openTelegramLink(`tg://msg_url?text=${encodeURIComponent(shareText)}`);
  };

  return (
    <div className="practice-content">
      {renderPlayer()}
      
      <div className="practice-actions">
        <button onClick={() => navigate(-1)} className="back-button">
          Вернуться к выбору
        </button>
        
        <button className="share-button" onClick={handleShare}>
          Поделиться
        </button>
      </div>
    </div>
  );
};

// Основной компонент страницы практики
const PracticePage: React.FC = () => {
  // Получаем initData из Telegram SDK
  const initDataState = useSignal(_initDataState);
  
  // Используем хук для работы с пользователем
  const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataState);
  const { state: quizState } = useQuiz();
  const navigate = useNavigate();
  
  const userId = supabaseUser?.id || '';
  const criteria = {
    practice_type: quizState.practiceType ? String(quizState.practiceType) : '',
    duration: quizState.duration ? Number(quizState.duration) : undefined,
    goal: quizState.goal ? String(quizState.goal) : undefined,
    approach: quizState.approach ? String(quizState.approach) : undefined,
  };
  
  const { practice, loading, error, refresh } = useRecommendedPractice(userId, criteria);
  const [showCriteria, setShowCriteria] = useState(false);

  if (userLoading) return <div className="player-loading">Загрузка данных пользователя...</div>;
  if (!supabaseUser?.id) return <div className="player-error">Ошибка: пользователь не найден</div>;
  if (!criteria.practice_type) return <div className="player-error">
    <p>Нет данных для подбора практики.</p>
    <button onClick={() => navigate('/')} className="back-button">Вернуться к выбору</button>
  </div>;
  if (loading) return <div className="player-loading">Загрузка практики...</div>;
  if (error) return <div className="player-error">
    <p>Ошибка: {error}</p>
    <button onClick={() => navigate('/')} className="back-button">Вернуться к выбору</button>
  </div>;
  if (!practice) return <div className="player-error">
    <p>Нет доступных практик по выбранным критериям.</p>
    <button onClick={() => navigate('/')} className="back-button">Вернуться к выбору</button>
  </div>;

  // Обновляем URL при получении новой практики
  const handleRefreshPractice = () => {
    refresh();
  };

  return (
    <PlayerProvider>
      <div className="practice-page">
        <PlayerSelector />
        
        {/* Добавляем кнопку для получения другой практики и иконку с критериями */}
        <div className="practice-actions">
          <button className="refresh-button" onClick={handleRefreshPractice}>
            <RefreshIcon />
            Другая практика
          </button>
          
          <button 
            className="criteria-button" 
            onClick={() => setShowCriteria(!showCriteria)}
            aria-label="Показать критерии"
          >
            <InfoIcon />
          </button>
          
          {/* Попап с критериями */}
          {showCriteria && (
            <>
              <div className="popup-backdrop" onClick={() => setShowCriteria(false)} />
              <CriteriaPopup criteria={criteria} />
            </>
          )}
        </div>
      </div>
    </PlayerProvider>
  );
};

export default PracticePage; 