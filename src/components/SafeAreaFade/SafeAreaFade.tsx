import { FC } from 'react';
import './SafeAreaFade.css';

/**
 * Компонент создает градиентные фейды в верхней и нижней частях экрана
 * Располагается поверх всего контента с высоким z-index
 */
export const SafeAreaFade: FC = () => {
  return (
    <>
      <div className="safe-area-fade-top" />
      <div className="safe-area-fade-bottom" />
    </>
  );
}; 