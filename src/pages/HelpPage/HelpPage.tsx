import {Page} from "@/components";
import {Link} from "react-router-dom";
import {supabase} from "@/lib/supabase/client.ts";
import {
    initDataState as _initDataState,
    useSignal,
} from '@telegram-apps/sdk-react';
import {useSupabaseUser} from "@/lib/supabase/hooks";
import {useQuery} from "@tanstack/react-query";

export const HelpPage = ()=> {
    const initDataState = useSignal(_initDataState);
    const {supabaseUser} = useSupabaseUser(initDataState);
    const {data: userCurator, isLoading: isLoadingCurator} = useQuery({
        queryFn: async () => {
            if (!supabase || !supabaseUser?.id) return undefined
            const { data, error } = await supabase?.from('user_curator').select('*').eq('student_id', supabaseUser.id).single()
            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['user_curator', supabaseUser?.id],
        enabled: !!supabaseUser?.id
    })
    const {data, isLoading} = useQuery({
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
    if(!supabaseUser?.id || !data || isLoadingCurator || isLoading){
        return (
            <Page>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка кураторов...</p>
                </div>
            </Page>
        )
    }
    return(
        <Page>
            <div className={'flex flex-col gap-4 text-black min-h-[calc(100vh-60px)]'}>
                <h2 className={'font-bold text-xl p-4 pb-0 pt-12'}>Ваш куратор</h2>
                {userCurator && <Link to={`https://t.me/${data?.filter(el => el.id === userCurator?.curator_id)?.[0].username}`} className={'px-4 flex items-center gap-4 justify-between'}>
                    <div className={'flex items-center gap-3'}>
                        <img src={data?.filter(el => el.id === userCurator?.curator_id)?.[0].photo_url} alt={''}
                             className={'w-[60px] h-[60px] rounded-full'}/>
                        <p className={'font-semibold text-xl'}>{data?.filter(el => el.id === userCurator?.curator_id)?.[0].first_name}</p>
                    </div>
                    <img src={'/arrow-icon.svg'} alt={''}/>
                </Link>}
                <div className={'bg-[url("/bg3.jpg")] relative overflow-hidden bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    <img src={'/crystall.png'} alt={''}
                         className={'opacity-70 absolute min-w-[700px] -top-[100px] -z-[0] -right-[300px] -rotate-[10deg]'}/>
                    <p className={'font-bold text-xl relative z-[2]'}>Другие кураторы</p>
                    <div className={'flex flex-col gap-3 relative z-[2]'}>
                        {data?.filter(el => el.id !== (userCurator?.curator_id || undefined)).map((el, i) => (
                            <Link key={i} className={'p-4 rounded-3xl bg-white flex justify-between gap-2 items-center'}
                                  to={`https://t.me/${el.username}`}>
                                <div className={'flex items-center gap-2'}>
                                    {el.photo_url ?
                                        <img src={el.photo_url} className={'w-12 h-12 rounded-full object-cover'}
                                             alt={''}/> : <div className={'w-12 h-12 rounded-full bg-[#EEEEEE]'}></div>}
                                    <p className={'font-semibold'}>{el.first_name}</p>
                                </div>
                                <img src={'/arrow-icon.svg'} alt={''}/>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </Page>
    )
}

export default HelpPage