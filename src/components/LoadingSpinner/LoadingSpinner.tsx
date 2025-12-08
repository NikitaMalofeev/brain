import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: number;
  variant?: 'light' | 'dark';
}

/**
 * Компонент загрузки с вращающейся монеткой
 * @param size - размер монетки (по умолчанию 128)
 * @param variant - тема: 'light' (белый фон) или 'dark' (тёмный фон)
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 128, variant = 'light' }) => {
  return (
    <div className={`loading-spinner loading-spinner--${variant}`}>
      <img
        src="/coin3.png"
        alt="Loading"
        className="loading-spinner-coin"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default LoadingSpinner;
