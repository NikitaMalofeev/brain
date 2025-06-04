import React, { useEffect, useState } from 'react';
import StudentCard from './StudentCard';
import { useStudentsAdmin } from '@/lib/supabase/hooks/useStudentsAdmin';

/**
 * Компонент для вкладки "Ученики"
 * Отображает список учеников с пагинацией и сортировкой
 */
const StudentsManager: React.FC = () => {
    const { students, loading, error, pagination, loadStudents } = useStudentsAdmin();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [currentSort, setCurrentSort] = useState<{
        field: 'points' | 'created_at' | 'last_login';
        order: 'ASC' | 'DESC';
    }>({
        field: 'created_at',
        order: 'DESC'
    });

    useEffect(() => {
        loadStudents({
            page: 1,
            perPage: pagination.perPage,
            sortBy: currentSort.field,
            sortOrder: currentSort.order
        });
    }, [currentSort]);

    if (selectedStudentId) {
        return <StudentCard studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
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

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Ученики</h2>
            </div>

            {loading && <div className="admin-loading">Загрузка...</div>}
            {error && <div className="admin-error">Ошибка: {error.message}</div>}

            {!loading && !error && (
                <>
                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ФИО</th>
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
                                {students.map((student) => (
                                    <tr key={student.user_id}>
                                        <td>{student.full_name}</td>
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