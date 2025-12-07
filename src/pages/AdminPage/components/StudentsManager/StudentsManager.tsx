import React, { useEffect, useState } from 'react';
import StudentCard from '@/pages/AdminPage/components/StudentsManager/StudentCard';
import { useStudentsAdmin } from '@/lib/supabase/hooks/useStudentsAdmin';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Select,
  Alert,
  Empty,
  Input,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  IdcardOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface StudentsManagerProps {
  currentUser?: {
    id: string;
    role: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

interface StudentRecord {
  user_id: string;
  full_name: string;
  role: 'user' | 'curator' | 'admin' | 'guest';
  telegram_id?: string;
  web_login?: string;
  course_title?: string;
  created_at: string;
  last_login?: string | null;
  web_last_login?: string | null;
  total_points: number;
  completed_lessons_percent: number;
  curator_name?: string;
}

const StudentsManager: React.FC<StudentsManagerProps> = ({ currentUser }) => {
  const { students, loading, error, pagination, loadStudents } = useStudentsAdmin();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [currentSort, setCurrentSort] = useState<{
    field: 'points' | 'created_at' | 'last_login';
    order: 'ASC' | 'DESC';
  }>({
    field: 'created_at',
    order: 'DESC'
  });
  const [roleFilter, setRoleFilter] = useState<'all' | 'guest' | 'user' | 'curator' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    loadStudents({
      page: 1,
      perPage: pagination.perPage,
      sortBy: currentSort.field,
      sortOrder: currentSort.order
    });
  }, [currentSort]);

  useEffect(() => {
    let filtered = students as StudentRecord[];

    if (currentUser?.role === 'curator') {
      const curatorFullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
      filtered = filtered.filter(student =>
        student.curator_name === curatorFullName ||
        student.curator_name === currentUser.first_name
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(student => student.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const roleLabels: Record<string, string> = {
        user: 'ученик',
        curator: 'куратор',
        admin: 'админ',
        guest: 'гость'
      };

      filtered = filtered.filter(student => {
        const searchableFields = [
          student.full_name,
          student.telegram_id,
          student.web_login,
          student.course_title,
          student.curator_name,
          roleLabels[student.role] || student.role,
          String(student.total_points),
          `${student.completed_lessons_percent}%`,
          student.created_at ? new Date(student.created_at).toLocaleDateString('ru-RU') : '',
          student.last_login ? new Date(student.last_login).toLocaleDateString('ru-RU') : '',
          student.web_last_login ? new Date(student.web_last_login).toLocaleDateString('ru-RU') : '',
        ];

        return searchableFields.some(field =>
          field && field.toLowerCase().includes(query)
        );
      });
    }

    setFilteredStudents(filtered);
  }, [students, currentUser, roleFilter, searchQuery]);

  if (selectedStudentId) {
    return <StudentCard studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} currentUser={currentUser} />;
  }

  const handlePrev = () => {
    if (pagination.currentPage > 1) {
      loadStudents({
        page: pagination.currentPage - 1,
        perPage: pagination.perPage,
        sortBy: currentSort.field,
        sortOrder: currentSort.order
      });
    }
  };

  const handleNext = () => {
    if (pagination.hasMore) {
      loadStudents({
        page: pagination.currentPage + 1,
        perPage: pagination.perPage,
        sortBy: currentSort.field,
        sortOrder: currentSort.order
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatLastLogin = (lastLogin?: string | null, webLastLogin?: string | null) => {
    const latest = webLastLogin || lastLogin;
    if (!latest) return '—';

    return new Date(latest).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleTag = (role: 'user' | 'curator' | 'admin' | 'guest') => {
    const config = {
      user: { color: 'success', label: 'Ученик' },
      curator: { color: 'processing', label: 'Куратор' },
      admin: { color: 'error', label: 'Админ' },
      guest: { color: 'default', label: 'Гость' }
    };
    const { color, label } = config[role];
    return <Tag color={color}>{label}</Tag>;
  };

  const columns: ColumnsType<StudentRecord> = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: StudentRecord['role']) => getRoleTag(role),
    },
    {
      title: 'Telegram-ID / Web-login',
      key: 'identity',
      render: (_: any, record: StudentRecord) => (
        record.web_login ? (
          <Text title="Web-login">{record.web_login}</Text>
        ) : (
          <Text type="secondary" title="Telegram ID">{record.telegram_id}</Text>
        )
      ),
    },
    {
      title: 'Курс',
      dataIndex: 'course_title',
      key: 'course_title',
      render: (title: string) => title || '—',
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      sortOrder: currentSort.field === 'created_at' ? (currentSort.order === 'DESC' ? 'descend' : 'ascend') : undefined,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Последний вход',
      key: 'last_login',
      sorter: true,
      sortOrder: currentSort.field === 'last_login' ? (currentSort.order === 'DESC' ? 'descend' : 'ascend') : undefined,
      render: (_: any, record: StudentRecord) => formatLastLogin(record.last_login, record.web_last_login),
    },
    {
      title: 'Баллы',
      dataIndex: 'total_points',
      key: 'total_points',
      width: 80,
      sorter: true,
      sortOrder: currentSort.field === 'points' ? (currentSort.order === 'DESC' ? 'descend' : 'ascend') : undefined,
    },
    {
      title: '% уроков',
      dataIndex: 'completed_lessons_percent',
      key: 'completed_lessons_percent',
      width: 90,
      render: (percent: number) => `${percent}%`,
    },
    {
      title: 'Куратор',
      dataIndex: 'curator_name',
      key: 'curator_name',
      render: (name: string) => name || '—',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: StudentRecord) => (
        <Button
          size="small"
          icon={<IdcardOutlined />}
          onClick={() => setSelectedStudentId(record.user_id)}
        >
          Карточка
        </Button>
      ),
    },
  ];

  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    if (sorter.field) {
      const fieldMap: Record<string, 'points' | 'created_at' | 'last_login'> = {
        'created_at': 'created_at',
        'last_login': 'last_login',
        'total_points': 'points',
      };
      const field = fieldMap[sorter.field] || 'created_at';
      const order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
      setCurrentSort({ field, order });
    }
  };

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          {currentUser?.role === 'curator' ? 'Мои ученики' : 'Ученики'}
        </Title>
      }
      extra={
        <Space>
          <Input
            placeholder="Поиск по всем колонкам..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 250 }}
          />
          <Text>Фильтр по роли:</Text>
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 120 }}
          >
            <Select.Option value="all">Все</Select.Option>
            <Select.Option value="guest">Гости</Select.Option>
            <Select.Option value="user">Ученики</Select.Option>
            <Select.Option value="curator">Кураторы</Select.Option>
            <Select.Option value="admin">Админы</Select.Option>
          </Select>
        </Space>
      }
    >
      {error && (
        <Alert message={error.message} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {filteredStudents.length === 0 && !loading && currentUser?.role === 'curator' ? (
        <Empty description="У вас пока нет назначенных учеников" />
      ) : (
        <>
          <Table
            dataSource={filteredStudents}
            columns={columns}
            rowKey="user_id"
            loading={loading}
            pagination={false}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<LeftOutlined />}
              onClick={handlePrev}
              disabled={pagination.currentPage === 1}
            >
              Назад
            </Button>
            <Text>Страница {pagination.currentPage}</Text>
            <Button
              icon={<RightOutlined />}
              onClick={handleNext}
              disabled={!pagination.hasMore}
            >
              Вперёд
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

export default StudentsManager;
