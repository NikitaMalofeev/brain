import { Page } from "@/components/Page";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client.ts";
import {
    initDataState as _initDataState,
    useSignal,
} from '@telegram-apps/sdk-react';
import { useSupabaseUser } from "@/lib/supabase/hooks";
import { useQuery } from "@tanstack/react-query";
import { Ripple } from "@/components/ui/Ripple/Ripple";
import { buildFileUrl } from "@/lib/supabase/supabaseStorageService";
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

export const HelpPage = () => {
    const initDataState = useSignal(_initDataState);
    const { supabaseUser } = useSupabaseUser(initDataState);
    const { data: userCurator, isLoading: isLoadingCurator } = useQuery({
        queryFn: async () => {
            if (!supabase || !supabaseUser?.id) return undefined
            const { data, error } = await supabase?.from('user_curator').select('*').eq('student_id', supabaseUser.id).single()
            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                return undefined
                //throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['user_curator', supabaseUser?.id],
        enabled: !!supabaseUser?.id
    })
    const { data, isLoading } = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return []

            const { data, error } = await supabase.from('users')
                .select('id, telegram_id, first_name, photo_url, username').eq('role', 'curator')

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['curators']
    })
    if (!supabaseUser?.id || !data || isLoadingCurator || isLoading) {
        return (
            <Page>
                <LoadingSpinner />
            </Page>
        )
    }
    return (
        <Page>
            <div className={'flex flex-col gap-4 text-black min-h-[calc(100vh-60px)]'}>
                <h2 className={'font-bold text-xl p-4 pb-0 pt-4'}>Ваш куратор</h2>
                {userCurator ? <div className="px-4 ">
                    <Ripple className="rounded-2xl overflow-hidden inline-block w-full">
                        <Link to={`https://t.me/${data?.filter(el => el.id === userCurator?.curator_id)?.[0].username}`} className={'flex items-center gap-4 justify-between block w-full'}>
                            <div className={'flex items-center gap-3'}>
                                {(() => {
                                    const curator = data?.filter(el => el.id === userCurator?.curator_id)?.[0];
                                    const photoUrl = curator?.photo_url;

                                    if (photoUrl) {
                                        return (
                                            <img
                                                src={buildFileUrl(photoUrl) || ''}
                                                alt={curator?.first_name || 'Куратор'}
                                                className={'w-[60px] h-[60px] rounded-full object-cover'}
                                                onError={(e) => {
                                                    console.warn('Ошибка загрузки аватара куратора:', photoUrl);
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        );
                                    }

                                    // Оригинальный плейсхолдер
                                    return (
                                        <div className={'w-[60px] h-[60px] rounded-full bg-[#EEEEEE]'}></div>
                                    );
                                })()}
                                <p className={'font-semibold text-xl'}>{data?.filter(el => el.id === userCurator?.curator_id)?.[0].first_name}</p>
                            </div>
                            <img src={'/arrow-icon.svg'} alt={''} />
                        </Link>
                    </Ripple>
                </div> : <p className={'px-4'}>Не указан</p>}
                <div className={'page-bg-container bg-[url("/bg3.jpg")] relative overflow-hidden bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    <img src={'/new-micro.png'} alt={''}
                        className={'absolute bg-breathe-1 -z-[0] rotate-[5deg] mix-blend-multiply -left-6 -bottom-32'} />
                    <p className={'font-bold text-xl relative z-[2]'}>Другие кураторы</p>
                    <div className={'flex flex-col gap-3 relative z-[2]'}>
                        {data?.filter(el => el.id !== (userCurator?.curator_id || undefined)).map((el, i) => (
                            <Ripple key={i} className="rounded-3xl overflow-hidden">
                                <Link className={'p-4 rounded-3xl bg-white/60 border border-white/15 backdrop-blur-md flex justify-between gap-2 items-center block'}
                                    to={`https://t.me/${el.username}`}>
                                    <div className={'flex items-center gap-2'}>
                                        {el.photo_url ?
                                            <img src={buildFileUrl(el.photo_url) || ''} className={'w-12 h-12 rounded-full object-cover'}
                                                alt={el.first_name || 'Куратор'} /> : <div className={'w-12 h-12 rounded-full bg-[#EEEEEE]'}></div>}
                                        <p className={'font-semibold'}>{el.first_name}</p>
                                    </div>
                                    <img src={'/arrow-icon.svg'} alt={''} />
                                </Link>
                            </Ripple>
                        ))}
                    </div>
                </div>
            </div>
        </Page>
    )
}

export default HelpPage