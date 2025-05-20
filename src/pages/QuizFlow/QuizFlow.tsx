import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { QuizProvider, useQuiz } from '@/contexts/QuizContext';
import './QuizFlow.css';

// Импортируем созданные компоненты для шагов
import QuizTypeStep from './components/QuizTypeStep';
import QuizDurationStep from './components/QuizDurationStep';
import QuizGoalStep from './components/QuizGoalStep';
import QuizApproachStep from './components/QuizApproachStep';
import QuizMeditationObjectStep from './components/QuizMeditationObjectStep';
import QuizResultsStep from './components/QuizResultsStep';

// Компонент для отображения прогресса квиза
const QuizProgress: React.FC<{ currentStep: number, maxStep: number }> = ({ currentStep, maxStep }) => {
  return (
    <div className="quiz-progress">
      {Array.from({ length: maxStep + 1 }).map((_, index) => (
        <div 
          key={index} 
          className={`quiz-progress-step ${index < currentStep ? 'completed' : index === currentStep ? 'active' : ''}`}
        />
      ))}
    </div>
  );
};

// Основной компонент с навигацией между шагами
const QuizFlowContent: React.FC = () => {
  const { state, goBack, resetQuiz } = useQuiz();
  const navigate = useNavigate();

  // Обработчик кнопки назад
  const handleBack = () => {
    if (state.step === 0) {
      navigate('/');
    } else {
      goBack();
    }
  };

  // Функция для получения заголовка текущего шага
  const getStepTitle = () => {
    return `${state.step + 1}/${state.maxStep + 1}`;
  };

  // Определение компонента для текущего шага
  const renderStepComponent = () => {
    switch (state.step) {
      case 0:
        return <QuizTypeStep />;
      case 1:
        if (state.practiceType === 'short' || state.practiceType === 'breathing') {
          return <QuizGoalStep />;
        } else if (state.practiceType === 'physical') {
          return <QuizDurationStep />;
        } else if (state.practiceType === 'meditation') {
          return <QuizApproachStep />;
        }
        break;
      case 2:
        if (state.practiceType === 'short' || state.practiceType === 'breathing') {
          return <QuizResultsStep />;
        } else if (state.practiceType === 'physical') {
          return <QuizGoalStep />;
        } else if (state.practiceType === 'meditation') {
          if (state.approach === 'self') {
            return <QuizMeditationObjectStep />;
          } else if (state.approach === 'guided') {
            return <QuizGoalStep />;
          }
        }
        break;
      case 3:
        if (state.practiceType === 'physical' || 
            (state.practiceType === 'meditation' && state.approach === 'guided')) {
          return <QuizResultsStep />;
        } else if (state.practiceType === 'meditation' && state.approach === 'self') {
          return <QuizResultsStep />;
        }
        break;
      case 4:
        return <QuizResultsStep />;
      default:
        // Если что-то пошло не так, показываем стартовый экран
        resetQuiz();
        return <QuizTypeStep />;
    }
  };

  return (
    <div className="quiz-container">
      <QuizProgress currentStep={state.step} maxStep={state.maxStep} />
      
      <div className="quiz-content">
        <div className="quiz-header">
          <button className="quiz-back-button" onClick={handleBack}>
            ←
          </button>
          <div className="quiz-step">
            {getStepTitle()}
          </div>
        </div>
        
        {renderStepComponent()}
      </div>
      
      <div className="quiz-info">
        <p>На основе ваших ответов мы подберем индивидуальную практику, наиболее подходящую для ваших целей и уровня опыта.</p>
      </div>
    </div>
  );
};

// Главный компонент с провайдером контекста
export const QuizFlow: React.FC = () => {
  return (
    <Page>
      <QuizProvider>
        <QuizFlowContent />
      </QuizProvider>
    </Page>
  );
}; 