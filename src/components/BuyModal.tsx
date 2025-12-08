import { AnimatePresence, motion } from 'framer-motion';
import { useWebView } from '@/hooks/useWebView';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  techniqueName: string;
  purchaseUrl?: string | null;
  upgradeTariffUrl?: string | null;
  isGuest?: boolean;
}

/**
 * Модальное окно для покупки техники
 * Отображает две кнопки: "Купить на сайте" и "Повысить тариф"
 * Стилизовано в соответствии со страницей библиотеки
 */
export default function BuyModal({
  isOpen,
  onClose,
  techniqueName,
  purchaseUrl,
  upgradeTariffUrl,
  isGuest = false,
}: BuyModalProps) {
  const { openWebView } = useWebView();

  const handlePurchaseClick = () => {
    if (purchaseUrl) {
      openWebView(purchaseUrl);
    }
    onClose();
  };

  const handleUpgradeTariffClick = () => {
    if (upgradeTariffUrl) {
      openWebView(upgradeTariffUrl);
    }
    onClose();
  };

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
            className="fixed left-0 right-0 bottom-0 z-50 flex flex-col items-center gap-4"
            style={{
              background: '#0000007A',
              backdropFilter: 'blur(30px)',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              padding: '20px',
              paddingBottom: 'calc(60px + 20px + max(0px, env(safe-area-inset-bottom, 0px)))',
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

            {/* Заголовок */}
            <div className="flex flex-col items-center text-center px-2" style={{ gap: '12px' }}>
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
                {techniqueName}
              </h2>
              <p
                className="text-white/80"
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: '14px',
                  lineHeight: '140%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                }}
              >
                Выберите способ получения доступа к технике
              </p>
            </div>

            {/* Кнопки */}
            <div className="w-full flex flex-col gap-2 mt-2">
              {purchaseUrl && (
                <button
                  onClick={handlePurchaseClick}
                  className="w-full py-3.5 text-white text-sm font-semibold rounded-[20px] hover:opacity-80 transition-opacity active:scale-[0.98]"
                  style={{
                    background: '#0000007A',
                    backdropFilter: 'blur(30px)',
                  }}
                >
                  Купить на сайте
                </button>
              )}
              {upgradeTariffUrl && (
                <button
                  onClick={handleUpgradeTariffClick}
                  className="w-full py-3.5 text-white text-sm font-semibold rounded-[20px] hover:opacity-80 transition-opacity active:scale-[0.98]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(30px)',
                  }}
                >
                  {isGuest ? 'Стать учеником' : 'Повысить тариф'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
