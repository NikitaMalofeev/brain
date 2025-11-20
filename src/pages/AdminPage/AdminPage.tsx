import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { PlayerProvider } from '@/contexts/PlayerContext';
import './AdminPage.css';

// Компоненты
import { AdminSidebar, type AdminSection } from './components/AdminSidebar';
import SubmissionsManager from './SubmissionsManager';
import SubmissionDetail from './SubmissionDetail';
import MaterialsManager from './components/MaterialsManager/MaterialsManager';
import StudentsManager from './components/StudentsManager/StudentsManager';
import CuratorsManager from './components/CuratorsManager/CuratorsManager';
import ChatsManager from './components/ChatsManager/ChatsManager';
import FaqManager from './components/FaqManager/FaqManager';
import BroadcastsManager from './components/BroadcastsManager/BroadcastsManager';
import SimpleTariffsManager from './components/TariffsManager/SimpleTariffsManager';
import TokensManager from './components/TokensManager/TokensManager';
import TechniquesManager from './components/TechniquesManager/TechniquesManager';
import StreamsManager from './components/StreamsManager/StreamsManager';
import CalendarEventsManager from './components/CalendarEventsManager/CalendarEventsManager';
import { UnifiedCoursesManager } from './components/CoursesManager';
import { ModulesManager } from './components/ModulesManager';

// Состояние для навигации по сабмитам
interface SubmissionsNavigationState {
  view: 'list' | 'detail';
  selectedSubmissionId?: number;
}

const AdminPageNew: React.FC = () => {
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState<AdminSection>('courses');
  const [submissionsNavigation, setSubmissionsNavigation] = useState<SubmissionsNavigationState>({ view: 'list' });

  // Состояние авторизации
  const [passwordAuth, setPasswordAuth] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('admin_auth');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [login, setLogin] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Данные пользователя
  const [adminUser, setAdminUser] = useState<{
    id: string;
    role: string;
    first_name?: string;
    last_name?: string;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Устанавливаем класс для body
  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, []);

  // Валидация данных из localStorage
  useEffect(() => {
    try {
      const authStored = localStorage.getItem('admin_auth');
      const userStored = localStorage.getItem('admin_user');
      const tokenStored = localStorage.getItem('admin_access_token');

      if (authStored === 'true' && userStored && tokenStored) {
        const userData = JSON.parse(userStored);

        if (userData && userData.id && userData.role &&
          ['admin', 'curator'].includes(userData.role)) {

          if (supabase) {
            supabase.auth.setSession({
              access_token: tokenStored,
              refresh_token: '',
            });
          }
          console.log('Сессия восстановлена из localStorage:', userData.role);
        } else {
          clearAuth();
        }
      }
    } catch (err) {
      console.warn('Ошибка валидации localStorage:', err);
      clearAuth();
    }
  }, []);

  // Для куратора переключаемся на проверку ДЗ
  useEffect(() => {
    if (adminUser?.role === 'curator') {
      setCurrentSection('submissions');
    }
  }, [adminUser]);

  const clearAuth = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_access_token');
    setPasswordAuth(false);
    setAdminUser(null);
  };

  // Авторизация
  const authenticateUser = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }

    try {
      setAuthLoading(true);
      setError(null);

      if (!supabase) {
        setError('Supabase не инициализирован');
        return;
      }

      const { data, error } = await supabase
        .rpc('authenticate_web_user', {
          login_param: login.trim(),
          password_param: password.trim()
        });

      if (error) {
        console.error('Ошибка авторизации:', error);
        setError('Ошибка подключения к базе данных');
        return;
      }

      if (!data || data.length === 0 || !data[0].is_authenticated) {
        setError('Неверный логин или пароль');
        return;
      }

      const userData = data[0];

      if (!userData.access_token) {
        setError('Ошибка конфигурации сервера');
        return;
      }

      const userInfo = {
        id: userData.user_id,
        role: userData.user_role,
        first_name: userData.first_name,
        last_name: userData.last_name
      };

      const accessToken = userData.access_token;

      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });

      try {
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_user', JSON.stringify(userInfo));
        localStorage.setItem('admin_access_token', accessToken);
      } catch (err) {
        console.warn('Ошибка сохранения в localStorage:', err);
      }

      setPasswordAuth(true);
      setAdminUser(userInfo);
      setLogin('');
      setPassword('');

    } catch (err) {
      console.error('Неожиданная ошибка авторизации:', err);
      setError('Произошла неожиданная ошибка');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAuth();
    navigate('/');
  };

  // Обработчики для сабмитов
  const handleSubmissionSelect = (submissionId: number) => {
    setSubmissionsNavigation({
      view: 'detail',
      selectedSubmissionId: submissionId
    });
  };

  const handleSubmissionsBack = () => {
    setSubmissionsNavigation({ view: 'list' });
  };

  const handleSubmissionUpdated = () => {
    console.log('Сабмит обновлен');
  };

  const handleSectionChange = (section: AdminSection) => {
    setCurrentSection(section);
    // Сбрасываем навигацию сабмитов
    if (section !== 'submissions') {
      setSubmissionsNavigation({ view: 'list' });
    }
  };

  // Форма входа
  if (!passwordAuth) {
    return (
      <div className="admin-login">
        <h1>Админ-панель</h1>

        <div className="admin-warning">
          Доступ ограничен. Введите логин и пароль для входа.
        </div>

        {error && <div className="admin-error">{error}</div>}

        <input
          type="text"
          className="admin-input"
          placeholder="Логин"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && authenticateUser()}
          disabled={authLoading}
        />
        <input
          type="password"
          className="admin-input"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && authenticateUser()}
          disabled={authLoading}
        />
        <button
          className="admin-button"
          onClick={authenticateUser}
          disabled={authLoading}
        >
          {authLoading ? 'Проверка...' : 'Войти'}
        </button>
      </div>
    );
  }

  // Рендер контента
  const renderContent = () => {
    switch (currentSection) {
      case 'courses':
        return <UnifiedCoursesManager />;
      case 'techniques':
        return <TechniquesManager />;
      case 'streams':
        return <StreamsManager />;
      case 'modules':
        return <ModulesManager />;
      case 'tariffs':
        return <SimpleTariffsManager />;
      case 'students':
        return <StudentsManager currentUser={adminUser} />;
      case 'curators':
        return <CuratorsManager />;
      case 'submissions':
        return (
          <>
            {submissionsNavigation.view === 'list' && (
              <SubmissionsManager
                onSubmissionSelect={handleSubmissionSelect}
                currentUser={adminUser}
              />
            )}
            {submissionsNavigation.view === 'detail' && submissionsNavigation.selectedSubmissionId && (
              <SubmissionDetail
                submissionId={submissionsNavigation.selectedSubmissionId}
                onBack={handleSubmissionsBack}
                onSubmissionUpdated={handleSubmissionUpdated}
                currentUser={adminUser}
              />
            )}
          </>
        );
      case 'materials':
        return <MaterialsManager />;
      case 'chats':
        return <ChatsManager />;
      case 'faq':
        return <FaqManager />;
      case 'broadcasts':
        return <BroadcastsManager />;
      case 'tokens':
        return <TokensManager />;
      case 'calendar':
        return <CalendarEventsManager />;
      default:
        return <div>Раздел не найден</div>;
    }
  };

  return (
    <PlayerProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <AdminSidebar
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
          userRole={adminUser?.role}
          userName={`${adminUser?.last_name || ''} ${adminUser?.first_name || ''}`.trim()}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </PlayerProvider>
  );
};

export default AdminPageNew;
