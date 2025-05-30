import {Page} from "@/components";
import useLibraryStages from "@/lib/supabase/hooks/useLibraryStages.ts";
import {COURSE_CONFIG} from "@/lib/config/constants.ts";
import {useEffect, useState} from "react";
import {User} from "@supabase/supabase-js";
import {logger} from "@/lib/logger.ts";
import {useAppContext} from "@/contexts/AppContext.tsx";
import {useSupabaseUser} from "@/lib/supabase/hooks";
import {initDataState, useSignal} from "@telegram-apps/sdk-react";
import {Link} from "react-router-dom";

const COURSE_ID = COURSE_CONFIG.DEFAULT_COURSE_ID;

export const MainPage = () => {


    const [supabaseCompatUser, setSupabaseCompatUser] = useState<User | null>(null);
    const { isTelegramApp } = useAppContext();
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    const { stages, loading: stagesLoading, error: stagesError } = useLibraryStages(supabaseCompatUser, COURSE_ID);
    useEffect(() => {
        if (supabaseUser) { // Условие изменено: теперь зависит только от наличия supabaseUser
            // Создаем Supabase User-совместимый объект из supabaseUser
            const compatUser: User = {
                id: supabaseUser.id, // UUID из Supabase
                app_metadata: {}, // Можно добавить нужные метаданные, если они есть в supabaseUser
                user_metadata: { // Можно добавить нужные метаданные
                    full_name: supabaseUser.first_name, // Пример, если first_name есть в SupabaseUser
                    // ... другие поля из supabaseUser.user_metadata при необходимости
                },
                aud: '', // Обычно 'authenticated' для реальных сессий, для мока можно оставить пустым или настроить
                created_at: supabaseUser.created_at || new Date().toISOString(), // Обеспечиваем наличие created_at
            } as User; // Используем as User для гибкости, но следим за полями

            setSupabaseCompatUser(compatUser);
            logger.debug('Created Supabase-compatible user', { userId: compatUser.id, source: isTelegramApp ? 'Telegram' : 'Mocked InitData' });
        } else {
            setSupabaseCompatUser(null); // Если supabaseUser нет, сбрасываем compatUser
        }
    }, [supabaseUser, isTelegramApp]);
    const loading = stagesLoading || (isTelegramApp && supabaseUserLoading);

    // Объединяем ошибки
    const error = stagesError || (isTelegramApp && supabaseUserError);


    useEffect(() => {
        if(!loading && !error){
            window.scrollTo(0, document.body.scrollHeight);
        }
    }, [loading, error]);
    if (loading) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка ступеней...</div>
            </Page>
        );
    }

    if (error) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
                    Ошибка загрузки: {error.message}
                </div>
            </Page>
        );
    }

    if (stages.length === 0 && !loading) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Нет доступных этапов для этого курса.</div>
            </Page>
        );
    }
    return(
        <Page>
            <div className={'fixed z-50 top-6 flex items-center justify-between px-6 w-full'}>
                <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full'}/>
                <div className={'flex items-center gap-1 py-[6px] px-2 bg-white rounded-full'}>
                    <p className={'text-black font-semibold leading-4'}>{supabaseUser?.total_points}</p>
                    <img src={'/eid.svg'} className={'w-5 h-5'}/>
                </div>
            </div>
            <div className={'relative min-h-screen overflow-hidden bg-[url("/bg.jpg")] bg-cover'}>
                <div className={'flex flex-col gap-5 items-center'}>
                    {[...stages].reverse().map((stage, i) => (
                        <Link to={`/library/stage/${stage.stage_id}`} className={stage.is_unlocked ? "cursor-pointer transition duration-200 ease-in hover:scale-105" : "pointer-events-none"}>
                            <img src={`/step${stage.stage_id}.png`}
                                 className={`w-[75%] mx-auto ${!stage.is_unlocked && 'mix-blend-luminosity'}`}/>
                        </Link>
                    ))}
                </div>
            </div>
            <div className={'bg-white py-4 px-6 flex flex-col gap-4'}>
                <div className={'flex items-center justify-between'}>
                    <div className={'flex flex-col'}>
                        <p className={'font-bold text-black'}>Выполнено 12 заданий</p>
                        <p className={'text-sm text-[#8C8C8C]'}>Еще 24 задания до третьей ступени</p>
                    </div>
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="36" rx="18" fill="#EAF5FE"/>
                        <rect width="36" height="36" rx="18" fill="url(#paint0_linear_645_2944)"/>
                        <path d="M15.5 12.1667L21.3333 18.0001L15.5 23.8334" stroke="url(#paint1_linear_645_2944)"
                              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs>
                            <linearGradient id="paint0_linear_645_2944" x1="-2" y1="2" x2="36" y2="40"
                                            gradientUnits="userSpaceOnUse">
                                <stop stop-color="#8DC5F1" stop-opacity="0.2"/>
                                <stop offset="1" stop-color="#8DC5F1"/>
                            </linearGradient>
                            <linearGradient id="paint1_linear_645_2944" x1="16.7406" y1="26.4998" x2="26.3868"
                                            y2="-9.50024" gradientUnits="userSpaceOnUse">
                                <stop stop-color="white"/>
                                <stop offset="1" stop-color="white" stop-opacity="0.45"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="h-4 rounded-full bg-gradient-to-r from-[#ACD3F3] to-[#91C3EC] w-1/2"></div>
                </div>
            </div>
        </Page>
    )
}