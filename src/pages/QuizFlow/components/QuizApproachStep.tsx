import React from 'react';
import { useQuiz } from '../../../contexts/QuizContext';
import { useQuizStepsRealtime } from '../../../contexts/QuizContext';

const QuizApproachStep: React.FC = () => {
  const { state, setApproach } = useQuiz();
  const { steps, loading } = useQuizStepsRealtime();

  // Находим шаг с type === 'approach'
  const approachStep = steps.find((step) => step.type === 'approach');
  const options = approachStep?.answers || [];

  const handleSelectApproach = (approach: string) => {
    setApproach(approach as any); // Приводим к MeditationApproach, если нужно
  };

  return (
    <div className="quiz-step-content">
      <h2 className="quiz-question">{approachStep?.title || 'Какой формат медитации предпочитаете?'}</h2>
      <p className="quiz-description">Выберите наиболее комфортный для вас подход</p>
      <div className="quiz-options">
        {loading ? (
          <div className="quiz-loading">Загрузка вариантов подхода...</div>
        ) : options.length > 0 ? (
          options.map((option) => (
            <button
              key={option.value}
              className={`quiz-option ${state.approach === option.value ? 'selected' : ''}`}
              onClick={() => handleSelectApproach(option.value)}
            >
              {option.icon && <span className="option-icon">{option.icon}</span>}
              <div className="option-content">
                <span className="option-text">{option.label}</span>
                {/* {option.description && <span className="option-description">{option.description}</span>} */}
              </div>
            </button>
          ))
        ) : (
          <div className="quiz-empty">Нет доступных вариантов подхода</div>
        )}
      </div>
      <div className="quiz-info">
        <p>
          Самостоятельные медитации идут с таймером и инструкциями.
          Для медитации с голосовым сопровождением выберите "С сопровождением".
        </p>
      </div>
    </div>
  );
};

export default QuizApproachStep; 