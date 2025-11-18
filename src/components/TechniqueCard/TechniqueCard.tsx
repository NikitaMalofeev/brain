import React from 'react';
import { motion } from 'framer-motion';
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
    available_from_module,
    has_access,
    can_purchase,
    status,
  } = technique;

  // Определяем можно ли кликнуть на карточку
  const isClickable = has_access || status === 'free';
  const isLocked = !has_access && !can_purchase && status !== 'free';

  return (
    <motion.div
      layout
      whileTap={isClickable ? { scale: 0.98 } : {}}
      style={{ touchAction: 'manipulation' }}
      className="w-full"
    >
      <div
        className={clsx(
          'flex items-center gap-3 rounded-2xl p-3 transition-all',
          'bg-gradient-to-b from-[#9E9E9E] to-[#7E7E7E]',
          isClickable && 'cursor-pointer active:scale-[0.98]'
        )}
        onClick={isClickable ? onClick : undefined}
      >
        {/* Обложка */}
        <div className="relative w-[60px] h-[60px] rounded-xl flex-shrink-0 overflow-hidden">
          {cover_image ? (
            <img
              src={cover_image}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.style.background =
                    'linear-gradient(135deg, #A8C5E8 0%, #6B9BD1 100%)';
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#A8C5E8] to-[#6B9BD1]" />
          )}
        </div>

        {/* Контент - бейдж, название и описание */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Бейдж модуля */}
          {available_from_module && (
            <span className="inline-block px-2.5 py-0.5 bg-[#6E6E73] text-white text-[10px] font-medium rounded-full w-fit">
              {available_from_module}
            </span>
          )}

          {/* Название */}
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-1">
            {title}
          </h3>

          {/* Описание */}
          {description && (
            <p className="text-[11px] text-white/80 line-clamp-1">{description}</p>
          )}
        </div>

        {/* Кнопка справа */}
        <div className="flex items-center flex-shrink-0">
          {has_access || status === 'free' ? (
            /* Иконка Play для доступных и бесплатных */
            <button
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors"
              onClick={(e) => {
                if (isClickable) {
                  e.stopPropagation();
                  onClick();
                }
              }}
            >
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          ) : isLocked ? (
            /* Иконка замка для заблокированных */
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          ) : (
            /* Кнопка "Купить" для доступных к покупке */
            <button
              className="px-4 py-2 bg-[#5AC8FA] text-white text-xs font-semibold rounded-full hover:bg-[#32ADE6] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Логика покупки
                if (technique.purchase_url) {
                  window.open(technique.purchase_url, '_blank');
                }
              }}
            >
              Купить
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TechniqueCard;
