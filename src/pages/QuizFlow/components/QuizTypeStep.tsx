import React from 'react';
import { useQuiz, PracticeType } from '../../../contexts/QuizContext';
import { useQuizStepsRealtime } from '../../../contexts/QuizContext';

const QuizTypeStep: React.FC = () => {
  const { state, setPracticeType } = useQuiz();
  const { steps, loading } = useQuizStepsRealtime();

  // Находим шаг с type === 'practice_type'
  const practiceTypeStep = steps.find((step) => step.type === 'practice_type');
  const options = practiceTypeStep?.answers || [];

  // Обработчик выбора типа практики
  const handleSelectType = (type: string) => {
    setPracticeType(type as PracticeType);
    // Переход к следующему шагу происходит в QuizFlow по изменению state.practiceType
  };

  return (
    <div className="quiz-step-content">
      <h2 className="quiz-question">Какой тип практики вы хотите?</h2>
      <p className="quiz-description">Выберите наиболее подходящий для вас тип</p>
      <div className="quiz-options-list">
        {loading ? (
          <div className="quiz-option-placeholder">Загрузка...</div>
        ) : options.length === 0 ? (
          <div className="quiz-option-placeholder">Нет доступных типов практик</div>
        ) : (
          options
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((option) => (
              <button
                key={option.value}
                className={`quiz-option${state.practiceType === option.value ? ' selected' : ''}`}
                onClick={() => handleSelectType(option.value)}
              >
                {option.label}
              </button>
            ))
        )}
      </div>
    </div>
  );
};

export default QuizTypeStep; 