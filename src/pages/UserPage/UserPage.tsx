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
    image: '/cube.png'
}, {
    link: '/help',
    title: 'Помощь',
    image: '/crystall.png'
}, {
    link: '/faq',
    title: 'FAQ',
    image: '/sphere-faq.png'
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
            <div className={'text-black min-h-screen bg-white pt-[180px]'}>
                <img src={'/but.png'} alt={''} className={'absolute top-0 left-0 object-cover'}/>
                <div className={'rounded-t-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom relative'}>
                    <div className={'flex flex-col gap-4 items-center absolute -top-[94px] left-1/2 -translate-x-1/2'}>
                        {user?.photo_url ? <img className={'w-36 h-36 rounded-full'} src={user.photo_url} alt=""/> :
                            <svg className={'w-36 h-36 rounded-full bg-white'} width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M47.1673 49.0001C47.1673 42.5568 38.81 37.3334 28.5007 37.3334C18.1913 37.3334 9.83398 42.5568 9.83398 49.0001M28.5007 30.3334C22.0573 30.3334 16.834 25.1101 16.834 18.6668C16.834 12.2234 22.0573 7.0001 28.5007 7.0001C34.944 7.0001 40.1673 12.2234 40.1673 18.6668C40.1673 25.1101 34.944 30.3334 28.5007 30.3334Z"
                                    stroke="#8C8C8C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>}
                        <p className={'text-xl font-semibold'}>Привет, {user?.username}</p>
                    </div>
                    <div className={'pt-[108px] grid grid-cols-2 gap-3 mb-[25px] px-4'}>
                        <div className={'row-span-2 flex flex-col items-center justify-center gap-3 p-[22px] rounded-2xl bg-white'}>
                            <div className={'flex items-center flex-col'}>
                                <p className={'text-sm font-medium text-[#9F9F9F]'}>Ваш уровень</p>
                                <p className={'text-[22px] font-bold'}>2</p>
                            </div>
                            <div className={'flex items-stretch gap-3'}>
                                <div className={'w-4 h-16 rounded-full bg-[#E5E6FB]'}>
                                    <div className={'rounded-full w-full h-full bg-[linear-gradient(135deg,_rgba(141,197,241,0.4)_-48.61%,_#63ABE6_105.56%)]'}></div>
                                </div>
                                <div className={'w-4 h-16 rounded-full bg-[#E5E6FB] flex items-end'}>
                                    <div
                                        className={'rounded-full w-full h-[35px] bg-[linear-gradient(135deg,_rgba(141,197,241,0.4)_-48.61%,_#63ABE6_105.56%)]'}></div>
                                </div>
                                <div className={'w-4 h-16 rounded-full bg-[#D7D7D7]'}></div>
                                <div className={'w-4 h-16 rounded-full bg-[#D7D7D7]'}></div>
                            </div>
                        </div>
                        <div className={'p-4 rounded-2xl bg-white flex items-center flex-col'}>
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Выполнено</p>
                            <p className={'text-[22px] font-bold'}>5 заданий</p>
                        </div>
                        <div className={'p-4 rounded-2xl bg-white flex items-center flex-col'}>
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Просрочено</p>
                            <p className={'text-[22px] font-bold'}>3 дня</p>
                        </div>
                        <div className={'py-2 px-4 rounded-2xl bg-white flex items-center col-span-2 gap-2 justify-between'}>
                            <div className={'flex gap-2 items-center'}>
                                <img className={'bg-transparent'} src={'/coin.png'} width={46} height={46}/>
                                <div className={'flex flex-col'}>
                                    <p className={'text-sm font-medium text-[#9F9F9F]'}>Ваш баланс</p>
                                    <p className={'text-sm font-bold'}>{supabaseUser?.total_points} эдельштейнов</p>
                                </div>
                            </div>
                            <Link to={'/points'}
                                className={"text-sm font-bold w-max leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]"}>
                                Подробнее
                            </Link>
                        </div>
                    </div>
                    <div className={'bg-white rounded-t-3xl pt-5'}>
                        <div className={'px-4 flex flex-col gap-3'}>
                            {links.map(el => (
                                <Link
                                    className={'relative overflow-hidden bg-[linear-gradient(271.99deg,_#F1F8FE_0%,_#F1EFFF_100%)] py-4 px-6 rounded-2xl flex flex-col gap-2 items-start justify-between'}
                                    to={el.link}>
                                    <p className={'font-semibold'}>{el.title}</p>
                                    <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'}/>
                                    <img src={el.image} className={'absolute scale-70 top-1/2 -right-[70px] -translate-y-1/2'}/>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>


            {/*<div className={'flex flex-col gap-12 text-black min-h-screen'}>
                <div
                    className={'items-center rounded-b-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom flex flex-col gap-8 pt-12 pb-4 px-4'}>
                    <div className={'flex items-center gap-3 flex-col'}>
                        {user?.photo_url ? <img className={'w-36 h-36 rounded-full'} src={user.photo_url} alt=""/> :
                            <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M47.1673 49.0001C47.1673 42.5568 38.81 37.3334 28.5007 37.3334C18.1913 37.3334 9.83398 42.5568 9.83398 49.0001M28.5007 30.3334C22.0573 30.3334 16.834 25.1101 16.834 18.6668C16.834 12.2234 22.0573 7.0001 28.5007 7.0001C34.944 7.0001 40.1673 12.2234 40.1673 18.6668C40.1673 25.1101 34.944 30.3334 28.5007 30.3334Z"
                                    stroke="#8C8C8C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>}
                        <p className={'text-xl font-semibold'}>Привет, {user?.username}</p>
                    </div>
                    <Link to={'/points'} className={'w-full flex items-center gap-3 justify-between p-4 bg-white rounded-full'}>
                        <div className={'flex items-center gap-1 font-semibold'}>
                            У вас {supabaseUser?.total_points} эйденштельнов
                        </div>
                        <img className={'w-[28px] h-[28px]'} src={'/ask-icon.svg'} alt=""/>
                    </Link>
                </div>
                <div className={'px-4 flex flex-col gap-3'}>
                    {links.map(el => (
                        <Link className={'bg-[linear-gradient(91.99deg,_#F7F7F7_0%,_#F3F3F3_100%)] p-4 rounded-full flex items-center justify-between'} to={el.link}>
                            <p className={'font-semibold'}>{el.title}</p>
                            <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'}/>
                        </Link>
                    ))}
                </div>
            </div>*/}
        </Page>
    )
}