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
      whileTap={isClickable ? { scale: 0.97 } : {}}
      style={{ touchAction: 'manipulation' }}
      className="w-full"
    >
      <Ripple className="rounded-2xl overflow-hidden">
        <div
          onClick={isClickable ? onClick : undefined}
          className={clsx(
            'block w-full bg-white rounded-2xl p-4 transition-all',
            isClickable ? 'cursor-pointer hover:shadow-lg' : 'opacity-70 cursor-not-allowed'
          )}
        >
          {/* Обложка */}
          <div className="relative w-full h-40 rounded-xl mb-3 overflow-hidden">
            {cover_image ? (
              <img
                src={cover_image}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback на градиент если изображение не загрузилось
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.style.background =
                      'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)';
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#E1C1F4] to-[#B862EA] flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            )}

            {/* Иконка замка для заблокированных техник */}
            {!has_access && !can_purchase && status === 'locked' && (
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
                <svg
                  className="w-4 h-4 text-white"
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
            )}
          </div>

          {/* Контент */}
          <div className="flex flex-col gap-2">
            {/* Заголовок */}
            <h3 className="text-lg font-semibold text-black leading-tight">{title}</h3>

            {/* Описание */}
            {description && (
              <p className="text-sm text-[#666] line-clamp-2 leading-snug">{description}</p>
            )}

            {/* Метаданные */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Длительность */}
              {durationMinutes && (
                <span className="text-xs text-[#666] flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {durationMinutes} мин
                </span>
              )}

              {/* Метка модуля */}
              {available_from_module && (
                <span className="text-xs text-[#B862EA] font-medium">{available_from_module}</span>
              )}
            </div>

            {/* Статус доступа */}
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', statusBadge.className)}>
                {statusBadge.text}
              </span>
            </div>

            {/* Причина блокировки */}
            {!can_purchase && purchase_info?.reason && (
              <p className="text-xs text-[#999] mt-1">{purchase_info.reason}</p>
            )}

            {/* Дата разблокировки */}
            {!can_purchase && purchase_info?.unlock_date && (
              <p className="text-xs text-[#999]">
                Откроется: {new Date(purchase_info.unlock_date).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </Ripple>
    </motion.div>
  );
};

export default TechniqueCard;
