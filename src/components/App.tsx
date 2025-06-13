import { useMemo, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { retrieveLaunchParams, useSignal, isMiniAppDark, initDataState } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { AnimatePresence } from 'framer-motion';

import { routers } from '@/navigation/routes.tsx';
import Onboarding from "@/pages/Onboarding.tsx";
import { ScrollToTop } from "@/ScrollToTop.tsx";
import { useSupabaseUser, useActiveTariff, useRedeemToken } from '@/lib/supabase/hooks';
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

    // Извлекаем start parameter согласно документации Telegram Mini Apps
    // https://docs.telegram-mini-apps.com/platform/start-parameter
    const accessToken = lp.tgWebAppStartParam || initData?.start_param;

    // Debug Logs
    console.log('%c--- Render AppContent ---', 'color: yellow; font-weight: bold;');
    console.log(`User Loading: ${userLoading}, Tariff Loading: ${tariffLoading}, Token Redeeming: ${isRedeeming}`);
    console.log('Supabase User:', supabaseUser ? `ID: ${supabaseUser.id}` : 'null');
    console.log('Active Tariff:', activeTariff ? `Code: ${activeTariff.tariff_code}` : 'null');
    console.log(`Access Token: ${accessToken || 'null'}`);

    useEffect(() => {
        // Условие для активации токена
        const canRedeem = accessToken && supabaseUser && !userLoading && isIdle && !isRedeeming;

        if (canRedeem) {
            console.log('🚀 Triggering token redemption...');
            redeemToken({ accessToken, userId: supabaseUser.id });
        }
    }, [accessToken, supabaseUser, userLoading, isIdle, isRedeeming, redeemToken]);

    // Показываем загрузку пока не завершатся все критичные процессы
    const isAppLoading = userLoading || tariffLoading || (accessToken && isRedeeming);
    if (isAppLoading && showSplash) {
        // Показываем сплэш-скрин вместо обычной загрузки
        return null; // Сплэш будет показан в App() компоненте
    } else if (isAppLoading && !showSplash) {
        // Если сплэш уже показали, но данные еще грузятся - показываем обычную загрузку
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '18px'
            }}>
                Загрузка...
            </div>
        );
    }

    // Если нет активного тарифа И нет токена для активации - блокируем доступ
    if (supabaseUser && !activeTariff && !accessToken) {
        return <TokenErrorPage />;
    }

    // Если есть доступ, но не завершен онбординг
    const shouldShowOnboarding = supabaseUser && !supabaseUser.onboarding_completed;
    const tabBatRoutes = ['/', '/library', '/profile', '/profile2', '/faq', '/help'];
    const showTabBar = tabBatRoutes.includes(location.pathname);

    if (shouldShowOnboarding) {
        return <Onboarding onClose={() => { }} />;
    }

    return (
        <>
            <ScrollToTop />
            <div style={{ position: 'relative', flex: 1 }}>
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        {routers.map((router) => <Route key={router.path} {...router} />)}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </AnimatePresence>
            </div>
            {showTabBar && !showSplash && (
                <div style={{ position: 'relative', zIndex: 100 }}>
                    <TabBar />
                </div>
            )}
        </>
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
