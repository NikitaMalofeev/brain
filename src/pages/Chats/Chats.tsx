import { Page } from "@/components";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { Ripple } from "@/components/ui/Ripple/Ripple";
import { useSupabaseUser } from "@/lib/supabase/hooks/useSupabaseUser";
import { useActiveTariff } from "@/lib/supabase/hooks/useActiveTariff";
import { useSignal, initDataState } from "@telegram-apps/sdk-react";

// Интерфейс для чата из RPC функции get_available_chats_for_user
interface AvailableChat {
    id: string;
    name: string;
    description: string | null;
    link: string;
    order_num: number;
    course_name: string | null;
}

export const Chats = () => {
    // Получаем данные пользователя из Telegram
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);

    // Получаем информацию об активном тарифе пользователя
    const { data: activeTariff, isLoading: tariffLoading } = useActiveTariff(supabaseUser?.id);

    // Используем новую RPC функцию для получения доступных чатов
    const { data: availableChats, isLoading: chatsLoading, error } = useQuery<AvailableChat[]>({
        queryFn: async () => {
            if (!supabase || !supabaseUser?.id) return [];

            // Один простой вызов RPC функции вместо сложной логики
            const { data, error } = await supabase
                .rpc('get_available_chats_for_user', {
                    p_user_id: supabaseUser.id
                });

            if (error) {
                throw new Error(error.message);
            }

            return data || [];
        },
        queryKey: ['available_chats', supabaseUser?.id],
        enabled: !!supabaseUser?.id // Запрос выполняется только когда есть ID пользователя
    });

    // Получаем данные пользователя для персонального чата
    const { data: userData, isLoading: userDataLoading } = useQuery({
        queryFn: async () => {
            if (!supabase || !supabaseUser?.id) return null;

            const { data, error } = await supabase
                .from('users')
                .select('personal_chat_link')
                .eq('id', supabaseUser.id)
                .single();

            if (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
                return null;
            }

            return data;
        },
        queryKey: ['user_personal_chat', supabaseUser?.id],
        enabled: !!supabaseUser?.id
    });

    // Состояние загрузки (пользователь, тариф и чаты)
    if (userLoading || tariffLoading || chatsLoading || userDataLoading) {
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

    // Если произошла ошибка при загрузке чатов
    if (error) {
        return (
            <Page>
                <div className={'flex flex-col gap-2 text-black min-h-[calc(100vh-60px)] pb-8'}>
                    <h2 className={'font-bold text-xl p-4 pt-24'}>Чаты обучения</h2>
                    <div className={'relative overflow-hidden bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                        <div className={'flex flex-col gap-3 relative z-[2] items-center justify-center text-white'}>
                            <p className="text-lg font-semibold">Ошибка загрузки</p>
                            <p className="text-sm opacity-75">Не удалось загрузить чаты: {error.message}</p>
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
                        {/* Основные чаты */}
                        {availableChats && availableChats.length > 0 && (
                            availableChats.map(chat => (
                                <Ripple key={chat.id} className="rounded-3xl overflow-hidden">
                                    <Link className={'p-4 rounded-3xl bg-white/60 border border-white/15 backdrop-blur-md flex items-center justify-between gap-3 block'}
                                        to={chat.link}>
                                        <div className={'flex items-center gap-3'}>
                                            <div className={'min-w-[48px] h-[48px] bg-[url("/sphere-faq.png")] bg-[length:200%] bg-center rounded-full'}>

                                            </div>
                                            <div className={'flex flex-col gap-1'}>
                                                <p className={' font-semibold'}>{chat.name}</p>
                                                <p className={'text-sm font-medium text-[#9F9F9F]'}>
                                                    {chat.description || (chat.course_name ? `Курс: ${chat.course_name}` : '')}
                                                </p>
                                            </div>
                                        </div>
                                        <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'} />
                                    </Link>
                                </Ripple>
                            ))
                        )}

                        {/* Персональный чат пользователя */}
                        {userData?.personal_chat_link && (
                            <Ripple className="rounded-3xl overflow-hidden">
                                <Link className={'p-4 rounded-3xl bg-white/40 border border-white/20 backdrop-blur-md flex items-center justify-between gap-3 block'}
                                    to={userData.personal_chat_link}>
                                    <div className={'flex items-center gap-3'}>
                                    <div className={'min-w-[48px] h-[48px] bg-[url("/sphere-faq.png")] bg-[length:200%] bg-center rounded-full'}>

</div>
                                        <div className={'flex flex-col gap-1'}>
                                            <p className={' font-semibold'}>Чат десятки</p>
                                            {/* <p className={'text-sm font-medium text-[#9F9F9F]'}>
                                                Персональное общение с куратором
                                            </p> */}
                                        </div>
                                    </div>
                                    <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'} />
                                </Link>
                            </Ripple>
                        )}

                        {/* Сообщение, если нет чатов */}
                        {(!availableChats || availableChats.length === 0) && !userData?.personal_chat_link && (
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