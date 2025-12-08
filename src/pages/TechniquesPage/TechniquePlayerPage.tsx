import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useTechniques } from '@/lib/supabase/hooks/useTechniques';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import TechniqueBlockedModal from '@/components/TechniqueBlockedModal';
import { motion } from 'framer-motion';
import DarkLoadingSpinner from '@/components/DarkLoadingSpinner/DarkLoadingSpinner';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { useWebView } from '@/hooks/useWebView';

// Чёрный фон-обёртка для всей страницы
const BlackBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000000',
    zIndex: 0,
  }}>
    <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
      {children}
    </div>
  </div>
);

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

  // Состояние модалок
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showStudentBlockedModal, setShowStudentBlockedModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { openWebView } = useWebView();

  // Находим текущую технику
  const technique = techniques?.find((t) => t.id === id);

  // Логирование для отладки
  useEffect(() => {
    console.log('=== TechniquePlayerPage DEBUG ===');
    console.log('Technique ID:', id);
    console.log('User ID:', supabaseUser?.id);
    console.log('Is Guest:', isGuest);
    console.log('Description:', technique?.description);
    console.log('Animation URL:', technique?.animation_url);
    console.log('Full Technique Data:', technique);
    console.log('================================');
  }, [id, supabaseUser, isGuest, technique]);

  // Общее состояние загрузки
  const loading = userLoading || guestCheckLoading || techniquesLoading;

  // Функция для формирования сообщений модалки
  const getBlockedModalContent = () => {
    if (!technique) return;

    // Для учеников с заблокированными техниками
    if (!isGuest && technique.status === 'locked' && !technique.has_access) {
      setModalTitle(`Техника ${technique.title} не доступна`);

      // Формируем описание на основе unlock_condition
      if (technique.unlock_condition_type === 'after_technique' && technique.unlock_condition_value) {
        const prerequisiteTechniqueId = technique.unlock_condition_value.technique_id;

        // Находим предыдущую технику по ID
        const prerequisiteTechnique = techniques?.find(t => t.id === prerequisiteTechniqueId);
        const prerequisiteName = prerequisiteTechnique?.title || 'предыдущей техники';

        // Проверяем название текущей техники для точной формулировки
        if (technique.title === 'Верховная жрица') {
          setModalDescription('Становится доступной к покупке через 1 месяц после получения доступа к «Императрице»');
        } else if (technique.title === 'Богиня') {
          setModalDescription('Становится доступна к покупке через 1 месяц после покупки «Верховной жрицы» (и при наличии «Императрицы»)');
        } else {
          // Для других техник с условием after_technique
          setModalDescription(`Становится доступной к покупке через 1 месяц после получения доступа к «${prerequisiteName}»`);
        }
      } else if (technique.unlock_condition_type === 'after_duration' && technique.unlock_condition_value) {
        const durationDays = technique.unlock_condition_value.duration_days || 0;
        const durationText = durationDays === 30 ? '1 месяц' :
                            durationDays === 60 ? '2 месяца' :
                            durationDays === 90 ? '3 месяца' :
                            `${durationDays} дней`;
        setModalDescription(`Становится доступной к покупке через ${durationText} после регистрации в программе`);
      } else {
        // Используем reason из purchase_info как fallback
        setModalDescription(technique.purchase_info?.reason || 'Техника временно недоступна');
      }
      return;
    }
  };

  // Моковый аудио URL для тестирования (2 минуты)
  const MOCK_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  // Проверка доступа и автоматический переход на плеер
  useEffect(() => {
    if (loading || !technique) return;

    const canPlay = technique.has_access || technique.status === 'free';

    // Если есть доступ - сразу переходим на AudioPlayerPage
    // TODO: вернуть проверку technique.audio_url когда будут реальные данные
    if (canPlay) {
      // Устанавливаем флаг редиректа чтобы не показывать UI страницы
      setIsRedirecting(true);
      navigate('/audio-player', {
        replace: true,
        state: {
          title: technique.title,
          description: technique.description,
          audioUrl: technique.audio_url || MOCK_AUDIO_URL,
          coverImage: buildFileUrl(technique.cover_image),
          moduleName: technique.available_from_module,
          animationUrl: technique.animation_url,
        }
      });
      return;
    }

    // Если нет доступа - показываем модалки
    if (!technique.has_access && technique.status !== 'free') {
      if (isGuest) {
        setShowGuestModal(true);
      } else if (technique.status === 'locked' && !technique.can_purchase) {
        getBlockedModalContent();
        setShowStudentBlockedModal(true);
      }
    }
  }, [loading, technique, isGuest, techniques, navigate]);

  // Переход на страницу аудиоплеера
  const handleOpenAudioPlayer = () => {
    if (!technique) return;

    navigate('/audio-player', {
      state: {
        title: technique.title,
        description: technique.description,
        audioUrl: technique.audio_url,
        coverImage: buildFileUrl(technique.cover_image),
        moduleName: technique.available_from_module,
        animationUrl: technique.animation_url,
      }
    });
  };

  // Обработчик покупки
  const handlePurchaseClick = () => {
    if (technique?.purchase_url) {
      openWebView(technique.purchase_url);
    }
  };

  // Обработчик обновления тарифа
  const handleUpgradeTariffClick = () => {
    if (technique?.upgrade_tariff_chat_url) {
      openWebView(technique.upgrade_tariff_chat_url);
    }
  };

  // Показываем спиннер при загрузке или при редиректе на плеер
  if (loading || isRedirecting) {
    return (
      <BlackBackground>
        <DarkLoadingSpinner />
      </BlackBackground>
    );
  }

  if (!technique) {
    return (
      <BlackBackground>
        <Page back>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-2">Техника не найдена</p>
              <button
                onClick={() => navigate('/techniques')}
                className="text-sm text-[#B862EA] hover:underline"
              >
                Вернуться к списку
              </button>
            </div>
          </div>
        </Page>
      </BlackBackground>
    );
  }

  const canPlay = technique.has_access || technique.status === 'free';

  console.log('CAN PLAY CHECK:', {
    canPlay,
    hasAccess: technique?.has_access,
    status: technique?.status,
    isFree: technique?.status === 'free',
  });

  return (
    <BlackBackground>
      <Page back>
        <div
          className="flex flex-col min-h-screen px-4 pb-6 with-content-offset"
          style={{
            backgroundImage: 'url(/library-page-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            backgroundRepeat: 'no-repeat',
          }}
        >
        {/* Обложка */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-6">
          {buildFileUrl(technique.cover_image) ? (
            <img
              src={buildFileUrl(technique.cover_image)!}
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

        {/* Кнопка воспроизведения */}
        {canPlay ? (
          <div className="mb-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenAudioPlayer}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E1C1F4] to-[#B862EA] flex items-center justify-center gap-3 text-white"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="font-semibold">Слушать</span>
            </motion.button>
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
            <div className="flex flex-col gap-2">
              {/* Для учеников показываем обе кнопки, если они есть */}
              {!isGuest && technique.purchase_url && (
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
              {!isGuest && technique.upgrade_tariff_chat_url && (
                <button
                  onClick={handleUpgradeTariffClick}
                  className="w-full py-3.5 text-white text-sm font-semibold rounded-[20px] hover:opacity-80 transition-opacity active:scale-[0.98]"
                  style={{
                    background: '#00000059',
                    backdropFilter: 'blur(30px)',
                  }}
                >
                  Стать учеником
                </button>
              )}

              {/* Для гостей показываем только кнопку покупки, если техника paid */}
              {isGuest && technique.can_purchase && technique.purchase_url && (
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
            </div>
          </div>
        )}
      </div>

        {/* Модалка для гостей */}
        <GuestBlockedModal
          isOpen={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          ctaUrl={technique?.purchase_url || 'https://brainprogramming.ru/main?utm_source=app'}
        />

        {/* Модалка для учеников с заблокированными техниками */}
        <TechniqueBlockedModal
          isOpen={showStudentBlockedModal}
          onClose={() => setShowStudentBlockedModal(false)}
          title={modalTitle}
          description={modalDescription}
          showButton={false}
        />
      </Page>
    </BlackBackground>
  );
};

export default TechniquePlayerPage;
