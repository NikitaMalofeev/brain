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

const links = [{
    link: '/chats',
    title: 'Важные чаты',
    image: '/cube.png'
}, {
    link: '/help',
    title: 'Помощь',
    image: '/crystall.png'
}, {
    link: '/faq',
    title: 'FAQ',
    image: '/sphere-faq.png'
}]

export const UserPage = () => {
    const initDataState = useSignal(_initDataState);
    const { supabaseUser, loading, error } = useSupabaseUser(initDataState);
    const user = useMemo(() =>
        initDataState && initDataState.user ? initDataState.user : undefined,
        [initDataState]);

    const { data: stages } = useQuery({
        queryFn: async (): Promise<StageProgressData[]> => {
            if (!supabase || !supabaseUser?.id) return []

            const { data, error } = await supabase.rpc('get_library_stages', {
                p_user_id: supabaseUser?.id,
                p_course_id: COURSE_CONFIG.DEFAULT_COURSE_ID,
            });

            if (error) {
                throw new Error(error.message)
            }
            return data || []
        },
        queryKey: ['stages', supabaseUser?.id],
        enabled: !!supabaseUser?.id
    });

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

    const totalCompletedLessons = useMemo(() => {
        if (!stages) return 0;
        return stages.reduce((acc, stage) => acc + (stage.completed_lessons || 0), 0);
    }, [stages]);

    const stageProgressBars = useMemo(() => {
        const progress: (number | string)[] = [];
        if (!stages) return ['0%', '0%', '0%', '0%'];

        for (let i = 0; i < 4; i++) {
            const stage = stages[i];
            if (!stage) {
                progress.push('0%');
                continue;
            }

            if (stage.total_lessons > 0) {
                const percentage = (stage.completed_lessons / stage.total_lessons) * 100;
                progress.push(`${percentage}%`);
            } else {
                progress.push('0%');
            }
        }
        return progress;
    }, [stages]);

    if (loading) {
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
    if (error) {
        return (
            <Page back={false}>
                <div className="profile-error">
                    <div className="profile-error-icon" aria-hidden="true">⚠️</div>
                    <h2>Ошибка</h2>
                    <p>{error.message}</p>
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
                <img src={'/but.png'} alt={''} className={'absolute top-0 left-0 object-cover'} />
                <div className={'rounded-t-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom relative'}>
                    <div className={'flex flex-col gap-4 items-center absolute -top-[94px] left-1/2 -translate-x-1/2'}>
                        {user?.photo_url ? <img className={'w-36 h-36 rounded-full'} src={user.photo_url} alt="" /> :
                            <svg className={'w-36 h-36 rounded-full bg-white'} width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M47.1673 49.0001C47.1673 42.5568 38.81 37.3334 28.5007 37.3334C18.1913 37.3334 9.83398 42.5568 9.83398 49.0001M28.5007 30.3334C22.0573 30.3334 16.834 25.1101 16.834 18.6668C16.834 12.2234 22.0573 7.0001 28.5007 7.0001C34.944 7.0001 40.1673 12.2234 40.1673 18.6668C40.1673 25.1101 34.944 30.3334 28.5007 30.3334Z"
                                    stroke="#8C8C8C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>}
                        <p className={'text-xl font-semibold'}>Привет, {user?.username}</p>
                    </div>
                    <div className={'pt-[130px] grid grid-cols-2 gap-3 mb-[25px] px-4'}>
                        <div className={'row-span-2 flex flex-col items-center justify-center gap-3 p-[22px] rounded-2xl bg-white'}>
                            <div className={'flex items-center flex-col'}>
                                <p className={'text-sm font-medium text-[#9F9F9F]'}>Ваш уровень</p>
                                <p className={'text-[22px] font-bold'}>{currentLevel}</p>
                            </div>
                            <div className={'flex items-stretch gap-3'}>
                                {stageProgressBars.map((height, index) => (
                                    <div key={index} className={'w-4 h-16 rounded-full bg-[#E5E6FB] flex items-end'}>
                                        <div
                                            className={'rounded-full w-full bg-[linear-gradient(135deg,_rgba(141,197,241,0.4)_-48.61%,_#63ABE6_105.56%)]'}
                                            style={{ height: height }}
                                        ></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={'p-4 rounded-2xl bg-white flex items-center flex-col'}>
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Выполнено</p>
                            <p className={'text-[22px] font-bold'}>{totalCompletedLessons} заданий</p>
                        </div>
                        <div className={'p-4 rounded-2xl bg-white flex items-center flex-col'}>
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Просрочено</p>
                            <p className={'text-[22px] font-bold'}>3 дня</p>
                        </div>
                        <div className={'py-2 px-4 rounded-2xl bg-white flex items-center col-span-2 gap-2 justify-between'}>
                            <div className={'flex gap-2 items-center'}>
                                <img className={'bg-transparent'} src={'/coin.png'} width={46} height={46} />
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
                    <div className="px-4 mb-6">
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
                                        <img src={el.image} className={'absolute scale-70 top-1/2 -right-[70px] -translate-y-1/2'} />
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