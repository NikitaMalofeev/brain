import React from 'react';
import { motion } from 'framer-motion';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { clsx } from 'clsx';
import { TechniqueWithAccess } from '@/lib/supabase/types';

export interface TechniqueCardProps {
  technique: TechniqueWithAccess;
  onClick: () => void;
}

/**
 * Карточка техники (аудиопрактики)
 * Отображает превью техники с обложкой, названием, описанием и статусом доступа
 */
const TechniqueCard: React.FC<TechniqueCardProps> = ({ technique, onClick }) => {
  const {
    title,
    description,
    cover_image,
    duration_seconds,
    available_from_module,
    has_access,
    can_purchase,
    status,
    purchase_info,
  } = technique;

  // Определяем можно ли кликнуть на карточку
  const isClickable = has_access || status === 'free';

  // Форматируем длительность в минуты
  const durationMinutes = duration_seconds ? Math.floor(duration_seconds / 60) : null;

  // Определяем цвет и текст бейджа статуса
  const getStatusBadge = () => {
    if (has_access) {
      return {
        text: 'Доступна',
        className: 'bg-green-100 text-green-700',
      };
    }
    if (status === 'free') {
      return {
        text: 'Бесплатно',
        className: 'bg-blue-100 text-blue-700',
      };
    }
    if (can_purchase) {
      return {
        text: 'Купить',
        className: 'bg-purple-100 text-purple-700',
      };
    }
    return {
      text: 'Заблокировано',
      className: 'bg-gray-100 text-gray-700',
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <motion.div
      layout
      whileTap={isClickable ? { scale: 0.98 } : {}}
      style={{ touchAction: 'manipulation' }}
      className="w-full"
    >
      <div
        className={clsx(
          'flex items-center gap-3 bg-white rounded-2xl p-3 transition-all shadow-sm',
          isClickable ? 'cursor-pointer hover:shadow-md' : 'opacity-80'
        )}
      >
        {/* Обложка - уменьшенная слева */}
        <div className="relative w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden">
          {cover_image ? (
            <img
              src={cover_image}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.style.background =
                    'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)';
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#E1C1F4] to-[#B862EA]" />
          )}
        </div>

        {/* Контент - название и описание */}
        <div className="flex-1 min-w-0" onClick={isClickable ? onClick : undefined}>
          <h3 className="text-base font-semibold text-black leading-tight truncate">{title}</h3>
          {description && (
            <p className="text-xs text-[#666] line-clamp-1 mt-0.5">{description}</p>
          )}
        </div>

        {/* Кнопки справа */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Кнопка "Подарок" */}
          <button
            className="px-3 py-1.5 bg-[#E5E5EA] text-[#242424] text-xs font-medium rounded-full hover:bg-[#D1D1D6] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Логика подарка
              alert('Подарить технику');
            }}
          >
            Подарок
          </button>

          {/* Кнопка "Купить" или иконка замка */}
          {has_access ? (
            <div className="w-16 h-8 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          ) : can_purchase ? (
            <button
              className="px-3 py-1.5 bg-[#007AFF] text-white text-xs font-medium rounded-full hover:bg-[#0051D5] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Логика покупки
                alert('Купить технику');
              }}
            >
              Купить
            </button>
          ) : (
            <div className="w-16 h-8 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TechniqueCard;
