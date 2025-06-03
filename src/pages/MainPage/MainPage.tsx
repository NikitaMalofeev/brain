import { Page } from "@/components";
import useLibraryStages from "@/lib/supabase/hooks/useLibraryStages.ts";
import { COURSE_CONFIG } from "@/lib/config/constants.ts";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { logger } from "@/lib/logger.ts";
import { useAppContext } from "@/contexts/AppContext.tsx";
import { useSupabaseUser } from "@/lib/supabase/hooks";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { buildImageUrl } from "@/lib/cloudflareR2Service.ts";

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
    return (
        <Page>
            <div className={'bg-[url("/bg3.jpg")] bg-cover bg-bottom p-4 rounded-b-3xl flex-1 flex flex-col gap-3'}>
                <div className={'flex items-center justify-between w-full'}>
                    <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full border border-white'}
                        alt={''} />
                    <Link to={'/points'} className={'flex items-center gap-1 py-[6px] px-2 bg-white rounded-full'}>
                        <p className={'text-black font-semibold leading-4'}>{supabaseUser?.total_points}</p>
                        <img src={'/eid.svg'} className={'w-5 h-5'} />
                    </Link>
                </div>
                {stages.map((stage, i) => (
                    <Link key={stage.stage_id} to={`/library/stage/${stage.stage_id}`}
                        className={clsx('relative bg-white/70 rounded-4xl overflow-hidden', stage.is_unlocked ? "cursor-pointer" : "pointer-events-none")}>
                        <img src={stage.cover_image_path ? buildImageUrl(stage.cover_image_path) : `/step${i + 1}${i + 1}.png`}
                            className={`h-[140px] w-full object-cover`}
                            onError={(e) => {
                                // Fallback при ошибке загрузки: переключаемся на статичное изображение
                                console.log(`🔄 MainPage: Fallback для ступени ${stage.stage_id}, используем статическое изображение`);
                                e.currentTarget.src = `/step${i + 1}${i + 1}.png`;
                            }} />
                        <div className={'absolute top-5 left-5 z-[2] flex flex-col gap-1'}>
                            <p className={'font-bold uppercase text-black'}>{stage.stage_name}</p>
                            <div className={'text-xs w-max font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)] px-2 py-1 rounded-full flex items-center gap-1'}>
                                LEVEL 0{i + 1}
                                {!stage.is_unlocked && <img src={'/lock.svg'} alt={''} />}
                            </div>
                        </div>
                    </Link>
                ))}

            </div>



            <div className={'bg-white p-4 flex flex-col gap-3'}>
                <div className={'flex items-center justify-between'}>
                    <div className={'flex flex-col'}>
                        <p className={'font-bold text-black'}>Выполнено {'[11]'} заданий</p>
                        <p className={'text-sm text-[#8C8C8C]'}>Еще {'[11]'} заданий до {'[третьей]'} ступени</p>
                    </div>
                    <img src={'/arrow-icon.svg'} alt={''} />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-[#ACD3F3] to-[#91C3EC] w-1/2"></div>
                </div>
            </div>
        </Page>
    )
}