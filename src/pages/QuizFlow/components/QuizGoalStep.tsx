import React from 'react';
import { useQuiz } from '../../../contexts/QuizContext';
import { useQuizStepsRealtime } from '../../../contexts/QuizContext';

const QuizGoalStep: React.FC = () => {
  const { state, setGoal } = useQuiz();
  const { steps, loading } = useQuizStepsRealtime();

  // Находим шаг с type === 'goal'
  const goalStep = steps.find((step) => step.type === 'goal');
  const options = goalStep?.answers || [];

  const handleSelectGoal = (goal: string) => {
    setGoal(goal as any); // Приводим к PracticeGoal, если нужно
  };

  // Получение названия для заголовка в зависимости от типа практики
  const getQuestionText = () => {
    switch (state.practiceType) {
      case 'short': return 'Какая ваша цель сейчас?';
      case 'physical': return 'На какую часть тела сфокусироваться?';
      case 'breathing': return 'Какой результат вы хотите?';
      case 'meditation': return 'На чем сфокусировать практику?';
      default: return 'Какая ваша цель?';
    }
  };

  return (
    <div className="quiz-step-content">
      <h2 className="quiz-question">{goalStep?.title || getQuestionText()}</h2>
      <p className="quiz-description">Выберите наиболее важную для вас цель</p>
      <div className="quiz-options">
        {loading ? (
          <div className="quiz-loading">Загрузка вариантов целей...</div>
        ) : options.length > 0 ? (
          options.map((option) => (
            <button
              key={option.value}
              className={`quiz-option ${state.goal === option.value ? 'selected' : ''}`}
              onClick={() => handleSelectGoal(option.value)}
            >
              {option.icon && <span className="option-icon">{option.icon}</span>}
              <div className="option-content">
                <span className="option-text">{option.label}</span>
                {/* {option.description && <span className="option-description">{option.description}</span>} */}
              </div>
            </button>
          ))
        ) : (
          <div className="quiz-empty">Нет доступных вариантов целей для выбранных параметров</div>
        )}
      </div>
    </div>
  );
};

export default QuizGoalStep; 