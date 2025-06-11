// Include Telegram UI styles first to allow our code override the package CSS.
import '@telegram-apps/telegram-ui/dist/styles.css';

import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { initStagewise } from './dev/StagewiseToolbar.tsx';

import './index.css';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Инициализация Stagewise Toolbar только в DEV режиме
/*if (import.meta.env.DEV) {
  initStagewise();
}*/

const root = ReactDOM.createRoot(document.getElementById('root')!);

// РАНННЯЯ проверка на админку ДО любых импортов Telegram SDK
const isAdminRoute = window.location.pathname.startsWith('/admin');

if (isAdminRoute) {
  // ДЛЯ АДМИНКИ: импортируем только то, что нужно для админки
  console.log('🔧 Admin mode detected - loading admin app');

  // Динамические импорты для админки
  import('./adminApp').then(({ AdminApp }) => {
    root.render(
      <StrictMode>
        <AdminApp />
      </StrictMode>
    );
  }).catch((error) => {
    console.error('Failed to load admin app:', error);
    root.render(
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Ошибка загрузки админки</h1>
        <p>{error.message}</p>
      </div>
    );
  });
} else {
  // ДЛЯ ОБЫЧНОГО ПРИЛОЖЕНИЯ: загружаем полный Telegram App
  console.log('🔧 Regular mode - loading Telegram app');

  // Динамические импорты для Telegram приложения
  Promise.all([
    import('./mockEnv.ts'),
    import('@telegram-apps/sdk-react'),
    import('@/components/Root.tsx'),
    import('@/components/EnvUnsupported.tsx'),
    import('@/init.ts')
  ]).then(async ([mockEnv, sdk, { Root }, { EnvUnsupported }, { init }]) => {
    try {
      const launchParams = sdk.retrieveLaunchParams();
      const { tgWebAppPlatform: platform } = launchParams;
      const debug = (launchParams.tgWebAppStartParam || '').includes('platformer_debug')
        || import.meta.env.DEV;

      // Configure all application dependencies.
      await init({
        debug,
        eruda: debug && ['ios', 'android'].includes(platform),
        mockForMacOS: platform === 'macos',
      });
      const queryClient = new QueryClient()

      root.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <Root />
          </QueryClientProvider>
        </StrictMode>,
      );
    } catch (e) {
      console.error('Telegram initialization failed:', e);
      root.render(<EnvUnsupported />);
    }
  }).catch((error) => {
    console.error('Failed to load Telegram app:', error);
    root.render(
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Ошибка загрузки приложения</h1>
        <p>{error.message}</p>
      </div>
    );
  });
}
