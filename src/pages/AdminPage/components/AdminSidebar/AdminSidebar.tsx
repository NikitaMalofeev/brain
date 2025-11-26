import React from 'react';
import { Layout, Menu, Button, Typography, Avatar } from 'antd';
import {
  BookOutlined,
  AppstoreOutlined,
  TeamOutlined,
  CheckSquareOutlined,
  MessageOutlined,
  LogoutOutlined,
  ReadOutlined,
  AimOutlined,
  CalendarOutlined,
  BuildOutlined,
  DollarOutlined,
  UserOutlined,
  SolutionOutlined,
  QuestionCircleOutlined,
  VideoCameraOutlined,
  KeyOutlined,
  ScheduleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

export type AdminSection =
  // Контент
  | 'courses'
  | 'materials'
  | 'bundles'
  // Справочники
  | 'streams'
  | 'modules'
  | 'tariffs'
  // Пользователи
  | 'students'
  | 'curators'
  // Проверка
  | 'submissions'
  // Коммуникации
  | 'chats'
  | 'faq'
  | 'broadcasts'
  // Система
  | 'tokens'
  | 'calendar';

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  userRole: string | undefined;
  userName?: string;
  onLogout: () => void;
}

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSectionChange,
  userRole,
  userName,
  onLogout,
}) => {
  // Полное меню для админа
  const adminMenuItems: MenuItem[] = [
    getItem('Курсы', 'courses', <ReadOutlined />),
    getItem('Справочники', 'directories', <AppstoreOutlined />, [
      getItem('Материалы', 'materials', <BookOutlined />),
      getItem('Пакеты', 'bundles', <InboxOutlined />),
      getItem('Потоки', 'streams', <CalendarOutlined />),
      getItem('Модули', 'modules', <BuildOutlined />),
      getItem('Тарифы', 'tariffs', <DollarOutlined />),
    ]),
    getItem('Пользователи', 'users', <TeamOutlined />, [
      getItem('Ученики', 'students', <UserOutlined />),
      getItem('Кураторы', 'curators', <SolutionOutlined />),
      getItem('Доступы', 'tokens', <KeyOutlined />),
    ]),
    getItem('Проверка ДЗ', 'submissions', <CheckSquareOutlined />),
    getItem('События', 'calendar', <ScheduleOutlined />),
    getItem('Коммуникации', 'communications', <MessageOutlined />, [
      getItem('Чаты', 'chats', <MessageOutlined />),
      getItem('FAQ', 'faq', <QuestionCircleOutlined />),
      getItem('Эфиры', 'broadcasts', <VideoCameraOutlined />),
    ]),
  ];

  // Меню для куратора
  const curatorMenuItems: MenuItem[] = [
    getItem('Пользователи', 'users', <TeamOutlined />, [
      getItem('Ученики', 'students', <UserOutlined />),
    ]),
    getItem('Проверка ДЗ', 'submissions', <CheckSquareOutlined />),
  ];

  const menuItems = userRole === 'curator' ? curatorMenuItems : adminMenuItems;

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // Проверяем что это конечный пункт меню (не группа)
    const validSections: AdminSection[] = [
      'courses', 'materials', 'bundles', 'streams', 'modules', 'tariffs',
      'students', 'curators', 'submissions', 'chats', 'faq', 'broadcasts',
      'tokens', 'calendar'
    ];

    if (validSections.includes(e.key as AdminSection)) {
      onSectionChange(e.key as AdminSection);
    }
  };

  // Определяем открытые группы на основе текущей секции
  const getOpenKeys = (): string[] => {
    const sectionToGroup: Record<AdminSection, string> = {
      courses: '',
      materials: 'directories',
      bundles: 'directories',
      streams: 'directories',
      modules: 'directories',
      tariffs: 'directories',
      students: 'users',
      curators: 'users',
      submissions: '',
      chats: 'communications',
      faq: 'communications',
      broadcasts: 'communications',
      tokens: 'users',
      calendar: '',
    };
    const group = sectionToGroup[currentSection];
    return group ? [group] : [];
  };

  return (
    <Sider
      width={256}
      theme="dark"
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Text strong style={{ color: '#fff', fontSize: '18px', display: 'block' }}>
            Админ-панель
          </Text>
          {userName && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>
                {userName}
              </Text>
            </div>
          )}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentSection]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            flex: 1,
            borderRight: 0,
            overflowY: 'auto',
          }}
        />

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Text style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '12px',
            display: 'block',
            marginBottom: '12px'
          }}>
            Роль: {userRole === 'admin' ? 'Администратор' : 'Куратор'}
          </Text>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={onLogout}
            block
          >
            Выйти
          </Button>
        </div>
      </div>
    </Sider>
  );
};

export default AdminSidebar;
