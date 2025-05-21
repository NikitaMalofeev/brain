import { useMemo } from 'react';
import { HashRouter, Navigate, Route, RouterProvider, Routes, } from 'react-router-dom';
import { retrieveLaunchParams, useSignal, isMiniAppDark } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { routers } from '@/navigation/routes.tsx';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { OnboardingWrapper } from '@/components/Onboarding';

export function App() {
  const lp = useMemo(() => retrieveLaunchParams(), []);
  const isDark = useSignal(isMiniAppDark);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <OnboardingProvider>
        <HashRouter>
          <OnboardingWrapper>
            <Routes>
              {routers.map((router) => <Route key={router.path} {...router} />)}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </OnboardingWrapper>
        </HashRouter>
      </OnboardingProvider>
    </AppRoot>
  );
}
