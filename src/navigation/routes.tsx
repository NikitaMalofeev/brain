import { IndexPage } from '@/pages/IndexPage/IndexPage';
import { InitDataPage } from '@/pages/InitDataPage';
import { LaunchParamsPage } from '@/pages/LaunchParamsPage';
import { ThemeParamsPage } from '@/pages/ThemeParamsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TONConnectPage } from '@/pages/TONConnectPage/TONConnectPage';
import { DiagnosticsPage } from '@/pages/DiagnosticsPage/DiagnosticsPage';
import AdminPage from '@/pages/AdminPage/AdminPage';
import LibraryPage from '@/pages/LibraryPage/LibraryPage';
import StagePage from '@/pages/LibraryPage/StagePage';
import LessonPage from '@/pages/LibraryPage/LessonPage';
import {UserPage} from "@/pages/UserPage/UserPage.tsx";
import {Chats} from "@/pages/Chats/Chats.tsx";
import {HelpPage} from "@/pages/HelpPage/HelpPage.tsx";
import {FaqPage} from "@/pages/FaqPage/FaqPage.tsx";
import {CommonPage} from "@/pages/CommonPage/CommonPage.tsx";
import {MainPage} from "@/pages/MainPage/MainPage.tsx";

export const routers = [
  {
    path: '/',
    Component: MainPage
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
    path: '/ton-connect',
    Component: TONConnectPage
  },
  {
    path: '/diagnostics',
    Component: DiagnosticsPage
  }
];
