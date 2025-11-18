import React, { useEffect, useState } from 'react';
import StudentCard from '@/pages/AdminPage/components/StudentsManager/StudentCard';
import { useStudentsAdmin } from '@/lib/supabase/hooks/useStudentsAdmin';

interface StudentsManagerProps {
    currentUser?: {
        id: string;
        role: string;
        first_name?: string;
        last_name?: string;
    } | null;
}

/**
 * Компонент для вкладки "Ученики"
 * Отображает список учеников с пагинацией и сортировкой
 */
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

    // Фильтрованные ученики для кураторов
    const [filteredStudents, setFilteredStudents] = useState(students);

    useEffect(() => {
        loadStudents({
            page: 1,
            perPage: pagination.perPage,
            sortBy: currentSort.field,
            sortOrder: currentSort.order
        });
    }, [currentSort]);

    // Применяем фильтрацию для кураторов и по роли
    useEffect(() => {
        let filtered = students;

        // Фильтрация для кураторов - показываем только их учеников
        if (currentUser?.role === 'curator') {
            const curatorFullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
            filtered = filtered.filter(student =>
                student.curator_name === curatorFullName ||
                student.curator_name === currentUser.first_name
            );
        }

        // Фильтрация по роли
        if (roleFilter !== 'all') {
            filtered = filtered.filter(student => student.role === roleFilter);
        }

        setFilteredStudents(filtered);
    }, [students, currentUser, roleFilter]);

    if (selectedStudentId) {
        return <StudentCard studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} currentUser={currentUser} />;
    }

    const handleSort = (field: 'points' | 'created_at' | 'last_login') => {
        const newOrder = currentSort.field === field && currentSort.order === 'DESC' ? 'ASC' : 'DESC';
        setCurrentSort({ field, order: newOrder });
    };

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

    // Возвращаем стрелки сортировки без эмодзи (простые ASCII символы)
    const getSortIcon = (field: 'points' | 'created_at' | 'last_login') => {
        if (currentSort.field !== field) return '';
        return currentSort.order === 'DESC' ? ' ↓' : ' ↑';
    };

    const handleOpenStudentCard = (studentId: string) => {
        setSelectedStudentId(studentId);
    };

    const getRoleLabel = (role: 'user' | 'curator' | 'admin' | 'guest') => {
        const labels = {
            user: 'Ученик',
            curator: 'Куратор',
            admin: 'Админ',
            guest: 'Гость'
        };
        return labels[role];
    };

    const getRoleColor = (role: 'user' | 'curator' | 'admin' | 'guest') => {
        const colors = {
            user: '#4CAF50',
            curator: '#2196F3',
            admin: '#FF5722',
            guest: '#9E9E9E'
        };
        return colors[role];
    };

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>{currentUser?.role === 'curator' ? 'Мои ученики' : 'Ученики'}</h2>
            </div>

            {loading && <div className="admin-loading">Загрузка...</div>}
            {error && <div className="admin-error">Ошибка: {error.message}</div>}

            {!loading && !error && (
                <>
                    <div className="admin-filters" style={{ marginBottom: '20px' }}>
                        <label htmlFor="roleFilter">Фильтр по роли:</label>
                        <select
                            id="roleFilter"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            style={{ marginLeft: '10px', padding: '5px 10px' }}
                        >
                            <option value="all">Все</option>
                            <option value="guest">Гости</option>
                            <option value="user">Ученики</option>
                            <option value="curator">Кураторы</option>
                            <option value="admin">Админы</option>
                        </select>
                    </div>
                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ФИО</th>
                                    <th>Роль</th>
                                    <th>Telegram-ID / Web-login</th>
                                    <th>Курс</th>
                                    <th
                                        className="sortable-header"
                                        onClick={() => handleSort('created_at')}
                                        title="Сортировать по дате регистрации"
                                    >
                                        Дата регистрации {getSortIcon('created_at')}
                                    </th>
                                    <th
                                        className="sortable-header"
                                        onClick={() => handleSort('last_login')}
                                        title="Сортировать по последнему входу"
                                    >
                                        Последний вход {getSortIcon('last_login')}
                                    </th>
                                    <th
                                        className="sortable-header"
                                        onClick={() => handleSort('points')}
                                        title="Сортировать по баллам"
                                    >
                                        Баллы {getSortIcon('points')}
                                    </th>
                                    <th>% уроков</th>
                                    <th>Куратор</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.user_id}>
                                        <td>{student.full_name}</td>
                                        <td>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: getRoleColor(student.role),
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {getRoleLabel(student.role)}
                                            </span>
                                        </td>
                                        <td>
                                            {student.web_login ? (
                                                <span title="Web-login">{student.web_login}</span>
                                            ) : (
                                                <span title="Telegram ID">{student.telegram_id}</span>
                                            )}
                                        </td>
                                        <td>{student.course_title || '—'}</td>
                                        <td>{formatDate(student.created_at)}</td>
                                        <td>{formatLastLogin(student.last_login, student.web_last_login)}</td>
                                        <td>{student.total_points}</td>
                                        <td>{student.completed_lessons_percent}%</td>
                                        <td>{student.curator_name || '—'}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleOpenStudentCard(student.user_id)}
                                                title="Открыть карточку ученика"
                                            >
                                                Карточка
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {currentUser?.role === 'curator' && filteredStudents.length === 0 && !loading && (
                        <div className="empty-table">
                            У вас пока нет назначенных учеников
                        </div>
                    )}
                    <div className="form-actions">
                        <button
                            className="admin-button"
                            onClick={handlePrev}
                            disabled={pagination.currentPage === 1}
                        >
                            Назад
                        </button>
                        <span style={{ alignSelf: 'center' }}>
                            Страница {pagination.currentPage}
                        </span>
                        <button
                            className="admin-button"
                            onClick={handleNext}
                            disabled={!pagination.hasMore}
                        >
                            Вперед
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default StudentsManager; 