import { Page } from "@/components/Page";
import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/lib/supabase/client.ts";
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

export const FaqPage = () => {
    const {data, isLoading} = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return []

            const { data, error } = await supabase.from('faq')
                .select('*')
                .order('order_num', { ascending: true })

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['faq']
    })
    if(isLoading){
        return (
            <Page>
                <LoadingSpinner />
            </Page>
        )
    }
    return (
        <Page>
            <div className={'flex flex-col gap-2 text-black min-h-screen'}>
                <div
                    className={'page-bg-container relative items-center rounded-b-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom h-[328px] overflow-hidden'}>
                    <img src={'/sphere-faq.png'} alt={''}
                         className={'bg-breathe-2 object-cover w-[502px] h-[502px] absolute -top-[35px] left-1/2 -translate-x-1/2'}/>
                </div>
                <div className={'p-4 flex flex-col gap-3'}>
                    <h2 className={'font-bold text-xl'}>FAQ</h2>
                    <div className={'flex flex-col gap-2'}>
                        {data?.map(el => (
                            <ul className={'flex flex-col gap-2 pl-0 ml-0'}>
                                <p>{el.question}</p>
                                {el.answer.split('\n\n').map((line: string, i: number) => {
                                    return (<li className={'ml-6 list-disc'} key={i}>{line}</li>)
                                })}
                            </ul>
                        ))}
                    </div>
                </div>
            </div>
        </Page>
    )
}