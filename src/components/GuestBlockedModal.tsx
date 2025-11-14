import { clsx } from 'clsx';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { AnimatePresence, motion } from 'framer-motion';

interface GuestBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ctaUrl?: string; // URL для кнопки "Оставить заявку"
}

/**
 * Модальное окно для гостей, показывающее что контент доступен только ученикам
 */
export default function GuestBlockedModal({
  isOpen,
  onClose,
  ctaUrl = 'https://brainprogramming.ru/enroll', // Дефолтный URL, заменить на реальный
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
          onClick={onClose} // Закрытие по клику на backdrop
        >
          {/* Контейнер модального окна */}
          <div className="relative w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3 items-center">
              {/* Содержимое модалки */}
              <div className="bg-white rounded-2xl py-6 px-4 flex flex-col items-center gap-4 w-full">
                {/* Иконка замка */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E1C1F4] to-[#B862EA] flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>

                {/* Текст */}
                <div className="flex flex-col gap-2 items-center text-center">
                  <h2 className="text-xl font-semibold text-black">
                    Доступно только ученикам
                  </h2>
                  <p className="text-[#242424] text-sm">
                    Этот контент доступен только ученикам программы Brain Programming.
                    Оставьте заявку, чтобы получить доступ.
                  </p>
                </div>

                {/* Кнопка CTA */}
                <Ripple className="rounded-xl overflow-hidden w-full">
                  <button
                    onClick={handleCtaClick}
                    className="w-full bg-gradient-to-r from-[#E1C1F4] to-[#B862EA] text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Оставить заявку
                  </button>
                </Ripple>
              </div>

              {/* Кнопка закрытия */}
              <Ripple className="rounded-full overflow-hidden">
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-[#E1C1F4] to-[#B862EA] rounded-full p-[6px] cursor-pointer"
                  aria-label="Закрыть"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </Ripple>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
