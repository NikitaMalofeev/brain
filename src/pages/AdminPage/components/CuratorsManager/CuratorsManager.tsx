import React, { useState, useEffect } from 'react';
import { useCuratorsAdmin } from '@/lib/supabase/hooks/useCuratorsAdmin';
import CuratorCard from './CuratorCard';
import StudentCard from '../StudentsManager/StudentCard';
import AssignStudentModal from './AssignStudentModal';

const CuratorsManager: React.FC = () => {
    const [selectedCuratorId, setSelectedCuratorId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const { curators, loading, error, loadCurators } = useCuratorsAdmin();
    const [assignModalCuratorId, setAssignModalCuratorId] = useState<string | null>(null);

    const handleCuratorBack = () => {
        setSelectedCuratorId(null);
        loadCurators();
    };

    // Загружаем данные при монтировании компонента
    useEffect(() => {
        loadCurators();
    }, []);

    if (selectedStudentId) {
        return <StudentCard studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
    }

    if (selectedCuratorId) {
        return <CuratorCard
            curatorId={selectedCuratorId}
            onBack={handleCuratorBack}
            onOpenStudentCard={setSelectedStudentId}
        />;
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Кураторы</h2>
            </div>

            {error && (
                <div className="admin-alert error">
                    <p>Ошибка загрузки кураторов: {error.message}</p>
                    <button className="admin-button" onClick={() => loadCurators()}>
                        Повторить
                    </button>
                </div>
            )}

            {loading ? (
                <div className="admin-loading">
                    <p>Загрузка кураторов...</p>
                </div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Telegram ID</th>
                                <th>Кол-во учеников</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {curators.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>
                                        <p>Кураторы не найдены</p>
                                    </td>
                                </tr>
                            ) : (
                                curators.map((curator) => (
                                    <tr key={curator.user_id}>
                                        <td>{curator.full_name}</td>
                                        <td>
                                            {curator.web_login ? (
                                                <span title="Web-login">{curator.web_login}</span>
                                            ) : (
                                                <span title="Telegram ID">{curator.telegram_id}</span>
                                            )}
                                        </td>
                                        <td>{curator.assigned_students_count}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                title="Открыть карточку куратора"
                                                onClick={() => setSelectedCuratorId(curator.user_id)}
                                            >
                                                Открыть
                                            </button>
                                            <button
                                                className="action-btn assign-btn"
                                                style={{ marginLeft: 8 }}
                                                title="Назначить ученика"
                                                onClick={() => setAssignModalCuratorId(curator.user_id)}
                                            >
                                                Назначить ученика
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <AssignStudentModal
                visible={!!assignModalCuratorId}
                curatorId={assignModalCuratorId || ''}
                onClose={() => setAssignModalCuratorId(null)}
                onAssigned={loadCurators}
            />
        </div>
    );
};

export default CuratorsManager; 