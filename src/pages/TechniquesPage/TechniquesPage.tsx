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
      <div className="flex flex-col h-full bg-[#F5F5F7]">
        {/* Заголовок */}
        <div className="px-4 pt-6 pb-4 bg-white">
          <h1 className="text-2xl font-bold text-black">Библиотека</h1>
        </div>

        {/* Табы */}
        <div className="flex gap-2 px-4 py-4 overflow-x-auto bg-white border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-[#8E8E93] text-white'
                    : 'bg-[#E5E5EA] text-[#242424] hover:bg-[#D1D1D6]'
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
                <p className="text-sm text-[#666]">Загрузка...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-red-500">Ошибка загрузки техник</p>
                <p className="text-xs text-[#666] mt-1">{error.message}</p>
              </div>
            </div>
          ) : currentTechniques.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-[#666]">
                  {activeTab === 'all' && 'Нет доступных техник'}
                  {activeTab === 'mine' && isGuest && 'Станьте учеником, чтобы получить доступ к техникам'}
                  {activeTab === 'mine' && !isGuest && 'У вас пока нет техник'}
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
                      <h2 className="text-base font-semibold text-black mb-3 px-1">К покупке</h2>
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

                  {/* Секция "Мои техники" */}
                  {myTechniques.length > 0 && (
                    <div>
                      <h2 className="text-base font-semibold text-black mb-3 px-1">Мои техники</h2>
                      <div className="flex flex-col gap-2">
                        {myTechniques.map((technique) => (
                          <TechniqueCard
                            key={technique.id}
                            technique={technique}
                            onClick={() => handleTechniqueClick(technique.id)}
                          />
                        ))}
                      </div>
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
              <div className="flex flex-col gap-3 mt-6 mb-4">
                <button className="w-full py-3 bg-[#007AFF] text-white text-sm font-medium rounded-2xl hover:bg-[#0051D5] transition-colors">
                  Библиотека+
                </button>
                <button className="w-full py-3 bg-[#8E8E93] text-white text-sm font-medium rounded-2xl hover:bg-[#636366] transition-colors">
                  Запустить биорегулирование
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};

export default TechniquesPage;
