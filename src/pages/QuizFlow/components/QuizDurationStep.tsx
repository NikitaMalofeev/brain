import React from 'react';
import { useQuiz } from '../../../contexts/QuizContext';
import { useQuizStepsRealtime } from '../../../contexts/QuizContext';

const QuizDurationStep: React.FC = () => {
  const { state, setDuration } = useQuiz();
  const { steps, loading } = useQuizStepsRealtime();

  // Находим шаг с type === 'duration' (и, если нужно, practiceType)
  const durationStep = steps.find((step) => step.type === 'duration');
  const options = durationStep?.answers || [];

  // Обработчик выбора длительности
  const handleSelectDuration = (value: string) => {
    // value ожидается в формате '300-600' (секунды)
    const [min, max] = value.split('-').map(Number);
    setDuration({ min, max });
  };

  // Получение названия типа практики для отображения
  const getPracticeTypeName = () => {
    switch (state.practiceType) {
      case 'short': return 'короткой практики';
      case 'physical': return 'телесной практики';
      case 'breathing': return 'дыхательной практики';
      case 'meditation': return 'медитации';
      default: return 'практики';
    }
  };

  return (
    <div className="quiz-step-content">
      <h2 className="quiz-question">{durationStep?.title || 'Какая длительность подходит для вас?'}</h2>
      <p className="quiz-description">Выберите комфортную длительность {getPracticeTypeName()}</p>
      <div className="quiz-options">
        {loading ? (
          <div className="quiz-loading">Загрузка вариантов длительности...</div>
        ) : options.length > 0 ? (
          options.map((option) => {
            const [min, max] = option.value.split('-').map(Number);
            const selected = state.duration?.min === min && state.duration?.max === max;
            return (
              <button
                key={option.id}
                className={`quiz-option ${selected ? 'selected' : ''}`}
                onClick={() => handleSelectDuration(option.value)}
              >
                {option.icon && <span className="option-icon">{option.icon}</span>}
                <div className="option-content">
                  <span className="option-text">{option.label}</span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="quiz-empty">Нет доступных вариантов длительности для этого типа практики</div>
        )}
      </div>
    </div>
  );
};

export default QuizDurationStep; 