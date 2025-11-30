import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useTechniquesFiltered, BundleGroup } from '@/lib/supabase/hooks/useTechniques';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { logger } from '@/lib/logger';
import { TechniqueWithAccess } from '@/lib/supabase/types';
import TechniqueCard from '@/components/TechniqueCard/TechniqueCard';
import { motion, AnimatePresence } from 'framer-motion';
import TechniqueBlockedModal from '@/components/TechniqueBlockedModal';
import TabBar from '@/components/TabBar/TabBar';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

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
    techniques,
    availableTechniques,
    lockedTechniques,
    myTechniques,
    freeTechniques,
    myFreeTechniques,
    moduleTechniques,
    bundleGroups,
    isLoading: techniquesLoading,
    error,
  } = useTechniquesFiltered(supabaseUser?.id);

  // Debug: логируем пакеты
  console.log('🎯 [DEBUG] bundleGroups:', bundleGroups);
  console.log('🎯 [DEBUG] techniques with bundle:', techniques?.filter(t => t.bundle_id || t.user_access_source === 'bundle'));

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
    setModalTitle(`Техника «${technique.title}» недоступна`);

    // Кейс 1: Техника из модуля (заблокирована по времени)
    if (technique.user_access_source === 'module' && technique.module_name && technique.unlock_day !== undefined) {
      setModalDescription(`Техника из модуля «${technique.module_name}»\nОткроется на ${technique.unlock_day} день`);
      return;
    }

    // Кейс 2: Техника с условием после другой техники
    if (technique.unlock_condition_type === 'after_technique' && technique.unlock_condition_value) {
      const prerequisiteTechniqueId = technique.unlock_condition_value.technique_id;

      // Находим предыдущую технику по ID
      const allTechniques = [...availableTechniques, ...lockedTechniques, ...myTechniques, ...freeTechniques, ...moduleTechniques];
      const prerequisiteTechnique = allTechniques.find(t => t.id === prerequisiteTechniqueId);
      const prerequisiteName = prerequisiteTechnique?.title || 'предыдущей техники';

      // Проверяем название текущей техники для точной формулировки
      if (technique.title === 'Верховная жрица') {
        setModalDescription('Становится доступной к покупке через 1 месяц после получения доступа к «Императрице»');
      } else if (technique.title === 'Богиня') {
        setModalDescription('Становится доступна к покупке через 1 месяц после покупки «Верховной жрицы» (и при наличии «Императрицы»)');
      } else {
        setModalDescription(`Становится доступной к покупке через 1 месяц после получения доступа к «${prerequisiteName}»`);
      }
      return;
    }

    // Кейс 3: Техника с условием по времени после регистрации
    if (technique.unlock_condition_type === 'after_duration' && technique.unlock_condition_value) {
      const durationDays = technique.unlock_condition_value.duration_days || 0;
      const durationText = durationDays === 30 ? '1 месяц' :
                          durationDays === 60 ? '2 месяца' :
                          durationDays === 90 ? '3 месяца' :
                          `${durationDays} дней`;
      setModalDescription(`Становится доступной к покупке через ${durationText} после регистрации в программе`);
      return;
    }

    // Кейс 4: Техника недоступна по другим причинам
    if (technique.purchase_info?.reason) {
      setModalDescription(technique.purchase_info.reason);
      return;
    }

    // Fallback
    setModalDescription('Техника временно недоступна');
  };

  // Обработчик клика по технике
  const handleTechniqueClick = (techniqueId: string) => {
    logger.debug('Opening technique', { techniqueId });

    // Найти технику во всех списках
    const technique = [...availableTechniques, ...lockedTechniques, ...myTechniques, ...freeTechniques, ...moduleTechniques]
      .find(t => t.id === techniqueId);

    if (!technique) {
      navigate(`/techniques/${techniqueId}`);
      return;
    }

    // Кейс 1: Техника из модуля, заблокированная по времени (is_unlocked = false)
    if (technique.user_access_source === 'module' && technique.is_unlocked === false) {
      getBlockedModalContent(technique);
      setShowBlockedModal(true);
      return;
    }

    // Кейс 2: Техника заблокирована (нет доступа и нельзя купить, не бесплатная)
    if (!technique.has_access && !technique.can_purchase && technique.status !== 'free') {
      if (!isGuest) {
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
      <style>{`
        .page-container .content-wrapper {
          background-color: transparent !important;
        }
        .page-container {
          background-color: transparent !important;
        }
      `}</style>
      <div
        className="flex flex-col min-h-screen pb-4"
        style={{
          backgroundImage: 'url(/background2.png)',
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
        <div
          className="rounded-[32px] overflow-hidden flex-1"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {/* Табы внутри блока */}
          <div className="flex items-end">
            {/* Левый таб */}
            <button
              onClick={() => setActiveTab('all')}
              className="flex-1 py-2.5 font-medium text-sm whitespace-nowrap transition-all"
              style={
                activeTab === 'all'
                  ? {
                    background: '#0000004D',
                    color: 'white',
                    borderTopLeftRadius: '32px',
                  }
                  : {
                    background: '#FFFFFF33',
                    color: 'white',
                  }
              }
            >
              Все техники
            </button>

            {/* SVG квадрат между табами - две дуги по формуле */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              className="flex-shrink-0 self-end"
              style={{
                display: 'block',
                transform: activeTab === 'mine' ? 'scaleX(-1)' : 'none',
              }}
            >
              {/* Тёмная часть - активный таб (слева) */}
              <path d="M40 40A26 26 0 0 1 20 20A26 26 0 0 0 0 0V40H40Z" fill="#0000004D" />
              {/* Светлая часть - неактивный таб (справа) */}
              <path d="M40 40A26 26 0 0 1 20 20A26 26 0 0 0 0 0H40V40Z" fill="#FFFFFF33" />
            </svg>

            {/* Правый таб */}
            <button
              onClick={() => setActiveTab('mine')}
              className="flex-1 py-2.5 font-medium text-sm whitespace-nowrap transition-all"
              style={
                activeTab === 'mine'
                  ? {
                    background: '#0000004D',
                    color: 'white',
                    borderTopRightRadius: '32px',
                  }
                  : {
                    background: '#FFFFFF33',
                    color: 'white',
                  }
              }
            >
              Мои техники
            </button>
          </div>

          {/* Контент со статичным фоном */}
          <div
            className="min-h-[500px] p-4"
            style={{
              background: '#0000004D',
              borderTopLeftRadius: activeTab === 'mine' ? '32px' : '0px',
              borderTopRightRadius: activeTab === 'all' ? '32px' : '0px',
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
                    <LoadingSpinner size={64} />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center">
                      <p className="text-sm text-red-300">Ошибка загрузки техник</p>
                      <p className="text-xs text-white/60 mt-1">{error.message}</p>
                    </div>
                  </div>
                ) : (activeTab === 'mine' && myTechniques.length === 0 && bundleGroups.length === 0 && myFreeTechniques.length === 0) ? (
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
                        {/* Секция "Мои" - техники к которым есть доступ (включая пакеты) */}
                        {(myTechniques.length > 0 || bundleGroups.length > 0) && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">Мои</h2>
                            <div className="flex flex-col gap-3">
                              {/* Обычные техники */}
                              {myTechniques.map((technique) => (
                                <TechniqueCard
                                  key={technique.id}
                                  technique={technique}
                                  onClick={() => handleTechniqueClick(technique.id)}
                                />
                              ))}
                              {/* Техники из пакетов */}
                              {bundleGroups.flatMap((bundle) => bundle.techniques).map((technique) => (
                                <TechniqueCard
                                  key={technique.id}
                                  technique={technique}
                                  onClick={() => handleTechniqueClick(technique.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Секция "Модули" - техники из модулей, заблокированные по времени */}
                        {moduleTechniques.length > 0 && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">Модули</h2>
                            <div className="flex flex-col gap-3">
                              {moduleTechniques.map((technique) => (
                                <TechniqueCard
                                  key={technique.id}
                                  technique={technique}
                                  onClick={() => handleTechniqueClick(technique.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Секция "К покупке" - платные техники доступные к покупке */}
                        {availableTechniques.length > 0 && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">К покупке</h2>
                            <div className="flex flex-col gap-3">
                              {availableTechniques.map((technique) => (
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
                        {myTechniques.length === 0 && bundleGroups.length === 0 && moduleTechniques.length === 0 && availableTechniques.length === 0 && freeTechniques.length === 0 && (
                          <div className="flex items-center justify-center h-full min-h-[300px]">
                            <p className="text-sm text-white/60">Нет доступных техник</p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Таб "Мои техники" - группируем по секциям */
                      <div className="flex flex-col gap-4">
                        {/* Секция "Мои" - техники с прямым доступом и из пакетов */}
                        {(myTechniques.length > 0 || bundleGroups.length > 0) && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">Мои</h2>
                            <div className="flex flex-col gap-3">
                              {/* Обычные техники */}
                              {myTechniques.map((technique) => (
                                <TechniqueCard
                                  key={technique.id}
                                  technique={technique}
                                  onClick={() => handleTechniqueClick(technique.id)}
                                />
                              ))}
                              {/* Техники из пакетов */}
                              {bundleGroups.flatMap((bundle) => bundle.techniques).map((technique) => (
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
                        {myFreeTechniques.length > 0 && (
                          <div>
                            <h2 className="text-[20px] font-semibold text-white mb-3 leading-none tracking-normal">Бесплатные</h2>
                            <div className="flex flex-col gap-3">
                              {myFreeTechniques.map((technique) => (
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
                        {myTechniques.length === 0 && bundleGroups.length === 0 && myFreeTechniques.length === 0 && (
                          <div className="flex items-center justify-center h-full min-h-[300px]">
                            <p className="text-sm text-white/60">
                              {isGuest ? 'Станьте учеником, чтобы получить доступ к техникам' : 'У вас пока нет техник'}
                            </p>
                          </div>
                        )}
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
