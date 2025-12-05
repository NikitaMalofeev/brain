import { Ripple } from '@/components/ui/Ripple/Ripple';
import { AnimatePresence, motion } from 'framer-motion';

interface GuestBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ctaUrl?: string; // URL для кнопки
  title?: string; // Заголовок модалки (игнорируется, используется фиксированный)
  description?: string; // Описание (игнорируется, используется фиксированное)
  ctaText?: string; // Текст кнопки (игнорируется, используется фиксированный)
}

/**
 * Модальное окно для блокированных функций (для гостей)
 */
export default function GuestBlockedModal({
  isOpen,
  onClose,
  ctaUrl = 'https://brainprogramming.ru/enroll',
}: GuestBlockedModalProps) {
  const handleCtaClick = () => {
    // Открываем внешнюю ссылку в новой вкладке
    if (ctaUrl) {
      window.open(ctaUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
          onClick={onClose}
        >
          {/* Контейнер модального окна */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-[90%] max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Содержимое модалки */}
            <div
              className="bg-white py-8 px-6 flex flex-col items-center gap-5 w-full relative"
              style={{ borderRadius: '32px' }}
            >
              {/* Кнопка закрытия - крестик в правом верхнем углу */}
              <button
                onClick={onClose}
                className="absolute flex items-center justify-center"
                style={{
                  top: '16px',
                  right: '16px',
                  width: '16px',
                  height: '16px',
                  background: 'linear-gradient(90deg, rgba(34, 34, 34, 0.6) 0%, rgba(117, 117, 117, 0.6) 100%)',
                  borderRadius: '50%',
                }}
                aria-label="Закрыть"
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L7 7M1 7L7 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Иконка замка с blur */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(90deg, rgba(34, 34, 34, 0.6) 0%, rgba(117, 117, 117, 0.6) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ADADAD"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              {/* Текст */}
              <div className="flex flex-col gap-2 items-center text-center">
                <h2 className="text-xl font-semibold text-black">
                  Функционал доступен только ученикам
                </h2>
                <p className="text-[#242424] text-sm">
                  На сайте ты можешь узнать подробную информацию
                </p>
              </div>

              {/* Кнопка CTA */}
              <Ripple className="overflow-hidden w-full" style={{ borderRadius: '32px' }}>
                <button
                  onClick={handleCtaClick}
                  className="w-full text-white font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(141, 197, 241, 0.4) -48.61%, #63ABE6 105.56%), linear-gradient(91.99deg, #F3F3F3 0%, #EAEAEA 100%)',
                    padding: '16px',
                    borderRadius: '32px',
                  }}
                >
                  Перейти на сайт
                </button>
              </Ripple>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
