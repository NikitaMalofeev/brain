import { useMemo, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, } from 'react-router-dom';
import { retrieveLaunchParams, useSignal, isMiniAppDark } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { routers } from '@/navigation/routes.tsx';
import Onboarding from "@/pages/Onboarding.tsx";
import {ScrollToTop} from "@/ScrollToTop.tsx";

export function App() {
    const lp = useMemo(() => retrieveLaunchParams(), []);
    const isDark = useSignal(isMiniAppDark);
    const [showOnboarding, setShowOnboarding] = useState(true);

    const handleCloseOnboarding = () => {
        setShowOnboarding(false);
    };

    return (
        <AppRoot
            appearance={isDark ? 'dark' : 'light'}
            platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
        >
            {showOnboarding ? (<Onboarding onClose={handleCloseOnboarding} />) : <HashRouter>
                <ScrollToTop />
                <Routes>
                    {routers.map((router) => <Route key={router.path} {...router} />)}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </HashRouter>}
        </AppRoot>
    );
}
