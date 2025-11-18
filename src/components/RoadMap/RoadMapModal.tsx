import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import RoadMap from './RoadMap';

interface Stage {
  stage_id: number;
  stage_name: string;
  stage_order_num: number;
  is_unlocked: boolean;
  total_lessons: number;
  completed_lessons: number;
}

interface RoadMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  onStageClick?: (stageId: number) => void;
}

/**
 * Модальное окно с дорожной картой
 * Открывается поверх главной страницы
 */
const RoadMapModal: React.FC<RoadMapModalProps> = ({
  isOpen,
  onClose,
  stages,
  onStageClick,
}) => {
  const handleStageClick = (stageId: number) => {
    if (onStageClick) {
      onStageClick(stageId);
      onClose(); // Закрыть модалку после клика на этап
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Затемненный фон */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Ваш путь обучения</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Контент (прокручиваемый) */}
            <div className="flex-1 overflow-y-auto">
              <RoadMap stages={stages} onStageClick={handleStageClick} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoadMapModal;
