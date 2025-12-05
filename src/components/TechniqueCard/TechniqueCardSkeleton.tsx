import React from 'react';

/**
 * Скелетон карточки техники для отображения во время загрузки
 * Соответствует структуре TechniqueCard: обложка 60x60, название, кнопка 44x44
 */
const TechniqueCardSkeleton: React.FC = () => {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3 relative"
      style={{
        background: '#FFFFFF33',
        height: 84,
      }}
    >
      {/* Обложка - скелетон 60x60 с rounded-xl */}
      <div
        className="w-[60px] h-[60px] rounded-xl flex-shrink-0 animate-pulse"
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
        }}
      />

      {/* Контент - название */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Название - скелетон */}
        <div
          className="h-[16px] w-[60%] rounded-md animate-pulse"
          style={{ background: 'rgba(255, 255, 255, 0.2)' }}
        />
        {/* Описание - скелетон */}
        <div
          className="h-[14px] w-[80%] rounded-md animate-pulse"
          style={{ background: 'rgba(255, 255, 255, 0.15)' }}
        />
      </div>

      {/* Кнопка Play - скелетон 44x44 круглая */}
      <div className="absolute top-3 right-3">
        <div
          className="w-[44px] h-[44px] rounded-full animate-pulse"
          style={{ background: 'rgba(255, 255, 255, 0.15)' }}
        />
      </div>
    </div>
  );
};

/**
 * Группа скелетонов с заголовком секции
 */
export const TechniqueSkeletonGroup: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div>
      {/* Заголовок секции - скелетон */}
      <div
        className="h-[20px] w-[80px] rounded-md mb-3 animate-pulse"
        style={{ background: 'rgba(255, 255, 255, 0.2)' }}
      />
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, index) => (
          <TechniqueCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};

export default TechniqueCardSkeleton;
