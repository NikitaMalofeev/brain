import { IndexPage } from '@/pages/IndexPage/IndexPage';
import { InitDataPage } from '@/pages/InitDataPage';
import { LaunchParamsPage } from '@/pages/LaunchParamsPage';
import { ThemeParamsPage } from '@/pages/ThemeParamsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TONConnectPage } from '@/pages/TONConnectPage/TONConnectPage';
import { DiagnosticsPage } from '@/pages/DiagnosticsPage/DiagnosticsPage';
import { MainScreen } from '@/pages/MainScreen/MainScreen';
import { QuizFlow } from '@/pages/QuizFlow/QuizFlow';
import PracticePage from '@/pages/PracticePage/PracticePage';
import AdminPage from '@/pages/AdminPage/AdminPage';
import LibraryPage from '@/pages/LibraryPage/LibraryPage';

export const routers = [
  {
    path: '/',
    Component: MainScreen
  },
  {
    path: '/library',
    Component: LibraryPage
  },
  {
    path: '/quiz',
    Component: QuizFlow
  },
  {
    path: '/practice/:contentId',
    Component: PracticePage
  },
  {
    path: '/practice/meditation/:meditationType/:meditationObject',
    Component: PracticePage
  },
  {
    path: '/practice/:contentId/:meditationType',
    Component: PracticePage
  },
  {
    path: '/admin',
    Component: AdminPage
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
    path: '/ton-connect',
    Component: TONConnectPage
  },
  {
    path: '/diagnostics',
    Component: DiagnosticsPage
  }
];
