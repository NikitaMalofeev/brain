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
    unlock_date,
    is_unlocked,
    purchase_info,
  } = technique;

  // Определяем можно ли кликнуть на карточку
  const isClickable = has_access || status === 'free';
  const isLocked = !has_access && !can_purchase && status !== 'free';

  // Форматируем дату открытия
  const formatUnlockDate = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedUnlockDate = formatUnlockDate(unlock_date);

  return (
    <motion.div
      layout
      whileTap={isClickable ? { scale: 0.98 } : {}}
      style={{ touchAction: 'manipulation' }}
      className="w-full"
    >
      <div
        className={clsx(
          'flex items-start gap-3 rounded-2xl p-3 transition-all cursor-pointer active:scale-[0.98] relative'
        )}
        style={{
          background: '#FFFFFF33',
        }}
        onClick={onClick}
      >
        {/* Обложка */}
        <div className="relative w-[60px] h-[60px] rounded-xl flex-shrink-0 overflow-hidden">
          <img
            src={cover_image || '/mock-library-card-image.png'}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/mock-library-card-image.png';
            }}
          />
        </div>

        {/* Контент - бейдж, название и описание */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ maxWidth: '70%' }}>
          {/* Бейдж модуля */}
          {available_from_module && (
            <span
              className="inline-block px-2.5 py-0.5 text-white text-[10px] font-medium rounded-full w-fit mb-[22px]"
              style={{ background: '#0000004D' }}
            >
              {available_from_module}
            </span>
          )}

          {/* Название */}
          <h3
            className="text-white line-clamp-2 mb-1"
            style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: '20px',
              letterSpacing: '0.24%',
            }}
          >
            {title}
          </h3>

          {/* Описание */}
          {description && (
            <p
              className="text-white/80 line-clamp-2"
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '120%',
                letterSpacing: '0%',
              }}
            >
              {description}
            </p>
          )}

          {/* Дата открытия для заблокированных техник */}
          {isLocked && formattedUnlockDate && (
            <div className="mt-2 flex flex-col gap-1">
              {/* Название модуля если есть */}
              {purchase_info?.module_name && (
                <span
                  className="text-white/60 text-xs"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                  }}
                >
                  Техника из модуля "{purchase_info.module_name}"
                </span>
              )}
              {/* Дата открытия */}
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span
                  className="text-white/60 text-xs"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                  }}
                >
                  Откроется {formattedUnlockDate}
                </span>
              </div>
            </div>
          )}

          {/* Причина блокировки если нет даты */}
          {isLocked && !formattedUnlockDate && purchase_info?.reason && (
            <div className="mt-2">
              <span
                className="text-white/60 text-xs"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                }}
              >
                {purchase_info.reason}
              </span>
            </div>
          )}
        </div>

        {/* Кнопки Play/Lock/Купить в правом верхнем углу */}
        <div className="absolute top-3 right-3">
          {has_access || status === 'free' ? (
            /* Иконка Play для доступных и бесплатных */
            <button
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(0, 0, 0, 0.4)' }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          ) : isLocked ? (
            /* Иконка замка для заблокированных */
            <div
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            >
              <img
                src="/lock.png"
                alt="Locked"
                className="w-full h-full"
              />
            </div>
          ) : (
            /* Кнопка "Купить" для доступных к покупке */
            <button
              className="text-white text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                paddingTop: '7px',
                paddingRight: '24px',
                paddingBottom: '8px',
                paddingLeft: '24px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
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
