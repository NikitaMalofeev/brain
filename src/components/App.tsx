import { useMemo } from 'react';
import { HashRouter, Navigate, Route, Routes, } from 'react-router-dom';
import { retrieveLaunchParams, useSignal, isMiniAppDark, initDataState } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { routers } from '@/navigation/routes.tsx';
import Onboarding from "@/pages/Onboarding.tsx";
import { ScrollToTop } from "@/ScrollToTop.tsx";
import { useSupabaseUser } from '@/lib/supabase/hooks';

export function App() {
    const lp = useMemo(() => retrieveLaunchParams(), []);
    const isDark = useSignal(isMiniAppDark);
    const initData = useSignal(initDataState);

    // Получаем пользователя и статус онбординга из базы данных
    const { supabaseUser, loading } = useSupabaseUser(initData);

    // Определяем нужно ли показывать онбординг
    const shouldShowOnboarding = supabaseUser && !supabaseUser.onboarding_completed;

    const handleCloseOnboarding = () => {
        // Онбординг закрывается автоматически после отметки в базе
        // Эта функция нужна для совместимости с компонентом Onboarding
    };

    // Показываем загрузку пока проверяем пользователя
    if (loading) {
        return (
            <AppRoot
                appearance={isDark ? 'dark' : 'light'}
                platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    fontSize: '18px'
                }}>
                    Загрузка...
                </div>
            </AppRoot>
        );
    }

    return (
        <AppRoot
            appearance={isDark ? 'dark' : 'light'}
            platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
        >
            {shouldShowOnboarding ? (<Onboarding onClose={handleCloseOnboarding} />) : <HashRouter>
                <ScrollToTop />
                <Routes>
                    {routers.map((router) => <Route key={router.path} {...router} />)}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </HashRouter>}
        </AppRoot>
    );
}
