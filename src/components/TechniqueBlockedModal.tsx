import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TechniqueBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  showButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
}

// Высота TabBar
const TAB_BAR_HEIGHT = 56;

/**
 * Модальное окно для блокированных техник
 * Появляется снизу с фиолетовой рамкой
 */
export default function TechniqueBlockedModal({
  isOpen,
  onClose,
  title,
  description,
  showButton = true,
  buttonText = 'Купить',
  onButtonClick,
}: TechniqueBlockedModalProps) {
  const [bottomOffset, setBottomOffset] = useState(TAB_BAR_HEIGHT);

  // Получаем safe area bottom из CSS переменной
  useEffect(() => {
    const updateBottomOffset = () => {
      const safeAreaBottom = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-bottom')
        .trim();
      const safeAreaValue = parseInt(safeAreaBottom, 10) || 0;
      setBottomOffset(TAB_BAR_HEIGHT + safeAreaValue);
    };

    updateBottomOffset();

    // Слушаем изменения CSS переменных через MutationObserver
    const observer = new MutationObserver(updateBottomOffset);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => observer.disconnect();
  }, []);

  // Блокируем скролл body при открытии модалки
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Модальное окно снизу */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 z-50 flex flex-col items-center gap-4"
            style={{
              bottom: `${bottomOffset}px`,
              background: '#0000007A',
              backdropFilter: 'blur(30px)',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Кнопка закрытия */}
            <button
              onClick={onClose}
              className="absolute flex items-center justify-center"
              style={{ width: '16px', height: '16px', top: '20px', right: '20px' }}
              aria-label="Закрыть"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#ADADAD"
                strokeWidth="1.5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2 2L14 14M2 14L14 2"
                />
              </svg>
            </button>

            {/* Иконка замка */}
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src="/lockBlack.png"
                alt="Locked"
                className="w-full h-full"
              />
            </div>

            {/* Текст */}
            <div className="flex flex-col items-center text-center px-2" style={{ gap: '20px' }}>
              <h2
                className="text-white"
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 600,
                  fontSize: '16px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                }}
              >
                {title}
              </h2>
              <p
                className="text-white"
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '140%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                }}
              >
                {description}
              </p>
            </div>

            {/* Кнопка "Купить" */}
            {showButton && (
              <button
                onClick={onButtonClick || onClose}
                className="w-full py-3 px-6 rounded-[20px] text-white font-semibold hover:opacity-90 transition-opacity"
                style={{
                  background: '#0000007A',
                  backdropFilter: 'blur(30px)',
                  fontSize: '16px',
                }}
              >
                {buttonText}
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
