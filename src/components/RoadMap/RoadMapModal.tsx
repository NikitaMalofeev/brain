import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerModalBackHandler, unregisterModalBackHandler } from '@/lib/modalState';
import RoadMap from './RoadMap';

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

interface RoadMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  onStageClick?: (stageId: number, moduleId?: string) => void;
  isGuest?: boolean;
  onGuestBlock?: () => void;
  userPhotoUrl?: string;
  currentWeek?: number;
  totalWeeks?: number;
  streamStartDate?: string;
}

/**
 * Модальное окно с дорожной картой
 * Popup по центру экрана с соотношением 375x480 для экрана 375x812
 * Закрывается по клику вне попапа и по кнопке назад в Telegram
 */
const RoadMapModal: React.FC<RoadMapModalProps> = ({
  isOpen,
  onClose,
  stages,
  onStageClick,
  isGuest = false,
  onGuestBlock,
  userPhotoUrl,
  currentWeek = 1,
  totalWeeks = 9,
  streamStartDate,
}) => {
  // Регистрируем модалку для перехвата кнопки назад в Telegram
  useEffect(() => {
    if (isOpen) {
      registerModalBackHandler(onClose);
    } else {
      unregisterModalBackHandler();
    }

    return () => {
      unregisterModalBackHandler();
    };
  }, [isOpen, onClose]);

  // Блокировка скролла при открытии модалки
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleStageClick = (stageId: number, moduleId?: string) => {
    if (onStageClick) {
      onStageClick(stageId, moduleId);
      onClose();
    }
  };

  // Рассчитываем размеры попапа
  // Соотношение: 375x480 для экрана 375x812, + 25% высоты
  // Ширина: 100% экрана, высота: (480/812) * 1.25 = ~74% экрана
  const popupHeightPercent = (480 / 812) * 100 * 1.25;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - клик закрывает модалку */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Popup контейнер */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-50 flex items-center justify-center"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 52, // Учитываем высоту bottom меню
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${popupHeightPercent}vh`,
                maxHeight: '85vh',
                borderRadius: 32,
                overflow: 'hidden',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div
              className="w-full h-full overflow-y-auto"
              style={{ borderRadius: 32 }}
            >
              <RoadMap
                stages={stages}
                onStageClick={handleStageClick}
                isGuest={isGuest}
                onGuestBlock={onGuestBlock}
                userPhotoUrl={userPhotoUrl}
                currentWeek={currentWeek}
                totalWeeks={totalWeeks}
                streamStartDate={streamStartDate}
              />
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoadMapModal;
