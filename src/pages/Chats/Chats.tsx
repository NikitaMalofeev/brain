import { Page } from "@/components";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { Ripple } from "@/components/ui/Ripple/Ripple";
import { useSupabaseUser } from "@/lib/supabase/hooks/useSupabaseUser";
import { useActiveTariff } from "@/lib/supabase/hooks/useActiveTariff";
import { useSignal, initDataState } from "@telegram-apps/sdk-react";

export const Chats = () => {
    // Получаем данные пользователя из Telegram
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);
    
    // Получаем активный тариф пользователя
    const { data: activeTariff, isLoading: tariffLoading } = useActiveTariff(supabaseUser?.id);
    
    const { data, isLoading: chatsLoading } = useQuery({
        queryFn: async () => {
            if (!supabase) return []

            // Получаем все чаты, для которых вообще нет ограничений по тарифам (доступны всем)
            const { data: allChats, error: allChatsError } = await supabase
                .from('chats')
                .select(`
                    id,
                    name,
                    description,
                    link,
                    order_num,
                    created_at
                `)
                .order('order_num', { ascending: true })

            if (allChatsError) {
                throw new Error(allChatsError.message)
            }

            // Получаем ID чатов, для которых есть ограничения по тарифам
            const { data: restrictedChats, error: restrictedError } = await supabase
                .from('tariff_chat_access')
                .select('chat_id')

            if (restrictedError) {
                throw new Error(restrictedError.message)
            }

            const restrictedChatIds = new Set(restrictedChats?.map(item => item.chat_id) || []);

            // Если у пользователя есть активный тариф, получаем чаты, доступные для его тарифа
            let accessibleChatIds = new Set<string>();
            if (activeTariff) {
                const { data: accessData, error: accessError } = await supabase
                    .from('tariff_chat_access')
                    .select('chat_id')
                    .eq('tariff_id', activeTariff.tariff_id);

                if (accessError) {
                    throw new Error(accessError.message);
                }

                accessibleChatIds = new Set(accessData?.map(item => item.chat_id) || []);
            }

            // Фильтруем чаты: показываем те, которые либо не имеют ограничений, либо доступны для тарифа пользователя
            const availableChats = allChats?.filter(chat => {
                // Если для чата нет ограничений - показываем всем
                if (!restrictedChatIds.has(chat.id)) {
                    return true;
                }
                // Если есть ограничения - показываем только если у пользователя есть доступ
                return accessibleChatIds.has(chat.id);
            }) || [];

            return availableChats;
        },
        queryKey: ['chats', activeTariff?.tariff_id],
        enabled: !!supabaseUser && !userLoading && !tariffLoading // Запрос выполняется только когда есть пользователь и загрузка завершена
    })
    
    // Показываем лоадер пока загружаются данные пользователя, тарифа или чатов
    if (userLoading || tariffLoading || chatsLoading) {
        return (
            <Page>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка чатов...</p>
                </div>
            </Page>
        )
    }
    
    // Если пользователь не найден
    if (!supabaseUser) {
        return (
            <Page>
                <div className={'flex flex-col gap-2 text-black min-h-[calc(100vh-60px)] pb-8'}>
                    <h2 className={'font-bold text-xl p-4 pt-24'}>Чаты обучения</h2>
                    <div className={'relative overflow-hidden bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                        <div className={'flex flex-col gap-3 relative z-[2] items-center justify-center text-white'}>
                            <p className="text-lg font-semibold">Необходима авторизация</p>
                            <p className="text-sm opacity-75">Для доступа к чатам обучения войдите в систему</p>
                        </div>
                    </div>
                </div>
            </Page>
        )
    }
    
    return (
        <Page>
            <div className={'flex flex-col gap-2 text-black min-h-[calc(100vh-60px)] pb-8'}>
                <h2 className={'font-bold text-xl p-4 pt-24'}>Чаты обучения</h2>
                <div className={'relative overflow-hidden bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    <img src={'/bg-chat.png'} alt={''}
                        className={'bg-breathe-6 absolute left-0 -bottom-6'} />
                    <div className={'flex flex-col gap-3 relative z-[2]'}>
                        {data && data.length > 0 ? (
                            data.map(el => (
                                <Ripple key={el.id} className="rounded-3xl overflow-hidden">
                                    <Link className={'p-4 rounded-3xl bg-white/60 border border-white/15 backdrop-blur-md flex items-center justify-between gap-3 block'}
                                        to={el.link}>
                                        <div className={'flex items-center gap-3'}>
                                            <div className={'min-w-[48px] h-[48px] bg-[url("/sphere-faq.png")] bg-[length:200%] bg-center rounded-full'}>

                                            </div>
                                            <div className={'flex flex-col gap-1'}>
                                                <p className={' font-semibold'}>{el.name}</p>
                                                <p className={'text-sm font-medium text-[#9F9F9F]'}>{el.description}</p>
                                            </div>
                                        </div>
                                        <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'} />
                                    </Link>
                                </Ripple>
                            ))
                        ) : (
                            <div className={'flex flex-col gap-3 relative z-[2] items-center justify-center text-white mt-8'}>
                                <p className="text-lg font-semibold">Чаты недоступны</p>
                                <p className="text-sm opacity-75">
                                    {activeTariff 
                                        ? `Для вашего тарифа "${activeTariff.tariff_name}" пока нет доступных чатов`
                                        : "Пока нет доступных чатов для просмотра"
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    )
}