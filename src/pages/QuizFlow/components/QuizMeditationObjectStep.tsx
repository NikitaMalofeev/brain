import React, { useState } from 'react';
import { useQuiz } from '../../../contexts/QuizContext';
import { useQuizStepsRealtime } from '../../../contexts/QuizContext';

const QuizMeditationObjectStep: React.FC = () => {
  const { state, setSelfMeditationSettings } = useQuiz();
  const { steps, loading } = useQuizStepsRealtime();

  // Варианты объектов концентрации
  const objectStep = steps.find((step) => step.type === 'object');
  const objectOptions = objectStep?.answers || [];

  // Варианты длительности (например, отдельный шаг type === 'self_duration')
  const durationStep = steps.find((step) => step.type === 'self_duration');
  const durationOptions = durationStep?.answers || [];

  const [selectedObject, setSelectedObject] = useState<string | undefined>(state.selfMeditationSettings?.object);
  const [selectedDuration, setSelectedDuration] = useState<number>(state.selfMeditationSettings?.duration || 600);

  const handleSelectObject = (object: string) => {
    setSelectedObject(object);
  };

  const handleSelectDuration = (value: string) => {
    setSelectedDuration(Number(value));
  };

  const handleContinue = () => {
    if (selectedObject) {
      setSelfMeditationSettings({
        object: selectedObject as any,
        duration: selectedDuration
      });
    }
  };

  return (
    <div className="quiz-step-content">
      <h2 className="quiz-question">{objectStep?.title || 'На чем фокусироваться во время медитации?'}</h2>
      <p className="quiz-description">Выберите объект концентрации и длительность</p>
      <div className="quiz-section">
        <h3 className="quiz-section-title">Объект концентрации:</h3>
        <div className="quiz-options">
          {loading ? (
            <div className="quiz-loading">Загрузка объектов...</div>
          ) : objectOptions.length > 0 ? (
            objectOptions.map((option) => (
              <button
                key={option.value}
                className={`quiz-option ${selectedObject === option.value ? 'selected' : ''}`}
                onClick={() => handleSelectObject(option.value)}
              >
                {option.icon && <span className="option-icon">{option.icon}</span>}
                <div className="option-content">
                  <span className="option-text">{option.label}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="quiz-empty">Нет доступных объектов концентрации</div>
          )}
        </div>
      </div>
      <div className="quiz-section">
        <h3 className="quiz-section-title">Длительность медитации:</h3>
        <div className="quiz-duration-options">
          {loading ? (
            <div className="quiz-loading">Загрузка длительностей...</div>
          ) : durationOptions.length > 0 ? (
            durationOptions.map((option) => (
              <button
                key={option.value}
                className={`quiz-duration-option ${selectedDuration === Number(option.value) ? 'selected' : ''}`}
                onClick={() => handleSelectDuration(option.value)}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="quiz-empty">Нет доступных вариантов длительности</div>
          )}
        </div>
      </div>
      <div className="quiz-action">
        <button
          className="quiz-continue-btn"
          onClick={handleContinue}
          disabled={!selectedObject}
        >
          Подтвердить выбор
        </button>
      </div>
    </div>
  );
};

export default QuizMeditationObjectStep; 