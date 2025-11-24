import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Stage {
  stage_id: number;
  stage_name: string;
  stage_order_num?: number;
  is_unlocked: boolean;
  total_lessons: number;
  completed_lessons: number;
  unlocked_lessons?: number;
}

interface RoadMapProps {
  stages: Stage[];
  onStageClick?: (stageId: number) => void;
  isGuest?: boolean;
  onGuestBlock?: () => void;
  userPhotoUrl?: string;
  currentWeek?: number;
  totalWeeks?: number;
  onClose?: () => void;
}

/**
 * Компонент дорожной карты обучения
 * Визуализация пути обучения с модулями
 */
const RoadMap: React.FC<RoadMapProps> = ({
  stages,
  onStageClick,
  isGuest = false,
  onGuestBlock,
  userPhotoUrl,
  currentWeek = 1,
  totalWeeks = 9,
  onClose
}) => {
  // Определить текущий активный этап (первый незавершенный разблокированный)
  const currentStageIndex = stages.findIndex(
    (stage) =>
      stage.is_unlocked && stage.completed_lessons < stage.total_lessons
  );

  const getStageStatus = (stage: Stage, index: number) => {
    if (isGuest) {
      return 'locked';
    }

    if (!stage.is_unlocked) {
      return 'locked';
    }

    if (stage.completed_lessons === stage.total_lessons && stage.total_lessons > 0) {
      return 'completed';
    }

    if (index === currentStageIndex) {
      return 'current';
    }

    if (index < currentStageIndex || (currentStageIndex === -1 && stage.is_unlocked)) {
      return 'available';
    }

    return 'locked';
  };

  // Рассчитать прогресс круга (по открытым урокам)
  const getProgressPercentage = (stage: Stage) => {
    const unlockedLessons = stage.unlocked_lessons ?? stage.completed_lessons;
    if (stage.total_lessons === 0) return 0;
    return (unlockedLessons / stage.total_lessons) * 100;
  };

  // Рассчитать количество дней для модуля (примерно 21 день на модуль)
  const getDaysForModule = (index: number) => {
    // Базовые дни для каждого модуля
    const baseDays = [21, 14, 7, 21];
    return baseDays[index % baseDays.length];
  };

  // Прогресс недель
  const weekProgress = totalWeeks > 0 ? (currentWeek / totalWeeks) * 100 : 0;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-hidden">
      {/* Фоновая дорога */}
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 400 900"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Основная дорога */}
          <path
            d="M 200 50
               Q 320 150 280 250
               Q 240 350 300 450
               Q 360 550 280 650
               Q 200 750 250 850"
            fill="none"
            stroke="rgba(150, 200, 255, 0.3)"
            strokeWidth="60"
            strokeLinecap="round"
          />
          {/* Светящаяся центральная линия */}
          <path
            d="M 200 50
               Q 320 150 280 250
               Q 240 350 300 450
               Q 360 550 280 650
               Q 200 750 250 850"
            fill="none"
            stroke="rgba(180, 220, 255, 0.5)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Яркая центральная линия */}
          <path
            d="M 200 50
               Q 320 150 280 250
               Q 240 350 300 450
               Q 360 550 280 650
               Q 200 750 250 850"
            fill="none"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Контент */}
      <div className="relative z-10 p-4 pt-6">
        {/* Кнопка закрытия */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 flex items-center gap-2 bg-gray-800/80 text-white px-3 py-2 rounded-full text-sm"
          >
            <X className="w-4 h-4" />
            Закрыть
          </button>
        )}

        {/* Прогресс недель */}
        <div className="mt-16 mb-8 px-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Обучение</span>
            <span className="text-sm font-medium text-gray-800">
              Неделя {currentWeek} / {totalWeeks}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weekProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-blue-400 rounded-full"
            />
          </div>
        </div>

        {/* Модули */}
        <div className="relative space-y-8 pb-20">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage, index);
            const isLocked = status === 'locked';
            const isCurrent = status === 'current';
            const progressPercent = getProgressPercentage(stage);
            const days = getDaysForModule(index);

            // Позиция карточки (чередование лево/право)
            const isLeft = index % 2 === 0;

            return (
              <motion.div
                key={stage.stage_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={clsx(
                  'relative flex',
                  isLeft ? 'justify-start' : 'justify-end'
                )}
              >
                {/* Карточка модуля */}
                <div
                  className={clsx(
                    'relative flex items-center gap-3 bg-white rounded-2xl shadow-lg p-3 pr-4 max-w-[280px] cursor-pointer transition-all',
                    isLocked && 'opacity-50',
                    isCurrent && 'ring-2 ring-blue-400'
                  )}
                  onClick={() => {
                    if (isGuest) {
                      onGuestBlock?.();
                      return;
                    }
                    if (!isLocked && onStageClick) {
                      onStageClick(stage.stage_id);
                    }
                  }}
                >
                  {/* Аватар пользователя для текущего модуля */}
                  {isCurrent && userPhotoUrl && (
                    <div className="absolute -left-10 top-1/2 -translate-y-1/2">
                      <img
                        src={userPhotoUrl}
                        alt="Вы"
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                      />
                    </div>
                  )}

                  {/* Контент карточки */}
                  <div className="flex-1 min-w-0">
                    <h3 className={clsx(
                      'font-semibold text-sm truncate',
                      isLocked ? 'text-gray-400' : 'text-gray-900'
                    )}>
                      {stage.stage_name}
                    </h3>
                    <p className={clsx(
                      'text-xs',
                      isLocked ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      {stage.total_lessons} уроков
                    </p>
                  </div>

                  {/* Круг прогресса */}
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-full h-full -rotate-90">
                      {/* Фон круга */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke={isLocked ? '#e5e7eb' : '#f3f4f6'}
                        strokeWidth="4"
                      />
                      {/* Прогресс */}
                      {!isLocked && (
                        <motion.circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth="4"
                          strokeLinecap="round"
                          initial={{ strokeDashoffset: 126 }}
                          animate={{
                            strokeDashoffset: 126 - (126 * progressPercent) / 100
                          }}
                          transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                          strokeDasharray="126"
                        />
                      )}
                    </svg>
                    {/* Текст дней */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={clsx(
                        'text-sm font-bold leading-none',
                        isLocked ? 'text-gray-400' : 'text-gray-800'
                      )}>
                        {days}
                      </span>
                      <span className={clsx(
                        'text-[8px]',
                        isLocked ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Маркер на дороге */}
                <div
                  className={clsx(
                    'absolute top-1/2 -translate-y-1/2',
                    isLeft ? 'right-[30%]' : 'left-[30%]'
                  )}
                >
                  <MapPin
                    className={clsx(
                      'w-5 h-5',
                      isLocked ? 'text-gray-300' : 'text-blue-400'
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoadMap;
