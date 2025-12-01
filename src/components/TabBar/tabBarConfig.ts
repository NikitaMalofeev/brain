// Конфигурация нижнего меню TabBar
// Тема определяется по роуту

export type TabBarTheme = 'light' | 'dark';

// ============================================
// РОУТЫ СО СВЕТЛЫМ МЕНЮ (остальные - тёмное)
// ============================================
export const LIGHT_THEME_ROUTES: string[] = [
    '/',           // MainPage
    '/profile2',   // Profile
];

// Конфигурация тем
export const tabBarThemes = {
    light: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        buttonBackground: 'transparent',
        buttonActiveBackground: 'linear-gradient(109.65deg, #E1C1F4 13.64%, #B862EA 124.92%)',
        buttonRadius: '50%',
        buttonSize: { width: '36px', height: '36px' },
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
        useActiveIcons: true,
    },
    dark: {
        background: '#0000004D',
        backgroundImage: 'url(/background2.png)',
        backgroundSize: '500%',
        backgroundPosition: 'bottom center',
        backdropFilter: 'blur(30px)',
        buttonBackground: 'transparent',
        buttonActiveBackground: '#0000004D',
        buttonRadius: '18px',
        buttonSize: { width: '48px', height: '36px' },
        boxShadow: 'none',
        useActiveIcons: false,
    },
} as const;

// Получить тему по роуту
export const getThemeByRoute = (pathname: string) => {
    const isLight = LIGHT_THEME_ROUTES.includes(pathname);
    return tabBarThemes[isLight ? 'light' : 'dark'];
};
