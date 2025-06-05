import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useCuratorDetails } from '@/lib/supabase/hooks/useCuratorDetails';
import { useCuratorActions, AvailableStudent } from '@/lib/supabase/hooks/useCuratorActions';

interface CuratorCardProps {
    curatorId: string;
    onBack: () => void;
    onOpenStudentCard?: (studentId: string) => void;
}

const CuratorCard: React.FC<CuratorCardProps> = ({ curatorId, onBack, onOpenStudentCard }) => {
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<AvailableStudent[]>([]);

    // Хуки для работы с данными
    const { curatorDetails, loading: detailsLoading, error: detailsError, loadCuratorDetails } = useCuratorDetails();
    const {
        loading: actionsLoading,
        error: actionsError,
        assignStudent,
        unassignStudent,
        getAvailableStudents
    } = useCuratorActions();

    // Загружаем данные куратора при монтировании
    useEffect(() => {
        if (curatorId) {
            loadCuratorDetails(curatorId);
        }
    }, [curatorId]);

    // Настройка Fuse.js для поиска студентов
    const fuseOptions = {
        keys: ['full_name', 'telegram_id', 'course_title'],
        threshold: 0.3, // Более мягкий поиск
        includeScore: true,
    };

    // Фильтруем студентов при изменении поискового запроса
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStudents(availableStudents);
        } else {
            const fuse = new Fuse(availableStudents, fuseOptions);
            const results = fuse.search(searchQuery);
            setFilteredStudents(results.map(result => result.item));
        }
    }, [searchQuery, availableStudents]);

    // Открыть модальное окно назначения ученика
    const handleOpenAssignModal = async () => {
        try {
            const students = await getAvailableStudents(curatorId);
            setAvailableStudents(students);
            setFilteredStudents(students);
            setSearchQuery('');
            setIsAssignModalOpen(true);
        } catch (error) {
            console.error('Ошибка при загрузке доступных студентов:', error);
        }
    };

    // Назначить ученика
    const handleAssignStudent = async (studentId: string) => {
        try {
            await assignStudent(curatorId, studentId);
            // Перезагружаем данные куратора
            loadCuratorDetails(curatorId);
            // После назначения не закрываем модалку, обновляем список доступных учеников
            const studentsList = await getAvailableStudents(curatorId);
            setAvailableStudents(studentsList);
            if (!searchQuery.trim()) {
                setFilteredStudents(studentsList);
            } else {
                const fuse = new Fuse(studentsList, fuseOptions);
                const results = fuse.search(searchQuery);
                setFilteredStudents(results.map(result => result.item));
            }
        } catch (error) {
            console.error('Ошибка при назначении ученика:', error);
        }
    };

    // Отвязать ученика
    const handleUnassignStudent = async (studentId: string) => {
        if (confirm('Вы уверены, что хотите отвязать этого ученика от куратора?')) {
            try {
                await unassignStudent(curatorId, studentId);
                // Перезагружаем данные куратора
                loadCuratorDetails(curatorId);
            } catch (error) {
                console.error('Ошибка при отвязке ученика:', error);
            }
        }
    };

    if (detailsLoading) {
        return (
            <div className="admin-section">
                <div className="admin-loading">
                    <p>Загрузка данных куратора...</p>
                </div>
            </div>
        );
    }

    if (detailsError || !curatorDetails) {
        return (
            <div className="admin-section">
                <div className="admin-alert error">
                    <p>Ошибка загрузки куратора: {detailsError?.message || 'Куратор не найден'}</p>
                    <button className="admin-button" onClick={onBack}>← Назад</button>
                </div>
            </div>
        );
    }

    const { basicInfo, students } = curatorDetails;

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Карточка куратора</h2>
                <button className="admin-button" onClick={onBack}>← Назад</button>
            </div>

            {actionsError && (
                <div className="admin-alert error">
                    <p>Ошибка: {actionsError.message}</p>
                </div>
            )}

            <div className="admin-card">
                <h3>Основная информация</h3>
                <p><strong>ФИО:</strong> {basicInfo.full_name}</p>
                <p><strong>Telegram-ID / Web-login:</strong> {basicInfo.web_login || basicInfo.telegram_id}</p>
                <p><strong>Дата регистрации:</strong> {new Date(basicInfo.created_at).toLocaleDateString()}</p>
                <p><strong>Последний вход:</strong> {
                    basicInfo.last_login || basicInfo.web_last_login
                        ? new Date(basicInfo.last_login || basicInfo.web_last_login!).toLocaleDateString()
                        : '—'
                }</p>
                <p><strong>Кол-во учеников:</strong> {basicInfo.assigned_students_count}</p>
            </div>

            <div className="admin-card">
                <div className="section-header" style={{ justifyContent: 'space-between' }}>
                    <h3>Мои ученики ({students.length})</h3>
                    <button
                        className="admin-button"
                        onClick={handleOpenAssignModal}
                        disabled={actionsLoading}
                    >
                        {actionsLoading ? 'Загрузка...' : 'Назначить ученика'}
                    </button>
                </div>

                {students.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '24px' }}>
                        У куратора пока нет назначенных учеников
                    </p>
                ) : (
                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ФИО ученика</th>
                                    <th>Telegram ID</th>
                                    <th>Курс</th>
                                    <th>% завершения</th>
                                    <th>Баллы</th>
                                    <th>Действие</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.user_id}>
                                        <td>{student.full_name}</td>
                                        <td>{student.telegram_id || '—'}</td>
                                        <td>{student.course_title}</td>
                                        <td>{student.completed_lessons_percent}%</td>
                                        <td>{student.total_points}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => {
                                                    if (onOpenStudentCard) {
                                                        onOpenStudentCard(student.user_id);
                                                    } else {
                                                        console.log('Открыть профиль ученика:', student.user_id);
                                                    }
                                                }}
                                            >
                                                Открыть профиль
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleUnassignStudent(student.user_id)}
                                                disabled={actionsLoading}
                                            >
                                                Отвязать
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Модальное окно назначения ученика */}
            {isAssignModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsAssignModalOpen(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={() => setIsAssignModalOpen(false)}>×</button>
                        <h3>Назначить ученика</h3>

                        <div className="form-group">
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Поиск по ФИО, Telegram ID или курсу..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="admin-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ФИО</th>
                                        <th>Telegram ID</th>
                                        <th>Курс</th>
                                        <th>Действие</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>
                                                {searchQuery.trim()
                                                    ? 'Ученики не найдены по запросу'
                                                    : 'Нет доступных учеников для назначения'
                                                }
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <tr key={student.id}>
                                                <td>{student.full_name}</td>
                                                <td>{student.telegram_id || '—'}</td>
                                                <td>{student.course_title}</td>
                                                <td className="actions-cell">
                                                    <button
                                                        className="admin-button"
                                                        onClick={() => handleAssignStudent(student.id)}
                                                        disabled={actionsLoading}
                                                    >
                                                        {actionsLoading ? 'Назначение...' : 'Назначить'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CuratorCard; 