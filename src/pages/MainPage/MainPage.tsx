import { Page } from "@/components";
import { useSupabaseUser, useActiveCourse } from "@/lib/supabase/hooks";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";
import { Link } from "react-router-dom";
import { UserProgress } from "@/components/UserProgress/UserProgress.tsx";
import useLibraryStages from '@/lib/supabase/hooks/useLibraryStages';
import { Ripple } from "@/components/ui/Ripple/Ripple.tsx";
import StageCard from "@/components/StageCard/StageCard.tsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { Map, Search, X } from "lucide-react";
import RoadMapModal from "@/components/RoadMap/RoadMapModal";
import { useGuestStatus } from "@/lib/supabase/hooks/useIsGuest";
import GuestBlockedModal from "@/components/GuestBlockedModal";

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

    // Получаем активный курс пользователя
    const { activeCourse } = useActiveCourse(supabaseUser?.id);

    // Используем хук для получения ступеней с поддержкой fallback
    const { stages, loading: isLoading } = useLibraryStages(
        supabaseUser?.id || null,
        activeCourse?.course_id || null
    );

    // Фильтрация модулей по поисковому запросу
    const filteredStages = stages?.filter((stage) =>
        stage.stage_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];


    if (!supabaseUser?.id || isLoading) {
        return (
            <Page back={false}>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка ступеней...</p>
                </div>
            </Page>
        );
    }


    if (stages?.length === 0 && !isLoading) {
        return (
            <Page back={false}>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Нет доступных этапов для этого курса.</div>
            </Page>
        );
    }

    return (
        <Page back={false}>
            <div
                className={'bg-[url("/bg3.jpg")] bg-cover bg-bottom p-4 pt-24 rounded-b-3xl flex-1 flex flex-col gap-3'}
            >
                <motion.div
                    className={'flex items-center justify-between w-full'}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                >
                    <div className="flex items-center gap-2">
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

                        {/* Кнопка дорожной карты */}
                        <Ripple className="rounded-full overflow-hidden">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                style={{ touchAction: 'manipulation' }}
                                onClick={() => {
                                    if (isGuest) {
                                        setShowGuestModal(true);
                                    } else {
                                        setIsRoadMapOpen(true);
                                    }
                                }}
                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                                title="Дорожная карта"
                            >
                                <Map className="w-4 h-4 text-gray-700" />
                            </motion.button>
                        </Ripple>
                    </div>

                    <Ripple className="rounded-full overflow-hidden">
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            style={{ touchAction: 'manipulation' }}
                        >
                            <Link to={'/points'} className={'block flex items-center gap-1 py-[6px] px-2 bg-white'}>
                                <p className={'text-black font-semibold leading-4'}>{supabaseUser?.total_points}</p>
                                <img src={'/eid.svg'} className={'w-5 h-5'} />
                            </Link>
                        </motion.div>
                    </Ripple>
                </motion.div>

                {/* Поле поиска */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className="relative"
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск модулей..."
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
                    {filteredStages.length > 0 ? (
                        filteredStages.map((stage, i) => (
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
                                />
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            variants={itemVariants}
                            className="text-center py-8 bg-white/90 backdrop-blur-sm rounded-xl"
                        >
                            <p className="text-sm text-gray-500">
                                Модули не найдены
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Сбросить поиск
                            </button>
                        </motion.div>
                    )}
                </motion.div>

            </div>
            <UserProgress stages={stages || []} />

            {/* Модалка дорожной карты */}
            <RoadMapModal
                isOpen={isRoadMapOpen}
                onClose={() => setIsRoadMapOpen(false)}
                stages={stages || []}
                onStageClick={(stageId) => {
                    // Можно добавить навигацию к этапу или просто закрыть
                    console.log('Clicked stage:', stageId);
                }}
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