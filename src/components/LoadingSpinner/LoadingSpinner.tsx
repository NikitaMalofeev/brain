import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: number;
}

/**
 * Компонент загрузки с вращающейся монеткой на белом фоне
 * Для тёмного фона используй DarkLoadingSpinner
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 128 }) => {
  return (
    <div className="loading-spinner">
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
