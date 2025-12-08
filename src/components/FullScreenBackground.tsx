import React, { useLayoutEffect } from 'react';

interface FullScreenBackgroundProps {
  image: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Компонент с фоном на весь экран.
 * Добавляет класс на body для применения фона.
 */
export const FullScreenBackground: React.FC<FullScreenBackgroundProps> = ({
  image,
  className = 'bg-stage',
  children
}) => {
  useLayoutEffect(() => {
    document.body.classList.add(className);

    return () => {
      document.body.classList.remove(className);
    };
  }, [className]);

  return <>{children}</>;
};
