import { Page } from "@/components";
import { COURSE_CONFIG } from "@/lib/config/constants.ts";
import { useSupabaseUser } from "@/lib/supabase/hooks";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { buildImageUrl } from "@/lib/cloudflareR2Service.ts";
import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/lib/supabase/client.ts";

const COURSE_ID = COURSE_CONFIG.DEFAULT_COURSE_ID;

export const MainPage = () => {
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser } = useSupabaseUser(initDataSignal);

    const {data: stages, isLoading} = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return []

            const { data, error } = await supabase.rpc('get_library_stages', {
                p_user_id: supabaseUser?.id,
                p_course_id: COURSE_ID,
            });

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['stages'],
        enabled: !!supabaseUser?.id
    })


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
            <div className={'bg-[url("/bg3.jpg")] bg-cover bg-bottom p-4 pt-12 rounded-b-3xl flex-1 flex flex-col gap-3'}>
                <div className={'flex items-center justify-between w-full'}>
                    <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full border border-white'}
                        alt={''} />
                    <Link to={'/points'} className={'flex items-center gap-1 py-[6px] px-2 bg-white rounded-full'}>
                        <p className={'text-black font-semibold leading-4'}>{supabaseUser?.total_points}</p>
                        <img src={'/eid.svg'} className={'w-5 h-5'} />
                    </Link>
                </div>
                {stages?.map((stage, i) => (
                    <Link key={stage.stage_id} to={`/library/stage/${stage.stage_id}`}
                        className={clsx('relative bg-white/70 rounded-4xl overflow-hidden', stage.is_unlocked ? "cursor-pointer" : "pointer-events-none")}>
                        <img src={stage.cover_image_path ? buildImageUrl(stage.cover_image_path) : `/step${i + 1}${i + 1}.png`}
                            className={`h-[140px] md:h-[200px] w-full object-cover`}
                            onError={(e) => {
                                // Fallback при ошибке загрузки: переключаемся на статичное изображение
                                console.log(`🔄 MainPage: Fallback для ступени ${stage.stage_id}, используем статическое изображение`);
                                e.currentTarget.src = `/step${i + 1}${i + 1}.png`;
                            }} />
                        <div className={'absolute top-5 left-5 z-[2] flex flex-col gap-1'}>
                            <p className={'font-bold uppercase text-black'}>{stage.stage_name}</p>
                            <div className={'text-xs text-white w-max font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)] px-2 py-1 rounded-full flex items-center gap-1'}>
                                LEVEL 0{i + 1}
                                {!stage.is_unlocked && <img src={'/lock.svg'} alt={''} />}
                            </div>
                        </div>
                    </Link>
                ))}

            </div>



            <div className={'bg-white p-4 flex flex-col gap-3 sticky bottom-0'}>
                <div className={'flex items-center justify-between'}>
                    <div className={'flex flex-col'}>
                        <p className={'font-bold text-black'}>Выполнено 0 заданий</p>
                        <p className={'text-sm text-[#8C8C8C]'}>Еще 5 заданий до второй ступени</p>
                    </div>
                    <Link to={`/library/stage/${stages?.filter(stage => stage.is_unlocked).reverse()[0].stage_id}`}>
                        <img src={'/arrow-icon.svg'} alt={''}/>
                    </Link>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-[#ACD3F3] to-[#91C3EC] w-0"></div>
                </div>
            </div>
        </Page>
    )
}