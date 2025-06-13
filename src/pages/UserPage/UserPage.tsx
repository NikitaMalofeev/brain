import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useMemo } from "react";
import {
    initDataState as _initDataState,
    useSignal,
} from '@telegram-apps/sdk-react';
import { Link } from "react-router-dom";
import { Page } from "@/components";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { COURSE_CONFIG } from '@/lib/config/constants';
import { StageProgressData } from '@/components/UserProgress/UserProgress';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import HealingChart from "@/components/Chart.tsx";
import HealingChartRecharts from "@/components/Chart.tsx";
import { clsx } from "clsx";
import useLibraryStages from '@/lib/supabase/hooks/useLibraryStages';

const links = [{
    link: '/chats',
    title: 'Важные чаты',
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
    image: '/micro.png', className: 'scale-[0.5] -right-[50px] top-[60px]'
}
]

export const UserPage = () => {
    const initDataState = useSignal(_initDataState);
    const { supabaseUser, loading, error } = useSupabaseUser(initDataState);
    const user = useMemo(() =>
        initDataState && initDataState.user ? initDataState.user : undefined,
        [initDataState]);

    // Используем хук для получения ступеней с поддержкой fallback
    const { stages, loading: stagesLoading, error: stagesError } = useLibraryStages(
        supabaseUser?.id || null,
        COURSE_CONFIG.DEFAULT_COURSE_ID
    );

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

    const totalLessons = useMemo(() => {
        if (!stages) return 0;
        return stages.filter(s => s.is_unlocked).reduce((acc, stage) => acc + (stage.total_lessons || 0), 0);
    }, [stages]);
    const overdueLessons = useMemo(() => {
        if (!stages) return 0;
        return stages.filter(s => s.is_unlocked).reduce((acc, stage) => acc + (stage.overdue_lessons || 0), 0);
    }, [stages]);


    if (loading || stagesLoading) {
        return (
            <Page back={false}>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка профиля...</p>
                </div>
            </Page>
        );
    }

    // Если есть ошибка при получении данных
    if (error || stagesError) {
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
    return (
        <Page back={false}>
            <div className={'text-black min-h-screen bg-white pt-[180px]'}>
                <img src={'/brain.png'} alt={''} className={'absolute top-[150px] left-1/2 -translate-y-1/2 -translate-x-1/2 rotate-[16deg] object-cover scale-125'} />
                <div className={'rounded-t-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom relative'}>
                    <div className={'flex flex-col gap-2 items-center absolute -top-[94px] left-1/2 -translate-x-1/2'}>
                        {user?.photo_url ? <img className={'w-36 h-36 rounded-full border border-white'} src={user.photo_url} alt="" /> :
                            <svg className={'w-36 h-36 rounded-full bg-white'} width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M47.1673 49.0001C47.1673 42.5568 38.81 37.3334 28.5007 37.3334C18.1913 37.3334 9.83398 42.5568 9.83398 49.0001M28.5007 30.3334C22.0573 30.3334 16.834 25.1101 16.834 18.6668C16.834 12.2234 22.0573 7.0001 28.5007 7.0001C34.944 7.0001 40.1673 12.2234 40.1673 18.6668C40.1673 25.1101 34.944 30.3334 28.5007 30.3334Z"
                                    stroke="#8C8C8C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>}
                        <p className={'text-xl font-semibold'}>Привет, {user?.username}</p>
                    </div>
                    <div className={'pt-[90px] grid grid-cols-2 gap-3 mb-3 px-4'}>
                        <div className={'row-span-2 flex flex-col items-center justify-center gap-3 px-2 rounded-2xl bg-white'}>
                            <div className={'flex items-center flex-col gap-2'}>
                                <p className={'text-sm text-center font-medium text-[#9F9F9F]'}>Ваш уровень секретности</p>
                                <p className={'font-bold text-sm uppercase'}>исцеление</p>
                                <HealingChartRecharts current={Math.round(3 * ((stages?.[currentLevel - 1].completed_lessons ?? 0) / (stages?.[currentLevel - 1].total_lessons ?? 1)))} />
                            </div>
                        </div>
                        <div className={'p-3 rounded-2xl bg-white flex items-center flex-col'}>
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Выполнено</p>
                            <p className={'text-[20px] font-bold'}>{stages?.[currentLevel - 1].completed_lessons} из {stages?.[currentLevel - 1].total_lessons ?? 10}</p>
                            <p className={'text-sm font-bold'}>заданий</p>
                        </div>
                        <div className={'p-3 rounded-2xl bg-white flex items-center flex-col'}>
                            <p className={'text-sm font-medium text-[#9F9F9F] flex items-center gap-1'}>
                                Просрочено
                                {overdueLessons > 0 && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd"
                                        d="M5.22867 2.53465C6.58133 1.73398 7.25733 1.33331 8 1.33331C8.74267 1.33331 9.41867 1.73331 10.7713 2.53465L11.2287 2.80531C12.5813 3.60665 13.2573 4.00731 13.6287 4.66665C14 5.32665 14 6.12665 14 7.72931V8.27065C14 9.87265 14 10.674 13.6287 11.3333C13.2573 11.9926 12.5813 12.3933 11.2287 13.194L10.7713 13.4653C9.41867 14.266 8.74267 14.6666 8 14.6666C7.25733 14.6666 6.58133 14.2666 5.22867 13.4653L4.77133 13.194C3.41867 12.394 2.74267 11.9926 2.37133 11.3333C2 10.6733 2 9.87331 2 8.27065V7.72931C2 6.12665 2 5.32598 2.37133 4.66665C2.74267 4.00731 3.41867 3.60665 4.77133 2.80531L5.22867 2.53465ZM8.66667 10.6666C8.66667 10.8435 8.59643 11.013 8.4714 11.1381C8.34638 11.2631 8.17681 11.3333 8 11.3333C7.82319 11.3333 7.65362 11.2631 7.5286 11.1381C7.40357 11.013 7.33333 10.8435 7.33333 10.6666C7.33333 10.4898 7.40357 10.3203 7.5286 10.1952C7.65362 10.0702 7.82319 9.99998 8 9.99998C8.17681 9.99998 8.34638 10.0702 8.4714 10.1952C8.59643 10.3203 8.66667 10.4898 8.66667 10.6666ZM8 4.16665C8.13261 4.16665 8.25979 4.21932 8.35355 4.31309C8.44732 4.40686 8.5 4.53404 8.5 4.66665V8.66665C8.5 8.79925 8.44732 8.92643 8.35355 9.0202C8.25979 9.11397 8.13261 9.16665 8 9.16665C7.86739 9.16665 7.74022 9.11397 7.64645 9.0202C7.55268 8.92643 7.5 8.79925 7.5 8.66665V4.66665C7.5 4.53404 7.55268 4.40686 7.64645 4.31309C7.74022 4.21932 7.86739 4.16665 8 4.16665Z"
                                        fill="#D2667D" />
                                </svg>}
                            </p>
                            <p className={'text-[20px] font-bold'}>{overdueLessons} из {totalLessons}</p>
                            <p className={'text-sm font-bold'}>заданий</p>
                        </div>
                        <div
                            className={'py-2 px-4 rounded-2xl bg-white flex items-center col-span-2 gap-2 justify-between'}>
                            <div className={'flex gap-2 items-center'}>
                                <div
                                    className={'p-2 rounded-full bg-[linear-gradient(271.99deg,_#F1F8FE_0%,_#F1EFFF_100%)]'}>
                                    <img src={'/eid.svg'} className={'w-6 h-6'} />
                                </div>
                                <div className={'flex flex-col'}>
                                    <p className={'text-sm font-medium text-[#9F9F9F]'}>Ваш баланс</p>
                                    <p className={'text-sm font-bold'}>{supabaseUser?.total_points} эдельштейнов</p>
                                </div>
                            </div>
                            <Ripple className="rounded-3xl overflow-hidden inline-block">
                                <Link to={'/points'}
                                    className={"text-sm font-bold w-max leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)] block"}>
                                    Подробнее
                                </Link>
                            </Ripple>
                        </div>
                    </div>

                    {/* Tariff Block */}
                    <div className="px-4 mb-3">
                        <div className="bg-white rounded-2xl p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-[#9F9F9F]">Тариф</p>
                                        <Ripple className="rounded-full overflow-hidden inline-block">
                                            <img src="/ask-icon.svg" alt="info" className="w-4 h-4" />
                                        </Ripple>
                                    </div>
                                    <p className="text-sm font-bold text-black">
                                        {userTariff ? userTariff.name : 'Базовый'}
                                    </p>
                                </div>
                                <Ripple className="rounded-3xl overflow-hidden inline-block">
                                    <button className="text-sm font-bold w-max leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]">
                                        Повысить тариф
                                    </button>
                                </Ripple>
                            </div>
                            <p className="text-sm text-[#9F9F9F] leading-tight">
                                {userTariff?.description || 'Базовый тарифный план с ограниченным доступом к материалам.'}
                            </p>
                        </div>
                    </div>

                    <div className={'bg-white rounded-t-3xl pt-5'}>
                        <div className={'px-4 flex flex-col gap-3'}>
                            {links.map(el => (
                                <Ripple key={el.link} className="rounded-2xl overflow-hidden">
                                    <Link
                                        className={'relative bg-[linear-gradient(271.99deg,_#F1F8FE_0%,_#F1EFFF_100%)] py-4 px-6 rounded-2xl flex flex-col gap-2 items-start justify-between block'}
                                        to={el.link}>
                                        <p className={'font-semibold'}>{el.title}</p>
                                        <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'} />
                                        <img src={el.image} className={clsx('absolute top-1/2 -right-[70px] -translate-y-1/2', el.className)} />
                                    </Link>
                                </Ripple>
                            ))}
                        </div>
                    </div>
                </div> {/* end of stats grid */}
            </div>
        </Page >
    )
}