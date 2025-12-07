import { useSupabaseUser, usePreviewStreamModules } from '@/lib/supabase/hooks';
import { useMemo, useState } from "react";
import {
    initDataState as _initDataState,
    useSignal,
} from '@telegram-apps/sdk-react';
import { Link } from "react-router-dom";
import { Page } from "@/components/Page";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { clsx } from "clsx";
import { useUserStreamModules } from '@/lib/supabase/hooks/useUserStreamModules';
import { motion } from "framer-motion";
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import HealingChartRecharts from "@/components/Chart.tsx";
import { getNounPluralForm } from '@/helpers/pluralize';

const links = [{
    link: '/chats',
    title: 'Чаты обучения',
    image: '/bg-chat.png',
    className: 'scale-[0.5] top-[70px]'
},
{
    link: '/faq',
    title: 'FAQ',
    image: '/sphere-faq.png',
    className: 'scale-[0.8]'
},

{
    link: '/help',
    title: 'Помощь',
    image: '/new-micro.png', className: 'scale-[0.7] -right-[50px] top-[60px]'
}
]

// Варианты анимации для гармонии с другими страницами
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

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'tween',
            ease: 'easeOut',
            duration: 0.2,
            staggerChildren: 0.06,
            delayChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            type: 'tween',
            ease: 'easeIn',
            duration: 0.15
        }
    },
};

export const UserPage = () => {
    const initDataState = useSignal(_initDataState);
    const { supabaseUser, loading, error } = useSupabaseUser(initDataState);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const user = useMemo(() =>
        initDataState && initDataState.user ? initDataState.user : undefined,
        [initDataState]);

    // Проверяем является ли пользователь гостем
    const { isGuest } = useGuestStatus(supabaseUser?.id);

    // Используем хук для получения модулей потока пользователя
    const { modulesAsStages: userModules, loading: stagesLoading, error: stagesError } = useUserStreamModules(supabaseUser?.id);

    // Preview данные для гостей без тарифа/потока
    const { data: previewModules, isLoading: previewLoading, error: previewError } = usePreviewStreamModules();

    // Логируем ошибки для отладки
    if (stagesError) {
        console.error('useUserStreamModules error:', stagesError);
    }
    if (previewError) {
        console.error('usePreviewStreamModules error:', previewError);
    }

    // Определяем используем ли preview режим (нет модулей у пользователя)
    const isPreviewMode = !stagesLoading && (!userModules || userModules.length === 0);

    // Преобразуем preview модули в формат modulesAsStages
    const previewModulesAsStages = useMemo(() => {
        if (!previewModules) return [];
        return previewModules.map(m => ({
            stage_id: m.first_stage_id || 0,
            stage_name: m.module_name,
            is_unlocked: true, // Для preview визуально разблокировано
            cover_image_path: m.module_cover_image || null,
            unlock_day: m.unlock_day,
            module_id: m.module_id,
            total_lessons: m.total_lessons,
            completed_lessons: m.completed_lessons,
            unlocked_lessons: m.unlocked_lessons,
            overdue_lessons: m.overdue_lessons,
            total_assignments: m.total_assignments,
            completed_assignments: m.completed_assignments,
            overdue_assignments: m.overdue_assignments,
        }));
    }, [previewModules]);

    // Итоговые данные: используем пользовательские или preview
    const stages = isPreviewMode ? previewModulesAsStages : userModules;

    // Получение тарифа текущего пользователя
    const { data: userTariff } = useQuery({
        queryFn: async () => {
            if (!supabase || !supabaseUser?.id) return null

            const { data: currentTariffData, error: tariffError } = await supabase
                .from('user_tariffs')
                .select(`
                    tariff_id,
                    tariffs (
                        id,
                        name,
                        code,
                        description
                    )
                `)
                .eq('user_id', supabaseUser.id)
                .eq('is_active', true)
                .single();

            // Игнорируем ошибку если тариф не найден (пользователь может не иметь тарифа)
            if (tariffError || !currentTariffData || !currentTariffData.tariffs) {
                return null;
            }

            return currentTariffData.tariffs as any;
        },
        queryKey: ['user-tariff', supabaseUser?.id],
        enabled: !!supabaseUser?.id
    });

    const currentLevel = useMemo(() => {
        if (!stages) return 1;
        const unlockedStages = stages.filter(s => s.is_unlocked);
        return unlockedStages.length > 0 ? unlockedStages.length : 1;
    }, [stages]);

    // Суммируем задания по всем разблокированным модулям
    const totalAssignments = useMemo(() => {
        if (!stages) return 0;
        return stages.filter(s => s.is_unlocked).reduce((acc, stage) => acc + (stage.total_assignments || 0), 0);
    }, [stages]);

    const completedAssignments = useMemo(() => {
        if (!stages) return 0;
        return stages.filter(s => s.is_unlocked).reduce((acc, stage) => acc + (stage.completed_assignments || 0), 0);
    }, [stages]);

    const overdueAssignments = useMemo(() => {
        if (!stages) return 0;
        return stages.filter(s => s.is_unlocked).reduce((acc, stage) => acc + (stage.overdue_assignments || 0), 0);
    }, [stages]);

    // Рассчитываем позицию на графике (0-8) на основе прошедших дней модуля
    const chartCurrent = useMemo(() => {
        if (!stages || stages.length === 0) return 0;
        const unlockedStages = stages.filter(s => s.is_unlocked);
        if (unlockedStages.length === 0) return 0;

        // Считаем общее количество дней во всех модулях и сколько прошло
        let totalDaysAllModules = 0;
        let passedDaysAllModules = 0;

        stages.forEach(stage => {
            const totalLessons = stage.total_lessons ?? 0;
            totalDaysAllModules += totalLessons;

            if (stage.is_unlocked) {
                // Для разблокированных модулей считаем прошедшие дни (unlocked_lessons)
                passedDaysAllModules += stage.unlocked_lessons ?? 0;
            }
        });

        if (totalDaysAllModules === 0) return 0;

        // Масштабируем на шкалу 0-8 (9 точек графика)
        const progress = passedDaysAllModules / totalDaysAllModules;
        return Math.min(8, Math.round(progress * 8));
    }, [stages]);


    // Загрузка: ждём пользователя и данные модулей (включая preview)
    const isFullyLoading = loading || stagesLoading || (isPreviewMode && previewLoading);

    if (isFullyLoading) {
        return (
            <Page back={false}>
                <LoadingSpinner />
            </Page>
        );
    }

    // Если есть ошибка при получении данных (кроме preview - там допустимо)
    if (error || (stagesError && !isPreviewMode)) {
        return (
            <Page back={false}>
                <div className="profile-error">
                    <div className="profile-error-icon" aria-hidden="true">⚠️</div>
                    <h2>Ошибка</h2>
                    <p>{error?.message || stagesError?.message}</p>
                </div>
            </Page>
        );
    }

    // Если нет данных пользователя
    if (!user) {
        return (
            <Page back={false}>
                <div className="profile-error">
                    <div className="profile-error-icon" aria-hidden="true">⚠️</div>
                    <h2>Нет данных</h2>
                    <p>Не удалось получить данные пользователя</p>
                </div>
            </Page>
        );
    }

    // Проверяем наличие ступеней
    const currentStage = stages && stages.length > 0 ? stages[currentLevel - 1] : null;
    return (
        <Page back={false}>
            <div className={'relative text-black min-h-screen bg-white pt-[180px] overflow-hidden'}>
                <video
                    className={'absolute top-[150px] left-1/2 -translate-y-1/2 -translate-x-1/2 rotate-[16deg] object-cover scale-125'}
                    src="/brain2.mov"        /* или CDN-ссылка */
                    autoPlay
                    muted
                    loop
                    playsInline
                />
                <motion.div
                    className={'page-bg-container rounded-t-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom relative'}
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    <div className={'flex flex-col gap-2 items-center absolute -top-[94px] left-1/2 -translate-x-1/2 z-30'}>
                        {user?.photo_url ?
                            <img className={'w-36 h-36 rounded-full border-2 border-white'} src={user.photo_url}
                                alt="" /> :
                            <svg className={'w-36 h-36 rounded-full bg-white'} width="57" height="56"
                                viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M47.1673 49.0001C47.1673 42.5568 38.81 37.3334 28.5007 37.3334C18.1913 37.3334 9.83398 42.5568 9.83398 49.0001M28.5007 30.3334C22.0573 30.3334 16.834 25.1101 16.834 18.6668C16.834 12.2234 22.0573 7.0001 28.5007 7.0001C34.944 7.0001 40.1673 12.2234 40.1673 18.6668C40.1673 25.1101 34.944 30.3334 28.5007 30.3334Z"
                                    stroke="#8C8C8C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>}

                    </div>
                    <p className={'pt-[58px] text-xl font-semibold text-center text-wrap max-w-full px-3 mb-2'}>Привет, {user?.first_name}</p>
                    <motion.div variants={itemVariants} className={' grid grid-cols-2 gap-3 mb-3 px-4'}>
                        {/* Блок уровня с графиком */}
                        <div className={'row-span-2 flex flex-col items-center justify-center gap-3 px-2 rounded-2xl bg-white relative overflow-hidden'}>
                            {(isGuest || isPreviewMode) && (
                                <div
                                    className="absolute inset-0 bg-black/30 z-10 cursor-pointer rounded-2xl flex items-center justify-center"
                                    onClick={() => setShowGuestModal(true)}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                            )}
                            <div className={'flex items-center flex-col gap-2'}>
                                <p className={'text-sm text-center font-medium text-[#9F9F9F]'}>Ваш уровень</p>
                                <p className={'font-bold text-sm uppercase'}>
                                    {currentStage?.stage_name || 'Неизвестная ступень'}
                                </p>
                                <HealingChartRecharts current={(isGuest || isPreviewMode) ? 0 : chartCurrent} />
                            </div>
                        </div>
                        <div className={'p-3 rounded-2xl bg-white flex items-center flex-col relative overflow-hidden'}>
                            {(isGuest || isPreviewMode) && (
                                <div
                                    className="absolute inset-0 bg-black/30 z-10 cursor-pointer rounded-2xl flex items-center justify-center"
                                    onClick={() => setShowGuestModal(true)}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                            )}
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Выполнено</p>
                            <p className={'text-[20px] font-bold'}>{(isGuest || isPreviewMode) ? `0 ${getNounPluralForm(0, 'задание', 'задания', 'заданий')}` : `${completedAssignments} ${getNounPluralForm(completedAssignments, 'задание', 'задания', 'заданий')}`}</p>
                        </div>
                        <div className={'p-3 rounded-2xl bg-white flex items-center flex-col relative overflow-hidden'}>
                            {(isGuest || isPreviewMode) && (
                                <div
                                    className="absolute inset-0 bg-black/30 z-10 cursor-pointer rounded-2xl flex items-center justify-center"
                                    onClick={() => setShowGuestModal(true)}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                            )}
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>
                                Просрочено
                            </p>
                            <p className={'text-[20px] font-bold'}>{(isGuest || isPreviewMode) ? `0 ${getNounPluralForm(0, 'день', 'дня', 'дней')}` : `${overdueAssignments} ${getNounPluralForm(overdueAssignments, 'день', 'дня', 'дней')}`}</p>
                        </div>
                        <div
                            className={'py-2 px-4 rounded-2xl bg-white flex items-center col-span-2 gap-2 justify-between relative overflow-hidden'}>
                            {(isGuest || isPreviewMode) && (
                                <div
                                    className="absolute inset-0 bg-black/30 z-10 cursor-pointer rounded-2xl flex items-center justify-center"
                                    onClick={() => setShowGuestModal(true)}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                            )}
                            <div className={'flex gap-2 items-center'}>
                                <img src={'/coin3.png'} style={{ width: 45, height: 46 }} alt="coin" />
                                <div className={'flex flex-col'}>
                                    <p className={'text-sm font-medium text-[#9F9F9F]'}>Ваш баланс</p>
                                    <p className={'text-sm font-bold'}>{(isGuest || isPreviewMode) ? '0' : `${supabaseUser?.total_points}`} эдельштейнов</p>
                                </div>
                            </div>
                            <Ripple className="rounded-3xl overflow-hidden inline-block">
                                <Link to={(isGuest || isPreviewMode) ? '#' : '/points'} onClick={(isGuest || isPreviewMode) ? (e) => { e.preventDefault(); setShowGuestModal(true); } : undefined}
                                    className={"text-sm font-bold w-max leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)] block"}>
                                    Подробнее
                                </Link>
                            </Ripple>
                        </div>
                    </motion.div>

                    {/* Tariff Block */}
                    <motion.div variants={itemVariants} className="px-4 mb-3">
                        <div className="bg-white rounded-2xl p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-[#9F9F9F]">Тариф</p>
                                        {/*<Ripple className="rounded-full overflow-hidden inline-block">
                                            <img src="/ask-icon.svg" alt="info" className="w-4 h-4"/>
                                        </Ripple>*/}
                                    </div>
                                    <p className="text-sm font-bold text-black">
                                        {(isGuest || isPreviewMode) ? 'Гость' : (userTariff ? userTariff.name : 'Базовый')}
                                    </p>
                                </div>
                                <a href={(isGuest || isPreviewMode) ? '#' : 'https://t.me/katyaasta'} target={(isGuest || isPreviewMode) ? '_self' : '_blank'} onClick={(isGuest || isPreviewMode) ? (e) => { e.preventDefault(); window.open('https://brainprogramming.ru/enroll', '_blank'); } : undefined}>
                                    <Ripple className="rounded-3xl overflow-hidden inline-block">
                                        <button
                                            className="text-sm font-bold w-max leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]">
                                            {(isGuest || isPreviewMode) ? 'Стать учеником' : 'Стать учеником'}
                                        </button>
                                    </Ripple>
                                </a>
                            </div>
                            <p className="text-sm text-[#9F9F9F] leading-tight">
                                {(isGuest || isPreviewMode) ? 'Зарегистрируйтесь, чтобы получить доступ к полному функционалу платформы.' : (userTariff?.description || 'Базовый тарифный план с ограниченным доступом к материалам.')}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className={'bg-white rounded-t-3xl pt-5'}>
                        <div className={'px-4 flex flex-col gap-3'}>
                            {links.map((el, i) => {
                                const isBlocked = (isGuest || isPreviewMode) && (el.link === '/chats' || el.link === '/faq' || el.link === '/help');
                                return (
                                    <Ripple key={el.link} className="rounded-2xl overflow-hidden">
                                        <div className="relative">
                                            <Link
                                                className={'relative bg-[linear-gradient(271.99deg,_#F1F8FE_0%,_#F1EFFF_100%)] py-4 px-6 rounded-2xl flex flex-col gap-2 items-start justify-between block'}
                                                to={isBlocked ? '#' : el.link}
                                                onClick={isBlocked ? (e) => { e.preventDefault(); setShowGuestModal(true); } : undefined}>
                                                <p className={'font-semibold'}>{el.title}</p>
                                                <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'} />
                                                <img src={el.image}
                                                    className={clsx(`absolute mt-4 top-1/2 -right-[70px] -translate-y-1/2 bg-breathe-${i + 5}`, el.className)} />
                                            </Link>
                                            {isBlocked && (
                                                <div
                                                    className="absolute inset-0 bg-black/20 z-10 cursor-pointer rounded-2xl"
                                                    onClick={() => setShowGuestModal(true)}
                                                >
                                                    <div
                                                        className="absolute top-2 right-2 flex items-center gap-1 rounded-full"
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: 'linear-gradient(90deg, rgba(34, 34, 34, 0.6) 0%, rgba(117, 117, 117, 0.6) 100%)',
                                                            backdropFilter: 'blur(30px)',
                                                            WebkitBackdropFilter: 'blur(30px)',
                                                        }}
                                                    >
                                                        <span style={{ fontFamily: 'Nunito', fontWeight: 500, fontSize: '12px', lineHeight: '14px', color: 'white' }}>Только ученикам</span>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Ripple>
                                )
                            })}
                        </div>
                    </motion.div>
                </motion.div>
                {/* end of stats grid */}
            </div>

            {/* Модалка для гостей */}
            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                ctaUrl="https://brainprogramming.ru/enroll"
            />
        </Page>
    )
}