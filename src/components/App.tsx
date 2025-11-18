import { useMemo, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { retrieveLaunchParams, useSignal, isMiniAppDark, initDataState } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { AnimatePresence } from 'framer-motion';

import { routers } from '@/navigation/routes.tsx';
import Onboarding from "@/pages/Onboarding.tsx";
import { ScrollToTop } from "@/ScrollToTop.tsx";
import { useSupabaseUser, useActiveTariff, useRedeemToken, useFindTokenByTgId } from '@/lib/supabase/hooks';
import TokenErrorPage from '@/pages/TokenErrorPage/TokenErrorPage';
import { AppMotionProvider } from '@/animations/motionConfig';
import TabBar from '@/components/TabBar/TabBar';
import IFrameSplash from '@/components/IFrameSplash';

function AppContent({ showSplash }: { showSplash: boolean }) {
    const lp = useMemo(() => retrieveLaunchParams(), []);
    const isDark = useSignal(isMiniAppDark);
    const initData = useSignal(initDataState);
    const location = useLocation();

    const { supabaseUser, loading: userLoading } = useSupabaseUser(initData);
    const { data: activeTariff, isLoading: tariffLoading } = useActiveTariff(supabaseUser?.id);
    const { mutate: redeemToken, isPending: isRedeeming, isIdle } = useRedeemToken();
    const { mutate: findTokenByTgId, isPending: isFindingToken, isIdle: isFindIdle } = useFindTokenByTgId();

    // Извлекаем start parameter согласно документации Telegram Mini Apps
    // https://docs.telegram-mini-apps.com/platform/start-parameter
    const accessToken = lp.tgWebAppStartParam || initData?.start_param;

    // Для поиска персональных токенов
    const [personalToken, setPersonalToken] = useState<string | null>(null);
    const [hasSearchedPersonalToken, setHasSearchedPersonalToken] = useState(false);


    // Поиск персонального токена если нет startapp токена
    useEffect(() => {
        const shouldSearchPersonalToken =
            !accessToken && // Нет токена из startapp
            supabaseUser && // Пользователь загружен
            !userLoading && // Данные пользователя загружены
            !hasSearchedPersonalToken && // Еще не искали
            isFindIdle && // Поиск не выполняется
            !isFindingToken; // Поиск не в процессе

        if (shouldSearchPersonalToken) {
            setHasSearchedPersonalToken(true);

            findTokenByTgId(
                { tgId: String(supabaseUser.telegram_id) },
                {
                    onSuccess: (data) => {
                        if (data.found && data.token) {
                            setPersonalToken(data.token);
                        }
                    }
                }
            );
        }
    }, [accessToken, supabaseUser, userLoading, hasSearchedPersonalToken, isFindIdle, isFindingToken, findTokenByTgId]);

    // Активация токена (startapp или персональный) - ТОЛЬКО если нет активного тарифа
    useEffect(() => {
        const tokenToRedeem = accessToken || personalToken;
        const canRedeem = tokenToRedeem && supabaseUser && !userLoading && isIdle && !isRedeeming && !activeTariff && !tariffLoading;

        if (canRedeem) {
            redeemToken({ accessToken: tokenToRedeem, userId: supabaseUser.id });
        }
    }, [accessToken, personalToken, supabaseUser, userLoading, isIdle, isRedeeming, redeemToken, activeTariff, tariffLoading]);

    // Показываем загрузку пока не завершатся все критичные процессы
    const isAppLoading = userLoading || tariffLoading ||
        ((accessToken || personalToken) && !activeTariff && isRedeeming) ||
        (!accessToken && !activeTariff && !hasSearchedPersonalToken && !isFindingToken);
    if (isAppLoading && showSplash) {
        // Показываем сплэш-скрин вместо обычной загрузки
        return null; // Сплэш будет показан в App() компоненте
    } else if (isAppLoading && !showSplash) {
        // Если сплэш уже показали, но данные еще грузятся - показываем обычную загрузку
        return (
            <div className="profile-loading">
                <div className="profile-loading-spinner" aria-hidden="true" />
                <p>Загрузка приложения...</p>
            </div>
        );
    }

    // Если нет активного тарифа И нет токенов для активации - блокируем доступ
    // ЗАКОММЕНТИРОВАНО: Гости теперь имеют доступ к приложению
    // if (supabaseUser && !activeTariff && !accessToken && !personalToken && hasSearchedPersonalToken) {
    //     return <TokenErrorPage />;
    // }

    // Если есть доступ, но не завершен онбординг
    const shouldShowOnboarding = supabaseUser && !supabaseUser.onboarding_completed;
    const tabBatRoutes = ['/', '/library', '/profile', '/profile2', '/faq', '/help', '/chats', '/calendar', '/techniques'];
    const showTabBar = tabBatRoutes.includes(location.pathname);

    if (shouldShowOnboarding) {
        return <Onboarding onClose={() => { }} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            <ScrollToTop />
            <div style={{ flex: 1, position: 'relative' }}>
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        {routers.map((router) => <Route key={router.path} {...router} />)}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </AnimatePresence>
            </div>
            {showTabBar && !showSplash && <TabBar />}
        </div>
    );
}

export function App() {
    // Показываем сплэш только при первом запуске приложения в сессии
    const [showSplash, setShowSplash] = useState(() => {
        const hasShownSplash = sessionStorage.getItem('brain-splash-shown');
        return !hasShownSplash; // Показываем, если еще не показывали в этой сессии
    });
    const lp = useMemo(() => retrieveLaunchParams(), []);
    const isDark = useSignal(isMiniAppDark);

    // Блокировка свайпов в Telegram Web App во время показа сплэша
    useEffect(() => {
        if (showSplash && window.Telegram?.WebApp?.postEvent) {
            window.Telegram.WebApp.postEvent('web_app_setup_swipe_behavior', {
                allow_vertical_swipe: false
            });
        } else if (!showSplash && window.Telegram?.WebApp?.postEvent) {
            // Разблокируем свайпы после закрытия сплэша
            window.Telegram.WebApp.postEvent('web_app_setup_swipe_behavior', {
                allow_vertical_swipe: true
            });
        }
    }, [showSplash]);

    return (
        <AppRoot
            appearance={isDark ? 'dark' : 'light'}
            platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
        >
            <AppMotionProvider>
                {/* Контент грузится параллельно */}
                <HashRouter>
                    <AppContent showSplash={showSplash} />
                </HashRouter>

                {/* Сплэш показывается во время загрузки приложения */}
                {showSplash && (
                    <IFrameSplash onDone={() => {
                        setShowSplash(false);
                        // Сохраняем флаг, что сплэш уже показали в этой сессии
                        sessionStorage.setItem('brain-splash-shown', 'true');
                    }} />
                )}
            </AppMotionProvider>
        </AppRoot>
    );
}
