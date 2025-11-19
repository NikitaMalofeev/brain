import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useTechniquesFiltered } from '@/lib/supabase/hooks/useTechniques';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { logger } from '@/lib/logger';
import { TechniqueWithAccess } from '@/lib/supabase/types';
import TechniqueCard from '@/components/TechniqueCard/TechniqueCard';
import { motion, AnimatePresence } from 'framer-motion';
import TechniqueBlockedModal from '@/components/TechniqueBlockedModal';
import TabBar from '@/components/TabBar/TabBar';

// Типы табов
type TabType = 'all' | 'mine';

interface Tab {
  id: TabType;
  label: string;
}

const TABS: Tab[] = [
  { id: 'all', label: 'Все техники' },
  { id: 'mine', label: 'Мои техники' },
];

/**
 * Страница с техниками (аудиопрактиками)
 * Отображает техники в двух табах: Все техники, Мои техники
 * Доступна как для гостей (показывает бесплатные техники), так и для учеников
 */
const TechniquesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Получаем данные пользователя
  const initDataSignal = useSignal(initDataState);
  const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);

  // Проверяем является ли пользователь гостем
  const { isGuest, isLoading: guestCheckLoading } = useGuestStatus(supabaseUser?.id);

  // Получаем техники с фильтрацией
  const {
    availableTechniques,
    lockedTechniques,
    myTechniques,
    freeTechniques,
    isLoading: techniquesLoading,
    error,
  } = useTechniquesFiltered(supabaseUser?.id);

  // Логирование для отладки
  useEffect(() => {
    logger.debug('TechniquesPage state', {
      userId: supabaseUser?.id,
      isGuest,
      availableCount: availableTechniques.length,
      lockedCount: lockedTechniques.length,
      myCount: myTechniques.length,
      freeCount: freeTechniques.length,
    });
  }, [supabaseUser, isGuest, availableTechniques, lockedTechniques, myTechniques, freeTechniques]);

  // Общее состояние загрузки
  const loading = userLoading || guestCheckLoading || techniquesLoading;

  // Функция для получения техник текущего таба
  const getCurrentTabTechniques = (): TechniqueWithAccess[] => {
    switch (activeTab) {
      case 'all':
        // Показываем все техники (доступные + заблокированные)
        return [...availableTechniques, ...lockedTechniques];
      case 'mine':
        return myTechniques;
      default:
        return [];
    }
  };

  const currentTechniques = getCurrentTabTechniques();

  // Состояние для модалки заблокированной техники
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');

  // Функция для формирования сообщений модалки (только для учеников)
  const getBlockedModalContent = (technique: TechniqueWithAccess) => {
    setModalTitle(`Техника ${technique.title} не доступна`);

    // Формируем описание на основе unlock_condition
    if (technique.unlock_condition_type === 'after_technique' && technique.unlock_condition_value) {
      const prerequisiteTechniqueId = technique.unlock_condition_value.technique_id;

      // Находим предыдущую технику по ID
      const allTechniques = [...availableTechniques, ...lockedTechniques, ...myTechniques, ...freeTechniques];
      const prerequisiteTechnique = allTechniques.find(t => t.id === prerequisiteTechniqueId);
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
  };

  // Обработчик клика по технике
  const handleTechniqueClick = (techniqueId: string) => {
    logger.debug('Opening technique', { techniqueId });

    // Найти технику во всех списках
    const technique = [...availableTechniques, ...lockedTechniques, ...myTechniques, ...freeTechniques]
      .find(t => t.id === techniqueId);

    // Если техника заблокирована (нет доступа и нельзя купить)
    if (technique && !technique.has_access && !technique.can_purchase && technique.status !== 'free') {
      if (!isGuest) {
        // Ученик - показываем модалку с правильными сообщениями
        getBlockedModalContent(technique);
        setShowBlockedModal(true);
        return;
      }
    }

    // Во всех остальных случаях переходим на страницу техники
    navigate(`/techniques/${techniqueId}`);
  };

  return (
    <Page back={false}>
      <div
        className="flex flex-col min-h-screen pb-4"
        style={{
          backgroundImage: 'url(/library-page-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Заголовок */}
        <div className="pt-4 pb-4 px-4">
          <h1 className="text-[24px] font-semibold text-black leading-none tracking-normal">Библиотека</h1>
        </div>

        {/* Единый блок с табами и контентом на всю ширину */}
        <div className="rounded-[32px] overflow-hidden flex-1">
          {/* Табы внутри блока */}
          <div className="flex relative">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-2.5 font-medium text-sm whitespace-nowrap transition-all relative z-10
                  ${activeTab === tab.id
                    ? 'text-white rounded-t-[32px]'
                    : ''
                  }
                `}
                style={
                  activeTab === tab.id
                    ? {
                      background: '#0000004D',
                      backdropFilter: 'blur(30px)',
                    }
                    : {
                      background: '#FFFFFF33',
                      color: '#0000004D',
                    }
                }
              >
                {tab.label}

                {/* Фигура для левого таба когда правый активен */}
                {activeTab !== tab.id && index === 0 && activeTab === 'mine' && (
                  <div
                    className="absolute w-[32px] h-[32px] z-0"
                    style={{
                      right: '-4px',
                      bottom: '0',
                      background: 'radial-gradient(circle at top left, transparent 32px, #0000004D 32px)',
                      backdropFilter: 'blur(30px)',
                    }}
                  />
                )}

                {/* Фигура для правого таба когда левый активен */}
                {activeTab !== tab.id && index === 1 && activeTab === 'all' && (
                  <div
                    className="absolute w-[32px] h-[32px] z-0"
                    style={{
                      left: '-4px',
                      bottom: '0',
                      background: 'radial-gradient(circle at top right, transparent 32px, #0000004D 32px)',
                      backdropFilter: 'blur(30px)',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Контент со статичным фоном */}
          <div
            className="min-h-[500px] p-4"
            style={{
              background: '#0000004D',
              backdropFilter: 'blur(30px)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                      <p className="text-sm text-white/60">Загрузка...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center">
                      <p className="text-sm text-red-300">Ошибка загрузки техник</p>
                      <p className="text-xs text-white/60 mt-1">{error.message}</p>
                    </div>
                  </div>
                ) : currentTechniques.length === 0 && activeTab === 'mine' ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center">
                      <p className="text-sm text-white/60">
                        {isGuest && 'Станьте учеником, чтобы получить доступ к техникам'}
                        {!isGuest && 'У вас пока нет техник'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeTab === 'all' ? (
                      <>
                        {/* Секция "К покупке" - все платные техники (и с кнопкой Купить, и заблокированные) */}
                        {[...availableTechniques, ...lockedTechniques].filter(t => !t.has_access && t.status !== 'free').length > 0 && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">К покупке</h2>
                            <div className="flex flex-col gap-3">
                              {[...availableTechniques, ...lockedTechniques].filter(t => !t.has_access && t.status !== 'free').map((technique) => (
                                <TechniqueCard
                                  key={technique.id}
                                  technique={technique}
                                  onClick={() => handleTechniqueClick(technique.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Секция "Бесплатные" */}
                        {freeTechniques.length > 0 && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">Бесплатные</h2>
                            <div className="flex flex-col gap-3">
                              {freeTechniques.map((technique) => (
                                <TechniqueCard
                                  key={technique.id}
                                  technique={technique}
                                  onClick={() => handleTechniqueClick(technique.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Если нет ни одной техники */}
                        {[...availableTechniques, ...lockedTechniques].filter(t => !t.has_access && t.status !== 'free').length === 0 && freeTechniques.length === 0 && (
                          <div className="flex items-center justify-center h-full min-h-[300px]">
                            <p className="text-sm text-white/60">Нет доступных техник</p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Таб "Мои техники" */
                      <div className="flex flex-col gap-3">
                        {currentTechniques.map((technique) => (
                          <TechniqueCard
                            key={technique.id}
                            technique={technique}
                            onClick={() => handleTechniqueClick(technique.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Кнопки внизу страницы */}
        {!loading && !error && (availableTechniques.length > 0 || freeTechniques.length > 0 || myTechniques.length > 0) && (
          <div className="flex flex-col gap-2 mt-4 px-4">
            <button
              className="w-full py-3.5 text-white text-sm font-semibold rounded-[20px] hover:opacity-80 transition-opacity active:scale-[0.98]"
              style={{
                background: '#0000007A',
                backdropFilter: 'blur(10px)',
              }}
            >
              Библиотека
            </button>
            <button
              className="w-full py-3.5 text-white text-sm font-semibold rounded-[20px] hover:opacity-80 transition-opacity active:scale-[0.98]"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              Запустить биорегулирование
            </button>
          </div>
        )}

        {/* Модалка для заблокированной техники */}
        <TechniqueBlockedModal
          isOpen={showBlockedModal}
          onClose={() => setShowBlockedModal(false)}
          title={modalTitle}
          description={modalDescription}
          showButton={false}
        />
      </div>
    </Page>
  );
};

export default TechniquesPage;
