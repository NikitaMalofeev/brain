import { IndexPage } from '@/pages/IndexPage/IndexPage';
import { InitDataPage } from '@/pages/InitDataPage';
import { LaunchParamsPage } from '@/pages/LaunchParamsPage';
import { ThemeParamsPage } from '@/pages/ThemeParamsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TONConnectPage } from '@/pages/TONConnectPage/TONConnectPage';
import { DiagnosticsPage } from '@/pages/DiagnosticsPage/DiagnosticsPage';
import { MainScreen } from '@/pages/MainScreen/MainScreen';
import AdminPage from '@/pages/AdminPage/AdminPage';
import LibraryPage from '@/pages/LibraryPage/LibraryPage';
import StagePage from '@/pages/LibraryPage/StagePage';
import LessonPage from '@/pages/LibraryPage/LessonPage';

export const routers = [
  {
    path: '/',
    Component: LibraryPage
  },
  {
    path: '/library',
    Component: LibraryPage
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
