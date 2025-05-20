import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../client';

export interface PracticeCriteria {
  practice_type: string;
  duration?: number;
  goal?: string;
  approach?: string;
}

export function useRecommendedPractice(userId: string, criteria: PracticeCriteria) {
  const [practice, setPractice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPractice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Supabase client не инициализирован');
      // 1. Получаем все content_id, которые уже были рекомендованы
      const { data: recommended, error: recError } = await supabase
        .from('user_recommended_contents')
        .select('content_id')
        .eq('user_id', userId);
      if (recError) throw recError;
      const recommendedIds = recommended?.map((r: any) => r.content_id) || [];

      // 2. Получаем content_id из quiz_logic по критериям
      let query = supabase
        .from('quiz_logic')
        .select('content_id')
        .eq('practice_type', criteria.practice_type);
      if (criteria.goal) query = query.eq('goal', criteria.goal);
      if (criteria.approach) query = query.eq('approach', criteria.approach);
      if (criteria.duration) query = query.gte('duration_min', criteria.duration).lte('duration_max', criteria.duration);
      const { data: logic, error: logicError } = await query;
      if (logicError) throw logicError;
      const logicIds = logic?.map((l: any) => l.content_id) || [];

      // 3. Исключаем уже рекомендованные
      const availableIds = logicIds.filter((id: string) => !recommendedIds.includes(id));
      if (availableIds.length === 0) {
        setPractice(null);
        setLoading(false);
        return;
      }
      // 4. Получаем случайную практику из contents
      const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
      if (!supabase) throw new Error('Supabase client не инициализирован');
      const { data: contents, error: contError } = await supabase
        .from('contents')
        .select('*')
        .eq('id', randomId)
        .single();
      if (contError) throw contError;
      setPractice(contents);

      // 5. Записываем в user_recommended_contents
      if (!supabase) throw new Error('Supabase client не инициализирован');
      await supabase.from('user_recommended_contents').insert({
        user_id: userId,
        content_id: randomId,
        practice_type: criteria.practice_type,
        duration: criteria.duration,
        goal: criteria.goal,
        approach: criteria.approach,
      });
    } catch (e: any) {
      setError(e.message || 'Ошибка получения практики');
    } finally {
      setLoading(false);
    }
  }, [userId, criteria]);

  useEffect(() => {
    if (userId && criteria.practice_type) {
      fetchPractice();
    }
  }, [userId, criteria, fetchPractice]);

  return { practice, loading, error, refresh: fetchPractice };
} 