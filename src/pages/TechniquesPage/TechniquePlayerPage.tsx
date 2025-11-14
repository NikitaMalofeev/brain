import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useTechniques } from '@/lib/supabase/hooks/useTechniques';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { logger } from '@/lib/logger';
import { TechniqueWithAccess } from '@/lib/supabase/types';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { motion } from 'framer-motion';

/**
 * Страница проигрывателя техники (аудиопрактики)
 * Отображает детали техники и аудиоплеер
 * Показывает кнопки покупки/обновления тарифа в зависимости от доступа
 */
const TechniquePlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Получаем данные пользователя
  const initDataSignal = useSignal(initDataState);
  const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);
  const { isGuest, isLoading: guestCheckLoading } = useGuestStatus(supabaseUser?.id);

  // Получаем техники
  const { data: techniques, isLoading: techniquesLoading } = useTechniques(supabaseUser?.id);

  // Состояние модалки для гостей
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Аудио плеер
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Находим текущую технику
  const technique = techniques?.find((t) => t.id === id);

  // Логирование для отладки
  useEffect(() => {
    logger.debug('TechniquePlayerPage state', {
      techniqueId: id,
      userId: supabaseUser?.id,
      isGuest,
      hasTechnique: !!technique,
      hasAccess: technique?.has_access,
    });
  }, [id, supabaseUser, isGuest, technique]);

  // Общее состояние загрузки
  const loading = userLoading || guestCheckLoading || techniquesLoading;

  // Проверка доступа
  useEffect(() => {
    if (!loading && technique && !technique.has_access && technique.status !== 'free') {
      // Если гость пытается открыть платную технику без доступа
      if (isGuest) {
        setShowGuestModal(true);
      }
    }
  }, [loading, technique, isGuest]);

  // Обработчики аудио плеера
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Обработчик покупки
  const handlePurchaseClick = () => {
    if (technique?.purchase_url) {
      window.open(technique.purchase_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Обработчик обновления тарифа
  const handleUpgradeTariffClick = () => {
    if (technique?.upgrade_tariff_chat_url) {
      window.open(technique.upgrade_tariff_chat_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <Page back>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
            <p className="text-sm text-[#666]">Загрузка...</p>
          </div>
        </div>
      </Page>
    );
  }

  if (!technique) {
    return (
      <Page back>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg font-semibold text-black mb-2">Техника не найдена</p>
            <button
              onClick={() => navigate('/techniques')}
              className="text-sm text-[#B862EA] hover:underline"
            >
              Вернуться к списку
            </button>
          </div>
        </div>
      </Page>
    );
  }

  const canPlay = technique.has_access || technique.status === 'free';

  return (
    <Page back>
      <div className="flex flex-col h-full px-4 py-6">
        {/* Обложка */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-6">
          {technique.cover_image ? (
            <img
              src={technique.cover_image}
              alt={technique.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#E1C1F4] to-[#B862EA] flex items-center justify-center">
              <svg
                className="w-24 h-24 text-white opacity-50"
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
        </div>

        {/* Информация о технике */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black mb-2">{technique.title}</h1>
          {technique.description && (
            <p className="text-sm text-[#666] mb-3">{technique.description}</p>
          )}
          {technique.available_from_module && (
            <span className="inline-block text-xs text-[#B862EA] font-medium bg-purple-50 px-3 py-1 rounded-full">
              {technique.available_from_module}
            </span>
          )}
        </div>

        {/* Аудио плеер */}
        {canPlay ? (
          <div className="bg-white rounded-2xl p-4 mb-4">
            <audio
              ref={audioRef}
              src={technique.audio_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />

            {/* Прогресс бар */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #B862EA 0%, #B862EA ${
                    (currentTime / duration) * 100 || 0
                  }%, #E5E7EB ${(currentTime / duration) * 100 || 0}%, #E5E7EB 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-[#666] mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Кнопки управления */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-[#E1C1F4] to-[#B862EA] flex items-center justify-center text-white"
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-6 mb-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-black mb-2">Доступ ограничен</p>
            <p className="text-sm text-[#666] mb-4">
              {technique.purchase_info?.reason || 'Эта техника доступна только для учеников'}
            </p>

            {/* Кнопки действия */}
            <div className="flex flex-col gap-3">
              {technique.can_purchase && technique.purchase_url && (
                <Ripple className="rounded-xl overflow-hidden">
                  <button
                    onClick={handlePurchaseClick}
                    className="w-full bg-gradient-to-r from-[#E1C1F4] to-[#B862EA] text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Купить технику
                  </button>
                </Ripple>
              )}
              {technique.upgrade_tariff_chat_url && (
                <Ripple className="rounded-xl overflow-hidden">
                  <button
                    onClick={handleUpgradeTariffClick}
                    className="w-full bg-white border-2 border-[#B862EA] text-[#B862EA] font-semibold py-3 px-6 rounded-xl hover:bg-purple-50 transition-colors"
                  >
                    Связаться с отделом продаж
                  </button>
                </Ripple>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Модалка для гостей */}
      <GuestBlockedModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        ctaUrl={technique.purchase_url || 'https://brainprogramming.ru/enroll'}
      />
    </Page>
  );
};

export default TechniquePlayerPage;
