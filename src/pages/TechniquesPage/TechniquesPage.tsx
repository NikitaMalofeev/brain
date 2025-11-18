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

  // Обработчик клика по технике
  const handleTechniqueClick = (techniqueId: string) => {
    logger.debug('Opening technique', { techniqueId });
    navigate(`/techniques/${techniqueId}`);
  };

  return (
    <Page back={false}>
      <div className="flex flex-col h-full bg-[#D1D1D6]">
        {/* Заголовок */}
        <div className="px-4 pt-6 pb-4 bg-[#D1D1D6]">
          <h1 className="text-2xl font-bold text-black">Библиотека</h1>
        </div>

        {/* Табы */}
        <div className="flex gap-2 px-4 py-4 overflow-x-auto bg-[#D1D1D6]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-[#8E8E93] text-white'
                    : 'bg-[#AEAEB2] text-white hover:bg-[#8E8E93]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8E8E93] mb-2"></div>
                <p className="text-sm text-[#3C3C43]/60">Загрузка...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-red-500">Ошибка загрузки техник</p>
                <p className="text-xs text-[#3C3C43]/60 mt-1">{error.message}</p>
              </div>
            </div>
          ) : currentTechniques.length === 0 && activeTab === 'mine' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-[#3C3C43]/60">
                  {isGuest && 'Станьте учеником, чтобы получить доступ к техникам'}
                  {!isGuest && 'У вас пока нет техник'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pt-4">
              {activeTab === 'all' ? (
                <>
                  {/* Секция "К покупке" */}
                  {availableTechniques.length > 0 && (
                    <div>
                      <h2 className="text-base font-semibold text-[#3C3C43] mb-3 px-1">К покупке</h2>
                      <div className="flex flex-col gap-2">
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
                      <h2 className="text-base font-semibold text-[#3C3C43] mb-3 px-1">Бесплатные</h2>
                      <div className="flex flex-col gap-2">
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
                  {availableTechniques.length === 0 && freeTechniques.length === 0 && (
                    <div className="flex items-center justify-center h-full pt-20">
                      <p className="text-sm text-[#3C3C43]/60">Нет доступных техник</p>
                    </div>
                  )}
                </>
              ) : (
                /* Таб "Мои техники" */
                <div className="flex flex-col gap-2">
                  {currentTechniques.map((technique) => (
                    <TechniqueCard
                      key={technique.id}
                      technique={technique}
                      onClick={() => handleTechniqueClick(technique.id)}
                    />
                  ))}
                </div>
              )}

              {/* Кнопки внизу */}
              {(availableTechniques.length > 0 || freeTechniques.length > 0 || myTechniques.length > 0) && (
                <div className="flex flex-col gap-3 mt-6 mb-4">
                  <button className="w-full py-3.5 bg-[#5AC8FA] text-white text-sm font-semibold rounded-[20px] hover:bg-[#32ADE6] transition-colors active:scale-[0.98]">
                    Библиотека
                  </button>
                  <button className="w-full py-3.5 bg-[#8E8E93] text-white text-sm font-semibold rounded-[20px] hover:bg-[#636366] transition-colors active:scale-[0.98]">
                    Запустить биорегулирование
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};

export default TechniquesPage;
