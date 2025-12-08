import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import DarkLoadingSpinner from '@/components/DarkLoadingSpinner/DarkLoadingSpinner';

/**
 * Умный спиннер - показывает тёмный для аудио-страниц, белый для остальных
 */
const SmartLoadingSpinner: React.FC = () => {
  // Проверяем текущий URL
  const path = window.location.hash.replace('#', '') || window.location.pathname;

  // Для аудио-страниц показываем тёмный спиннер
  const isAudioPage = path.includes('/techniques/') || path.includes('/audio-player');

  if (isAudioPage) {
    return <DarkLoadingSpinner />;
  }

  return <LoadingSpinner />;
};

export default SmartLoadingSpinner;
