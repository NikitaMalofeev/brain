import { lazy } from 'react';

// Lazy loading для всех страниц - загружаются только при необходимости
// Это критически важно для уменьшения initial bundle

// Главные страницы (часто используемые)
const MainPage = lazy(() => import('@/pages/MainPage/MainPage').then(m => ({ default: m.MainPage })));
const CommonPage = lazy(() => import('@/pages/CommonPage/CommonPage').then(m => ({ default: m.CommonPage })));
const TechniquesPage = lazy(() => import('@/pages/TechniquesPage/TechniquesPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage/CalendarPage'));
const UserPage = lazy(() => import('@/pages/UserPage/UserPage').then(m => ({ default: m.UserPage })));

// Аудио страницы - НЕ lazy, чтобы избежать мигания белого спиннера
import TechniquePlayerPage from '@/pages/TechniquesPage/TechniquePlayerPage';
import { AudioPlayerPage } from '@/pages/AudioPlayerPage';

// Библиотека и модули
const LibraryPage = lazy(() => import('@/pages/LibraryPage/LibraryPage'));
const ModuleStagesPage = lazy(() => import('@/pages/LibraryPage/ModuleStagesPage'));
const StagePage = lazy(() => import('@/pages/LibraryPage/StagePage'));
const LessonPage = lazy(() => import('@/pages/LibraryPage/LessonPage'));
const MaterialPage = lazy(() => import('@/pages/MaterialPage').then(m => ({ default: m.MaterialPage })));

// События и карта
const EventPage = lazy(() => import('@/pages/EventPage/EventPage'));
const RoadMapPage = lazy(() => import('@/pages/RoadMapPage/RoadMapPage'));

// Профиль и пользователь
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const InfoPoints = lazy(() => import('@/pages/InfoPoints').then(m => ({ default: m.InfoPoints })));

// Коммуникации
const Chats = lazy(() => import('@/pages/Chats/Chats').then(m => ({ default: m.Chats })));
const HelpPage = lazy(() => import('@/pages/HelpPage/HelpPage').then(m => ({ default: m.HelpPage })));
const FaqPage = lazy(() => import('@/pages/FaqPage/FaqPage').then(m => ({ default: m.FaqPage })));

// Утилиты и отладка (редко используемые)
const IndexPage = lazy(() => import('@/pages/IndexPage/IndexPage').then(m => ({ default: m.IndexPage })));
const InitDataPage = lazy(() => import('@/pages/InitDataPage').then(m => ({ default: m.InitDataPage })));
const LaunchParamsPage = lazy(() => import('@/pages/LaunchParamsPage').then(m => ({ default: m.LaunchParamsPage })));
const ThemeParamsPage = lazy(() => import('@/pages/ThemeParamsPage').then(m => ({ default: m.ThemeParamsPage })));
const DiagnosticsPage = lazy(() => import('@/pages/DiagnosticsPage/DiagnosticsPage').then(m => ({ default: m.DiagnosticsPage })));
const TokenErrorPage = lazy(() => import('@/pages/TokenErrorPage/TokenErrorPage'));

export const routers = [
  {
    path: '/',
    Component: MainPage
  },
  {
    path: '/library',
    Component: CommonPage
  },
  {
    path: '/library/module/:moduleId',
    Component: ModuleStagesPage
  },
  {
    path: '/library/stage/:id',
    Component: StagePage
  },
  {
    path: '/library/lesson/:id',
    Component: LessonPage
  },
  {
    path: '/material/:id',
    Component: MaterialPage
  },
  {
    path: '/techniques',
    Component: TechniquesPage
  },
  {
    path: '/techniques/:id',
    Component: TechniquePlayerPage
  },
  {
    path: '/audio-player',
    Component: AudioPlayerPage
  },
  {
    path: '/calendar',
    Component: CalendarPage
  },
  {
    path: '/calendar/event/:id',
    Component: EventPage
  },
  {
    path: '/roadmap',
    Component: RoadMapPage
  },
  {
    path: '/points',
    Component: InfoPoints
  },
  {
    path: '/old-index',
    Component: IndexPage
  },
  {
    path: '/init-data',
    Component: InitDataPage
  },
  {
    path: '/launch-params',
    Component: LaunchParamsPage
  },
  {
    path: '/theme-params',
    Component: ThemeParamsPage
  },
  {
    path: '/profile',
    Component: ProfilePage
  },
  {
    path: '/chats',
    Component: Chats
  },
  {
    path: '/help',
    Component: HelpPage
  },
  {
    path: '/faq',
    Component: FaqPage
  },
  {
    path: '/Common',
    Component: CommonPage
  },
  {
    path: '/profile2',
    Component: UserPage
  },
  {
    path: '/diagnostics',
    Component: DiagnosticsPage
  },
  {
    path: '/token-error',
    Component: TokenErrorPage
  }
];
