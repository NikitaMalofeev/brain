import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationPopupProps {
  /** Открыт ли попап */
  isOpen: boolean;
  /** Функция закрытия */
  onClose: () => void;
  /** Иконка (React компонент SVG или null) */
  icon?: React.ReactNode;
  /** Заголовок */
  title: string;
  /** Сообщение */
  message?: string;
  /** Текст кнопки */
  buttonText?: string;
  /** Обработчик клика по кнопке */
  onButtonClick?: () => void;
  /** Показывать ли кнопку закрытия (крестик) */
  showCloseButton?: boolean;
  /** Цвет фона кнопки */
  buttonColor?: string;
  /** Дополнительный контент */
  children?: React.ReactNode;
}

/**
 * Универсальный компонент попапа-уведомления
 * Всплывает снизу экрана с анимацией
 * Полностью настраивается через пропсы
 */
const NotificationPopup: React.FC<NotificationPopupProps> = ({
  isOpen,
  onClose,
  icon,
  title,
  message,
  buttonText,
  onButtonClick,
  showCloseButton = true,
  buttonColor = '#5AC8FA',
  children,
}) => {
  // Блокируем скролл body когда попап открыт
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

  // Закрытие по клику на оверлей
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Оверлей */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[9998] backdrop-blur-sm"
            onClick={handleOverlayClick}
          />

          {/* Попап */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-center px-4 pb-4"
          >
            <div className="w-full max-w-[400px] bg-white rounded-3xl p-6 shadow-2xl relative">
              {/* Кнопка закрытия */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Закрыть"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {/* Иконка */}
              {icon && (
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    {icon}
                  </div>
                </div>
              )}

              {/* Заголовок */}
              <h3 className="text-lg font-semibold text-center text-black mb-2">
                {title}
              </h3>

              {/* Сообщение */}
              {message && (
                <p className="text-sm text-center text-gray-600 mb-6">
                  {message}
                </p>
              )}

              {/* Дополнительный контент */}
              {children && <div className="mb-6">{children}</div>}

              {/* Кнопка */}
              {buttonText && onButtonClick && (
                <button
                  onClick={() => {
                    onButtonClick();
                    onClose();
                  }}
                  className="w-full py-3.5 text-white text-sm font-semibold rounded-[20px] hover:opacity-90 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: buttonColor }}
                >
                  {buttonText}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPopup;
