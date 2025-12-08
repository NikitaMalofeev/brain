import React from 'react';

/**
 * Компонент загрузки с монеткой на ЧЁРНОМ фоне
 * Специально для страниц с тёмным фоном (аудиоплеер, техники)
 */
const DarkLoadingSpinner: React.FC<{ size?: number }> = ({ size = 128 }) => {
  console.log('🔴 DarkLoadingSpinner RENDER');

  // Принудительно ставим чёрный фон
  document.body.style.backgroundColor = '#000000';
  document.body.style.background = '#000000';
  const root = document.getElementById('root');
  if (root) {
    root.style.backgroundColor = '#000000';
    root.style.background = '#000000';
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <img
        src="/coin3.png"
        alt="Loading"
        style={{
          width: size,
          height: size,
          animation: 'darkSpinnerRotate 1.2s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes darkSpinnerRotate {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DarkLoadingSpinner;
