import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RoadMap from './RoadMap';

interface Stage {
  stage_id: number;
  stage_name: string;
  stage_order_num?: number;
  is_unlocked: boolean;
  total_lessons: number;
  completed_lessons: number;
  unlocked_lessons?: number;
}

interface RoadMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  onStageClick?: (stageId: number) => void;
  isGuest?: boolean;
  onGuestBlock?: () => void;
  userPhotoUrl?: string;
  currentWeek?: number;
  totalWeeks?: number;
}

/**
 * Модальное окно с дорожной картой
 * Открывается на полный экран
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
}) => {
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

  const handleStageClick = (stageId: number) => {
    if (onStageClick) {
      onStageClick(stageId);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: '#FFFFFF' }}
          onClick={onClose}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <RoadMap
              stages={stages}
              onStageClick={handleStageClick}
              isGuest={isGuest}
              onGuestBlock={onGuestBlock}
              userPhotoUrl={userPhotoUrl}
              currentWeek={currentWeek}
              totalWeeks={totalWeeks}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoadMapModal;
