import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import roadmapBg from '@/shared/assets/images/roadmap.png';
import roadmapUserMark from '@/shared/assets/icons/roadmapUserMark.svg';
import roadmapDarkMark from '@/shared/assets/icons/roadmapDarkMark.svg';
import roadmapWhiteMark from '@/shared/assets/icons/roadmapWhiteMark.svg';
import { getNounPluralForm } from '@/helpers/pluralize';

// Базовые размеры экрана для которых заданы координаты дороги
const BASE_WIDTH = 400;
const BASE_HEIGHT = 610;

// Координаты точек на дороге (x, y в пикселях для базового размера 400x610)
// y отсчитывается снизу вверх (0 = низ контейнера)
// lineWidth - длина пунктирной линии в пикселях
const ROAD_POINTS = [
  { x: 200, y: 60, lineWidth: 60 },    // Модуль 0 - первый (снизу)
  { x: 202, y: 170, lineWidth: 50 },   // Модуль 1 - второй
  { x: 200, y: 285, lineWidth: 40 },   // Модуль 2 - предпоследний -10px, линия -20px
  { x: 200, y: 360, lineWidth: 20 },   // Модуль 3 - последний (сверху) -40px
];

interface Stage {
  stage_id: number;
  stage_name: string;
  stage_order_num?: number;
  is_unlocked: boolean;
  total_lessons: number;
  completed_lessons: number;
  unlocked_lessons?: number;
  unlock_day?: number;
  module_id?: string;
}

interface RoadMapProps {
  stages: Stage[];
  onStageClick?: (stageId: number, moduleId?: string) => void;
  isGuest?: boolean;
  onGuestBlock?: () => void;
  userPhotoUrl?: string;
  currentWeek?: number;
  totalWeeks?: number;
  streamStartDate?: string;
  /** Задержка перед началом анимации карточек (для ожидания анимации popup) */
  animationDelay?: number;
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
  streamStartDate,
  animationDelay = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

  // Отслеживаем размер контейнера
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Функция для расчёта позиции маркера на дороге
  const getMarkerPosition = useCallback((index: number) => {
    // Если индекс выходит за границы массива точек, интерполируем
    const pointIndex = Math.min(index, ROAD_POINTS.length - 1);
    const point = ROAD_POINTS[pointIndex] || ROAD_POINTS[ROAD_POINTS.length - 1];

    // Масштабируем координаты пропорционально текущему размеру контейнера
    const scaleX = containerSize.width / BASE_WIDTH;
    const scaleY = containerSize.height / BASE_HEIGHT;

    return {
      x: point.x * scaleX,
      y: point.y * scaleY,
      lineWidth: point.lineWidth || 50,
    };
  }, [containerSize]);

  // Рассчитываем сколько дней прошло с начала потока
  const getDaysSinceStreamStart = () => {
    if (!streamStartDate) return 0;
    // ВАЖНО: парсим дату как локальную, добавляя T00:00:00 чтобы избежать UTC сдвига
    const startDate = new Date(streamStartDate + 'T00:00:00');
    const now = new Date();
    // Сравниваем только даты без времени
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = today.getTime() - startDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysSinceStart = getDaysSinceStreamStart();

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

  // Сортируем модули по unlock_day для правильного расчёта длительности
  const sortedStages = [...stages].sort((a, b) => (a.unlock_day || 0) - (b.unlock_day || 0));

  // Рассчитать количество дней для модуля
  const getDaysForModule = (index: number) => {
    const sortedIndex = sortedStages.findIndex(s => s.stage_id === stages[index]?.stage_id);
    if (sortedIndex === -1) return 20;

    const currentUnlockDay = sortedStages[sortedIndex]?.unlock_day || 0;
    const nextUnlockDay = sortedStages[sortedIndex + 1]?.unlock_day;

    if (nextUnlockDay !== undefined) {
      return nextUnlockDay - currentUnlockDay;
    }

    return 20;
  };

  // Общее количество дней обучения
  const calculateTotalDays = () => {
    if (stages.length === 0) return 0;

    const lastModule = sortedStages[sortedStages.length - 1];
    const lastModuleIndex = stages.findIndex(s => s.stage_id === lastModule.stage_id);
    const lastModuleDuration = getDaysForModule(lastModuleIndex);

    return (lastModule.unlock_day || 0) + lastModuleDuration;
  };

  const totalDays = calculateTotalDays();
  const calculatedTotalWeeks = Math.ceil(totalDays / 7) || totalWeeks;
  const weekProgress = calculatedTotalWeeks > 0 ? (currentWeek / calculatedTotalWeeks) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        backgroundImage: `url(${roadmapBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: 32,
        marginTop: 0,
        minHeight: '100%',
        height: '100%',
      }}
    >

      {/* Контент */}
      <div className="relative z-10 flex flex-col" style={{ minHeight: '100%' }}>

        {/* Прогресс недель */}
        <div style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 58, marginBottom: 32 }}>
          <div className="flex items-center justify-between mb-2">
            <span
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 400,
                fontSize: 12,
                lineHeight: '100%',
                color: '#222222',
              }}
            >
              Неделя
            </span>
            <span
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 400,
                fontSize: 13,
                lineHeight: '100%',
                color: '#222222',
              }}
            >
              {currentWeek} / {calculatedTotalWeeks}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 100,
              background: '#0000004D',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weekProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: '#FFFFFF',
                borderRadius: 100,
              }}
            />
          </div>
        </div>

        {/* Модули - абсолютное позиционирование относительно контейнера */}
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {stages.map((stage, index) => {
            const status = getStageStatus(stage, index);
            const isLocked = status === 'locked';
            const isCurrent = status === 'current';
            const isActive = !isLocked;
            const moduleDuration = getDaysForModule(index);

            const moduleUnlockDay = stage.unlock_day || 0;
            // unlock_day - это 0-indexed offset (0 = сразу доступен в день старта)
            // daysSinceStart тоже с 0 (0 = день старта)
            // Если unlock_day = 0 и daysSinceStart = 0, значит мы на 1-м дне модуля
            const daysIntoModule = Math.max(0, daysSinceStart - moduleUnlockDay + 1);
            const displayDays = isActive ? Math.min(daysIntoModule, moduleDuration) : moduleDuration;
            const daysProgressPercent = moduleDuration > 0 ? (displayDays / moduleDuration) * 100 : 0;

            // Получаем динамическую позицию маркера на дороге
            const markerPos = getMarkerPosition(index);

            // Позиция карточки (чередование лево/право, первый справа)
            const isLeft = index % 2 !== 0;

            // Выбор маркера в зависимости от статуса
            const getMarkerIcon = () => {
              if (isCurrent) return roadmapUserMark;
              if (isLocked) return roadmapDarkMark;
              return roadmapWhiteMark;
            };

            // Карточки въезжают с боков: нечётные (index 0, 2) слева, чётные (index 1, 3) справа
            // isLeft определяет конечную позицию карточки (index % 2 !== 0 = слева)
            const slideFromLeft = index % 2 === 0; // 0, 2 въезжают слева; 1, 3 въезжают справа

            return (
              <motion.div
                key={stage.stage_id}
                initial={{ opacity: 0, x: slideFromLeft ? -100 : 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: animationDelay + index * 0.15,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="absolute"
                style={{
                  // Позиционируем от низа контейнера
                  left: markerPos.x,
                  bottom: markerPos.y,
                  transform: 'translate(-50%, 50%)',
                  pointerEvents: 'auto',
                }}
              >

                {/* Карточка модуля */}
                <div
                  className="absolute"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: isLeft ? 8 : 'auto',
                    right: isLeft ? 'auto' : 8,
                  }}
                >
                  {/* Пунктирная линия с маркером - абсолютно позиционирована */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      // Линия идёт от нужного края карточки к центру
                      left: isLeft ? 'auto' : '100%',
                      right: isLeft ? '100%' : 'auto',
                      width: markerPos.lineWidth,
                      height: 2,
                    }}
                  >
                    {/* Пунктирная линия */}
                    <div
                      style={{
                        width: '100%',
                        height: 2,
                        borderTop: '2px dashed rgba(255, 255, 255, 0.6)',
                      }}
                    />
                    {/* Маркер на конце линии - absolute на краю */}
                    {/* Четные (index % 2 === 0): top -10px, right -16px */}
                    {/* Нечетные (index % 2 !== 0): top -10px, left -16px */}
                    {isCurrent ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: -44,
                          left: index % 2 !== 0 ? -30 : 'auto',
                          right: index % 2 === 0 ? -30 : 'auto',
                          width: 48,
                          height: 48,
                        }}
                      >
                        <img
                          src={roadmapUserMark}
                          alt="marker"
                          style={{ width: 48, height: 48 }}
                        />
                        {userPhotoUrl && (
                          <img
                            src={userPhotoUrl}
                            alt="user"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, calc(-50% - 2px))',
                              width: 27,
                              height: 27,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #FFFFFF',
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <img
                        src={isLocked ? roadmapDarkMark : roadmapWhiteMark}
                        alt="line marker"
                        style={{
                          position: 'absolute',
                          top: -20,
                          left: index % 2 !== 0 ? -16 : 'auto',
                          right: index % 2 === 0 ? -16 : 'auto',
                          width: 24,
                          height: 24,
                        }}
                      />
                    )}
                  </div>

                  {/* Карточка модуля - блюр применяется через CSS класс чтобы не было мигания */}
                  <div
                    className="flex items-center gap-3 rounded-2xl shadow-lg p-3 pr-4 cursor-pointer transition-colors"
                    style={{
                      maxWidth: 165,
                      background: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(30px)',
                      WebkitBackdropFilter: 'blur(30px)',
                    }}
                    onClick={() => {
                      if (isGuest) {
                        onGuestBlock?.();
                        return;
                      }
                      if (!isLocked && onStageClick) {
                        onStageClick(stage.stage_id, stage.module_id);
                      }
                    }}
                  >
                    {/* Контент карточки */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="truncate"
                        style={{
                          fontFamily: 'Nunito, sans-serif',
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: '120%',
                          color: isActive ? '#000000' : '#FFFFFF',
                        }}
                      >
                        {stage.stage_name}
                      </h3>
                      <p
                        style={{
                          fontFamily: 'Nunito, sans-serif',
                          fontWeight: 500,
                          fontSize: 12,
                          lineHeight: '14px',
                          color: isActive ? '#888888' : '#FFFFFF',
                        }}
                      >
                        {stage.total_lessons} уроков
                      </p>
                    </div>

                    {/* Круг прогресса */}
                    <div className="relative w-11 h-11 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90">
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill={isLocked ? '#FFFFFF' : 'none'}
                          stroke="#E6E6E6"
                          strokeWidth="3"
                        />
                        {isActive && (
                          <motion.circle
                            cx="22"
                            cy="22"
                            r="18"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.3)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 113 }}
                            animate={{
                              strokeDashoffset: 113 - (113 * daysProgressPercent) / 100
                            }}
                            transition={{ delay: animationDelay + index * 0.15 + 0.4, duration: 0.5 }}
                            strokeDasharray="113"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 500,
                            fontSize: 12,
                            lineHeight: '14px',
                            textAlign: 'center',
                            color: isActive ? '#222222' : '#ADADAD',
                          }}
                        >
                          {displayDays}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 500,
                            fontSize: 8,
                            lineHeight: '10px',
                            textAlign: 'center',
                            color: isActive ? '#222222' : '#ADADAD',
                          }}
                        >
                          {getNounPluralForm(displayDays, 'день', 'дня', 'дней')}
                        </span>
                      </div>
                    </div>
                  </div>

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
