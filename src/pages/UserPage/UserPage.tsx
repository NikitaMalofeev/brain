import {useSupabaseUser} from '@/lib/supabase/hooks/useSupabaseUser';
import {useMemo} from "react";
import {
    initDataState as _initDataState,
    useSignal,
} from '@telegram-apps/sdk-react';
import {Link} from "react-router-dom";
import {Page} from "@/components";

const links = [{
    link: '/chats',
    title: 'Важные чаты',
}, {
    link: '/help',
    title: 'Помощь'
}, {
    link: '/faq',
    title: 'FAQ'
}]

export const UserPage = () => {
    const initDataState = useSignal(_initDataState);
    const {supabaseUser, loading, error} = useSupabaseUser(initDataState);
    const user = useMemo(() =>
            initDataState && initDataState.user ? initDataState.user : undefined,
        [initDataState]);

    if (loading) {
        return (
            <Page>
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
            <Page>
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
            <Page>
                <div className="profile-error">
                    <div className="profile-error-icon" aria-hidden="true">⚠️</div>
                    <h2>Нет данных</h2>
                    <p>Не удалось получить данные пользователя</p>
                </div>
            </Page>
        );
    }
    return (
        <Page>
            <div className={'flex flex-col gap-4 p-4 bg-gray-100 text-black/80 min-h-screen'}>
                <div className={'bg-white items-center rounded-3xl flex flex-col gap-8 p-6'}>
                    {user?.photo_url ? <img className={'w-36 h-36 rounded-full'} src={user.photo_url} alt=""/> :
                        <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M47.1673 49.0001C47.1673 42.5568 38.81 37.3334 28.5007 37.3334C18.1913 37.3334 9.83398 42.5568 9.83398 49.0001M28.5007 30.3334C22.0573 30.3334 16.834 25.1101 16.834 18.6668C16.834 12.2234 22.0573 7.0001 28.5007 7.0001C34.944 7.0001 40.1673 12.2234 40.1673 18.6668C40.1673 25.1101 34.944 30.3334 28.5007 30.3334Z"
                                stroke="#8C8C8C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>}
                    <p className={'text-xl'}>Привет, {user?.username}</p>
                </div>
                {links.map(el => (
                    <Link className={'p-4 rounded-2xl bg-white flex items-center justify-between'} to={el.link}>
                        <p className={'font-bold'}>{el.title}</p>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5L16 12L9 19" stroke="black" stroke-width="1.5" stroke-linecap="round"
                                  stroke-linejoin="round"/>
                        </svg>
                    </Link>
                ))}
            </div>
        </Page>
    )
}