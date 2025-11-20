import React, { useState } from 'react';

export type AdminSection =
  // Контент
  | 'courses'
  | 'materials'
  // Справочники
  | 'techniques'
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

interface MenuItem {
  id: AdminSection;
  label: string;
  icon: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
}

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  userRole: string | undefined;
  userName?: string;
  onLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSectionChange,
  userRole,
  userName,
  onLogout,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['content', 'directories', 'users']));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Структура меню
  const menuGroups: MenuGroup[] = [
    {
      id: 'content',
      label: 'Контент',
      icon: '📚',
      items: [
        { id: 'courses', label: 'Курсы', icon: '🎓' },
      ],
    },
    {
      id: 'directories',
      label: 'Материалы',
      icon: '📁',
      items: [
        { id: 'materials', label: 'Библиотека', icon: '📖' },
        { id: 'techniques', label: 'Техники', icon: '🎯' },
        { id: 'streams', label: 'Потоки', icon: '📅' },
        { id: 'modules', label: 'Модули', icon: '📦' },
        { id: 'tariffs', label: 'Тарифы', icon: '💰' },
      ],
    },
    {
      id: 'users',
      label: 'Пользователи',
      icon: '👥',
      items: [
        { id: 'students', label: 'Ученики', icon: '🧑‍🎓' },
        { id: 'curators', label: 'Кураторы', icon: '👨‍🏫' },
      ],
    },
    {
      id: 'review',
      label: 'Проверка',
      icon: '✅',
      items: [
        { id: 'submissions', label: 'Проверка ДЗ', icon: '📝' },
      ],
    },
    {
      id: 'communications',
      label: 'Коммуникации',
      icon: '💬',
      items: [
        { id: 'chats', label: 'Чаты', icon: '💭' },
        { id: 'faq', label: 'FAQ', icon: '❓' },
        { id: 'broadcasts', label: 'Эфиры', icon: '📺' },
      ],
    },
    {
      id: 'system',
      label: 'Система',
      icon: '⚙️',
      items: [
        { id: 'tokens', label: 'Доступы', icon: '🔑' },
        { id: 'calendar', label: 'События', icon: '📆' },
      ],
    },
  ];

  // Фильтрация для куратора
  const filteredGroups = userRole === 'curator'
    ? menuGroups.filter(group =>
        group.id === 'users' || group.id === 'review'
      ).map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.id === 'students' || item.id === 'submissions'
        )
      }))
    : menuGroups;

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Админ-панель</h1>
        {userName && (
          <p className="text-sm text-gray-400 mt-1 truncate">{userName}</p>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredGroups.map((group) => (
          <div key={group.id} className="mb-2">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full px-4 py-2 flex items-center justify-between text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>{group.icon}</span>
                <span className="text-sm font-medium">{group.label}</span>
              </span>
              <span className={`transform transition-transform ${expandedGroups.has(group.id) ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {/* Group Items */}
            {expandedGroups.has(group.id) && (
              <div className="ml-4">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-sm transition-colors ${
                      currentSection === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 mb-2">
          Роль: {userRole === 'admin' ? 'Администратор' : 'Куратор'}
        </div>
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Выйти
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
