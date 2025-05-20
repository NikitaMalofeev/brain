import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../../../contexts/QuizContext';
import { supabase } from '../../../lib/supabase/client';

// Структура контента из Supabase
interface ContentData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  content_type: { 
    name: string; 
    slug: string; 
  } | null;
}

interface QuizLogicItem {
  id: string;
  priority: number | null;
  content_id: string;
  contents: ContentData;
}

const QuizResultsStep: React.FC = () => {
  const { state } = useQuiz();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<ContentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const findRecommendation = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!supabase || !state.practiceType) {
          throw new Error('Отсутствуют необходимые параметры для поиска рекомендации');
        }

        // Строим запрос на основе выбранных параметров
        let query = supabase
          .from('quiz_logic')
          .select(`
            id,
            priority,
            content_id,
            contents:content_id (
              id,
              title,
              description,
              thumbnail_url,
              duration,
              content_type:content_types (
                name,
                slug
              )
            )
          `)
          .eq('practice_type', state.practiceType)
          .order('priority', { ascending: false });

        // Добавляем фильтры в зависимости от выбранных параметров
        if (state.duration) {
          query = query
            .gte('duration_max', state.duration.min)
            .lte('duration_min', state.duration.max);
        }

        if (state.goal) {
          query = query.eq('goal', state.goal);
        }

        if (state.approach) {
          query = query.eq('approach', state.approach);
        }

        // Получаем результаты
        const { data, error } = await query.limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
          // Если конкретные результаты не найдены, ищем менее специфичные
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('quiz_logic')
            .select(`
              id,
              priority,
              content_id,
              contents:content_id (
                id,
                title,
                description,
                thumbnail_url,
                duration,
                content_type:content_types (
                  name,
                  slug
                )
              )
            `)
            .eq('practice_type', state.practiceType)
            .order('priority', { ascending: false })
            .limit(5);
            
          if (fallbackError) throw fallbackError;
          
          if (!fallbackData || fallbackData.length === 0) {
            // Логируем параметры квиза для анализа дыр
            const quizParams = {
              practiceType: state.practiceType,
              duration: state.duration,
              goal: state.goal,
              approach: state.approach,
              selfMeditationSettings: state.selfMeditationSettings,
            };
            console.error('Нет подходящих практик для параметров:', quizParams);
            // TODO: отправлять эти данные в Supabase для сбора статистики дыр
            throw new Error('Не найдены подходящие практики для ваших параметров');
          }
          
          // Выбираем случайный элемент из подходящих
          const randomIndex = Math.floor(Math.random() * fallbackData.length);
          // @ts-ignore - Временно игнорируем проверку типов
          const selectedItem = fallbackData[randomIndex];
          // @ts-ignore - Временно игнорируем проверку типов
          setRecommendation(selectedItem.contents);
        } else {
          // Выбираем случайный элемент из топ-приоритетных результатов
          // Сначала группируем по priority
          const byPriority: Record<number, QuizLogicItem[]> = {};
          
          data.forEach((item: any) => {
            const priority = item.priority || 0;
            if (!byPriority[priority]) {
              byPriority[priority] = [];
            }
            byPriority[priority].push(item);
          });
          
          // Берем группу с самым высоким приоритетом
          const highestPriority = Math.max(...Object.keys(byPriority).map(Number));
          const topPriorityItems = byPriority[highestPriority];
          
          // Выбираем случайный элемент из топ-приоритетных
          const randomIndex = Math.floor(Math.random() * topPriorityItems.length);
          // @ts-ignore - Временно игнорируем проверку типов
          const selectedItem = topPriorityItems[randomIndex];
          // @ts-ignore - Временно игнорируем проверку типов
          setRecommendation(selectedItem.contents);
        }
      } catch (error: any) {
        console.error('Ошибка при поиске рекомендации:', error);
        setError(error.message || 'Ошибка при поиске рекомендации');
      } finally {
        setLoading(false);
      }
    };

    findRecommendation();
  }, [state.practiceType, state.duration, state.goal, state.approach]);

  const handleStartPractice = () => {
    if (recommendation) {
      // Для обычных практик переходим по ID контента
      if (state.practiceType !== 'meditation' || state.approach !== 'self') {
        navigate(`/practice/${recommendation.id}`);
      } else if (state.selfMeditationSettings) {
        // Для самостоятельных медитаций включаем объект и длительность в URL
        const { object, duration } = state.selfMeditationSettings;
        navigate(`/practice/meditation/self/${object}-${duration}`);
      }
    }
  };

  const handleRetakeQuiz = () => {
    navigate('/quiz');
  };

  // Форматирование длительности
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин`;
  };

  if (loading) {
    return (
      <div className="quiz-step-content">
        <div className="quiz-loading-results">
          <div className="quiz-loading-spinner"></div>
          <p>Подбираем идеальную практику для вас...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Показываем параметры квиза в UI если включён режим админа (например, localStorage.adminMode === 'true')
    let quizParams = null;
    try {
      quizParams = {
        practiceType: state.practiceType,
        duration: state.duration,
        goal: state.goal,
        approach: state.approach,
        selfMeditationSettings: state.selfMeditationSettings,
      };
    } catch {}
    const isAdmin = localStorage.getItem('adminMode') === 'true' || window.location.search.includes('admin=1');
    return (
      <div className="quiz-step-content">
        <div className="quiz-error">
          <h3>Произошла ошибка</h3>
          <p>{error}</p>
          <button className="quiz-retry-btn" onClick={handleRetakeQuiz}>
            Начать заново
          </button>
          {isAdmin && quizParams && (
            <div style={{ marginTop: 16, background: '#fff3cd', color: '#856404', padding: 12, borderRadius: 8, fontSize: 14 }}>
              <b>Параметры квиза:</b>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(quizParams, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-step-content">
      <h2 className="quiz-question">Вот ваша рекомендация</h2>
      <p className="quiz-description">На основе ваших ответов мы подобрали оптимальную практику</p>
      
      {recommendation && (
        <div className="quiz-recommendation">
          {recommendation.thumbnail_url && (
            <div className="recommendation-image">
              <img src={recommendation.thumbnail_url} alt={recommendation.title} />
            </div>
          )}
          
          <div className="recommendation-details">
            <h3 className="recommendation-title">{recommendation.title}</h3>
            <div className="recommendation-meta">
              <span className="recommendation-type">
                {recommendation.content_type?.name || 'Практика'}
              </span>
              <span className="recommendation-duration">
                {recommendation.duration ? formatDuration(recommendation.duration) : ''}
              </span>
            </div>
            {recommendation.description && (
              <p className="recommendation-description">{recommendation.description}</p>
            )}
          </div>
          
          <div className="recommendation-actions">
            <button className="quiz-start-btn" onClick={handleStartPractice}>
              Начать практику
            </button>
            <button className="quiz-retry-btn" onClick={handleRetakeQuiz}>
              Подобрать другую
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizResultsStep; 