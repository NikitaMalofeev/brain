import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { clsx } from 'clsx';

interface Stage {
  stage_id: number;
  stage_name: string;
  stage_order_num: number;
  is_unlocked: boolean;
  total_lessons: number;
  completed_lessons: number;
}

interface RoadMapProps {
  stages: Stage[];
  onStageClick?: (stageId: number) => void;
  isGuest?: boolean;
  onGuestBlock?: () => void; // Callback когда гость кликает на заблокированный этап
}

/**
 * Компонент дорожной карты обучения
 * Показывает вертикальную линию с точками для каждого этапа
 * Состояния: пройдено, текущее, заблокировано
 */
const RoadMap: React.FC<RoadMapProps> = ({ stages, onStageClick, isGuest = false, onGuestBlock }) => {
  // Определить текущий активный этап (первый незавершенный разблокированный)
  const currentStageIndex = stages.findIndex(
    (stage) =>
      stage.is_unlocked && stage.completed_lessons < stage.total_lessons
  );

  const getStageStatus = (stage: Stage, index: number) => {
    // Для гостей: все этапы показываем как заблокированные (серые)
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

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          dot: 'bg-green-500 border-green-500',
          line: 'bg-green-500',
          text: 'text-green-700',
        };
      case 'current':
        return {
          dot: 'bg-blue-500 border-blue-500 ring-4 ring-blue-100',
          line: 'bg-gray-300',
          text: 'text-blue-700',
        };
      case 'available':
        return {
          dot: 'bg-white border-blue-400',
          line: 'bg-gray-300',
          text: 'text-gray-700',
        };
      case 'locked':
      default:
        return {
          dot: 'bg-white border-gray-300',
          line: 'bg-gray-200',
          text: 'text-gray-400',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Дорожная карта</h2>

      <div className="relative">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage, index);
          const colors = getStageColor(status);
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage_id} className="relative flex items-start gap-4 pb-8">
              {/* Вертикальная линия */}
              {!isLast && (
                <div
                  className={clsx(
                    'absolute left-4 top-8 w-0.5 h-full -translate-x-1/2 transition-colors duration-300',
                    colors.line
                  )}
                />
              )}

              {/* Точка/индикатор */}
              <div className="relative z-10 flex-shrink-0">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                  className={clsx(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                    colors.dot,
                    status === 'current' && 'shadow-lg'
                  )}
                >
                  {status === 'completed' && (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  )}
                  {status === 'locked' && <Lock className="w-3 h-3 text-gray-400" />}
                  {status === 'current' && (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </motion.div>
              </div>

              {/* Информация об этапе */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={clsx(
                  'flex-1 cursor-pointer',
                  status !== 'locked' && 'hover:bg-gray-50 rounded-lg -ml-2 pl-2 py-1 transition-colors'
                )}
                onClick={() => {
                  // Для гостей на любом этапе вызываем onGuestBlock
                  if (isGuest) {
                    if (onGuestBlock) {
                      onGuestBlock();
                    }
                    return;
                  }
                  if (status !== 'locked' && onStageClick) {
                    onStageClick(stage.stage_id);
                  }
                }}
              >
                <h3
                  className={clsx(
                    'text-sm font-semibold transition-colors',
                    colors.text,
                    status === 'current' && 'text-base'
                  )}
                >
                  {stage.stage_name}
                </h3>

                {/* Прогресс */}
                {status !== 'locked' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {stage.completed_lessons} из {stage.total_lessons} уроков
                      </span>
                      <span>
                        {stage.total_lessons > 0
                          ? Math.round((stage.completed_lessons / stage.total_lessons) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${
                            stage.total_lessons > 0
                              ? (stage.completed_lessons / stage.total_lessons) * 100
                              : 0
                          }%`,
                        }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                        className={clsx(
                          'h-full rounded-full transition-colors',
                          status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Метка "Заблокировано" */}
                {status === 'locked' && (
                  <p className="text-xs text-gray-400 mt-1">Будет доступно позже</p>
                )}

                {/* Метка "Текущий" */}
                {status === 'current' && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Сейчас здесь
                  </span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Итоговая статистика */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Всего этапов:</span>
          <span className="font-semibold text-gray-900">{stages.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-600">Пройдено:</span>
          <span className="font-semibold text-green-600">
            {stages.filter((s) => s.completed_lessons === s.total_lessons && s.total_lessons > 0).length}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-600">Осталось:</span>
          <span className="font-semibold text-gray-900">
            {stages.filter((s) => s.completed_lessons < s.total_lessons || s.total_lessons === 0).length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoadMap;
