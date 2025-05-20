import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase/client';

// Типы шагов и опций (копируем из QuizContext)
export interface QuizStep {
  id: string;
  order: number;
  title: string;
  type: string;
  is_active: boolean;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  value: string;
  label: string;
  order: number;
  icon?: string;
}

interface QuizDataContextType {
  steps: QuizStep[];
  loading: boolean;
}

const QuizDataContext = createContext<QuizDataContextType | undefined>(undefined);

export const QuizDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [steps, setSteps] = useState<QuizStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stepsSub: any = null;
    let answersSub: any = null;
    let mounted = true;

    async function fetchAll() {
      if (!supabase) return;
      setLoading(true);
      // 1. Грузим шаги
      const { data: stepsData, error: stepsError } = await supabase
        .from('quiz_steps')
        .select('*')
        .order('order');
      if (stepsError) {
        setLoading(false);
        return;
      }
      // 2. Грузим все варианты
      const { data: answersData, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .order('order');
      if (answersError) {
        setLoading(false);
        return;
      }
      // 3. Собираем структуру
      const stepsWithAnswers = (stepsData || []).map((step: any) => ({
        ...step,
        answers: (answersData || []).filter((a: any) => a.question_id === step.id),
      }));
      if (mounted) setSteps(stepsWithAnswers);
      setLoading(false);
    }

    if (!supabase) return;
    fetchAll();

    // Подписка на шаги
    if (supabase) {
      stepsSub = supabase
        .channel('quiz_steps_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_steps' }, fetchAll)
        .subscribe();
      // Подписка на варианты
      answersSub = supabase
        .channel('quiz_answers_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_answers' }, fetchAll)
        .subscribe();
    }

    return () => {
      mounted = false;
      if (stepsSub) stepsSub.unsubscribe();
      if (answersSub) answersSub.unsubscribe();
    };
  }, []);

  return (
    <QuizDataContext.Provider value={{ steps, loading }}>
      {children}
    </QuizDataContext.Provider>
  );
};

export function useQuizData() {
  const context = useContext(QuizDataContext);
  if (context === undefined) {
    throw new Error('useQuizData must be used within a QuizDataProvider');
  }
  return context;
} 