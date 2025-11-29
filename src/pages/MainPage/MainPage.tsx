import { Page } from "@/components";
import { useSupabaseUser, useUserStreamInfo, useUserStreamModules, useFirstIncompleteLesson } from "@/lib/supabase/hooks";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";
import { Link } from "react-router-dom";
import { UserProgress } from "@/components/UserProgress/UserProgress.tsx";
import { Ripple } from "@/components/ui/Ripple/Ripple.tsx";
import StageCard from "@/components/StageCard/StageCard.tsx";
import { motion } from "framer-motion";
import { useState, useDeferredValue } from "react";
import { Map, Search, X, Loader2 } from "lucide-react";
import RoadMapModal from "@/components/RoadMap/RoadMapModal";
import { useGuestStatus } from "@/lib/supabase/hooks/useIsGuest";
import GuestBlockedModal from "@/components/GuestBlockedModal";
import { useGlobalSearch } from "@/lib/supabase/hooks/useGlobalSearch";
import SearchResultCard from "@/components/SearchResultCard/SearchResultCard";
import searchIcon from '@/shared/assets/icons/search.svg';
import roadmapIcon from '@/shared/assets/icons/roadmap.svg';
import dnaIcon from '@/shared/assets/icons/dna.svg';
import './MainPage.css'

const listVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'tween',
            ease: 'easeOut',
            duration: 0.3
        }
    },
};

export const MainPage = () => {
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser } = useSupabaseUser(initDataSignal);
    const [isRoadMapOpen, setIsRoadMapOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showGuestModal, setShowGuestModal] = useState(false);

    // Проверяем является ли пользователь гостем
    const { isGuest } = useGuestStatus(supabaseUser?.id);

    // Получаем информацию о потоке и неделе обучения
    const { data: streamInfo } = useUserStreamInfo(supabaseUser?.id);

    // Используем хук для получения модулей потока пользователя
    const { modulesAsStages, loading: isLoading } = useUserStreamModules(supabaseUser?.id);

    // Получаем первый урок с невыполненным заданием
    const { data: firstIncompleteLesson } = useFirstIncompleteLesson(supabaseUser?.id);

    // Дебаунс поискового запроса для оптимизации
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // Глобальный поиск по ступеням и блокам
    const { results: searchResults, loading: searchLoading } = useGlobalSearch(
        supabaseUser?.id,
        deferredSearchQuery,
        2 // Минимум 2 символа для поиска
    );

    // Показываем результаты поиска если есть запрос
    const isSearching = searchQuery.length >= 2;


    if (!supabaseUser?.id || isLoading) {
        return (
            <Page back={false}>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка модулей...</p>
                </div>
            </Page>
        );
    }

    if (modulesAsStages?.length === 0 && !isLoading) {
        return (
            <Page back={false}>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    У вас нет доступных модулей. Убедитесь, что вы добавлены в поток обучения.
                </div>
            </Page>
        );
    }

    return (
        <Page back={false}>
            <div
                className={'bg-[url("/bg3.jpg")] bg-cover bg-bottom p-4 pt-3 rounded-b-3xl flex-1 flex flex-col gap-5'}
            >
                <motion.div
                    className={'flex items-center justify-between w-full'}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                >
                    <div className="flex gap-2 justify-between w-full">
                        <div className="flex justify-between items-center gap-2.25">
                            <Ripple className="rounded-full overflow-hidden">
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <Link to={'/profile2'} className={'block'}>
                                        <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full border border-white'}
                                            alt={'Профиль'} />
                                    </Link>
                                </motion.div>
                            </Ripple>

                            <Ripple className="roadmap">
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <Link to={'/points'} className="roadmap__link">

                                        <div className="flex gap-1 items-center">
                                            <p className={'text-black font-semibold leading-4'}>{supabaseUser?.total_points}</p>
                                            <img src={dnaIcon} alt="search" />
                                        </div>
                                    </Link>
                                </motion.div>
                            </Ripple>
                        </div>

                        {/* Кнопка дорожной карты */}
                        <Ripple className="rounded-full overflow-hidden">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                style={{ touchAction: 'manipulation' }}
                                onClick={() => {
                                    // Гость может открыть карту и видеть её (но с заблокированными элементами)
                                    setIsRoadMapOpen(true);
                                }}
                                className="roadmap"
                                title="Дорожная карта"
                            >
                                <div className="flex gap-1 ">
                                    <span className={'text-black font-semibold '}>Дорожная карта</span>
                                    <img src={roadmapIcon} alt="search" />
                                </div>
                            </motion.button>
                        </Ripple>
                    </div>

                </motion.div>

                {/* Поле поиска */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className="relative"
                >
                    <div className="relative">
                        <img className="search" src={searchIcon} alt="search" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по модулям"
                            className="w-full bg-white/90 backdrop-blur-sm rounded-xl pl-10 pr-10 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className="flex flex-col gap-4"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {isSearching ? (
                        // Режим поиска - показываем результаты глобального поиска
                        <>
                            {searchLoading ? (
                                <motion.div
                                    variants={itemVariants}
                                    className="flex items-center justify-center py-8 bg-white/90 backdrop-blur-sm rounded-xl"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                                    <p className="text-sm text-gray-500">Поиск...</p>
                                </motion.div>
                            ) : searchResults.length > 0 ? (
                                <>
                                    <motion.p
                                        variants={itemVariants}
                                        className="text-xs text-gray-600 px-1"
                                    >
                                        Найдено: {searchResults.length} результатов
                                    </motion.p>
                                    {searchResults.map((result, i) => (
                                        <div
                                            key={`${result.stage_id}-${result.block_id || 'stage'}-${i}`}
                                            onClick={() => {
                                                if (!result.is_unlocked) {
                                                    setShowGuestModal(true);
                                                    return;
                                                }
                                                // Принудительная навигация с перезагрузкой
                                                const url = `${window.location.origin}${window.location.pathname}#/library/lesson/${result.lesson_id}`;
                                                window.location.assign(url);
                                                window.location.reload();
                                            }}
                                            className="cursor-pointer active:scale-[0.98] transition-transform"
                                        >
                                            <SearchResultCard
                                                result={result}
                                                onDisabledClick={() => setShowGuestModal(true)}
                                            />
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <motion.div
                                    variants={itemVariants}
                                    className="text-center py-8 bg-white/90 backdrop-blur-sm rounded-xl"
                                >
                                    <p className="text-sm text-gray-500">
                                        Ничего не найдено по запросу "{searchQuery}"
                                    </p>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Сбросить поиск
                                    </button>
                                </motion.div>
                            )}
                        </>
                    ) : (
                        // Обычный режим - показываем модули
                        modulesAsStages && modulesAsStages.length > 0 ? (
                            modulesAsStages.map((stage, i) => (
                                <motion.div
                                    key={stage.stage_id}
                                    variants={itemVariants}
                                >
                                    <StageCard
                                        id={stage.stage_id}
                                        name={stage.stage_name}
                                        isLocked={!stage.is_unlocked}
                                        coverImagePath={stage.cover_image_path || undefined}
                                        orderNum={i + 1}
                                        isGuest={isGuest}
                                        unlockDay={stage.unlock_day}
                                        moduleId={stage.module_id}
                                        streamStartDate={streamInfo?.startDate}
                                    />
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                variants={itemVariants}
                                className="text-center py-8 bg-white/90 backdrop-blur-sm rounded-xl"
                            >
                                <p className="text-sm text-gray-500">
                                    Нет доступных модулей
                                </p>
                            </motion.div>
                        )
                    )}
                </motion.div>

            </div>
            <UserProgress stages={modulesAsStages || []} className="mt-5" nextLessonId={firstIncompleteLesson?.lessonId} />

            {/* Модалка дорожной карты */}
            <RoadMapModal
                isOpen={isRoadMapOpen}
                onClose={() => setIsRoadMapOpen(false)}
                stages={modulesAsStages || []}
                onStageClick={(stageId) => {
                    // Можно добавить навигацию к модулю или просто закрыть
                    console.log('Clicked module:', stageId);
                }}
                isGuest={isGuest}
                onGuestBlock={() => {
                    setIsRoadMapOpen(false);
                    setShowGuestModal(true);
                }}
                userPhotoUrl={supabaseUser?.photo_url || undefined}
                currentWeek={streamInfo?.currentWeek || 1}
                totalWeeks={streamInfo?.totalWeeks || 9}
            />

            {/* Модалка для гостей */}
            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                ctaUrl="https://brainprogramming.ru/enroll"
            />
        </Page>
    )
}