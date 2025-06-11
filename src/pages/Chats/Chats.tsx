import { Page } from "@/components";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { Ripple } from "@/components/ui/Ripple/Ripple";

export const Chats = () => {
    const { data, isLoading } = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return []

            const { data, error } = await supabase.from('chats')
                .select('*')
                .order('order_num', { ascending: true })

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['chats']
    })
    if (isLoading) {
        return (
            <Page>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка чатов...</p>
                </div>
            </Page>
        )
    }
    return (
        <Page>
            <div className={'flex flex-col gap-2 text-black min-h-[calc(100vh-60px)]'}>
                <h2 className={'font-bold text-xl p-4 pt-8'}>Важные чаты</h2>
                <div className={'relative overflow-hidden bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    <img src={'/cube.png'} alt={''}
                        className={'absolute min-w-[670px] -top-[40px] -z-[0] -right-[350px]'} />
                    <div className={'flex flex-col gap-3 relative z-[2]'}>
                        {data?.map(el => (
                            <Ripple key={el.id} className="rounded-3xl overflow-hidden">
                                <Link className={'p-4 rounded-3xl bg-white flex items-center justify-between gap-3 block'}
                                    to={el.link}>
                                    <div className={'flex items-center gap-3'}>
                                        <div className={'min-w-[48px] h-[48px] bg-gray-200 rounded-full'}>

                                        </div>
                                        <div className={'flex flex-col gap-1'}>
                                            <p className={' font-semibold'}>{el.title}</p>
                                            <p className={'text-sm font-medium text-[#9F9F9F]'}>{el.description}</p>
                                        </div>
                                    </div>
                                    <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'} />
                                </Link>
                            </Ripple>
                        ))}
                    </div>
                </div>
            </div>
        </Page>
    )
}