import React, { useState, useEffect } from 'react';
import { useCuratorsAdmin, type CreateCuratorData } from '@/lib/supabase/hooks/useCuratorsAdmin';
import CuratorCard from './CuratorCard';
import StudentCard from '../StudentsManager/StudentCard';
import AssignStudentModal from './AssignStudentModal';

const CuratorsManager: React.FC = () => {
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [selectedCuratorId, setSelectedCuratorId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const { curators, loading, error, loadCurators, createCurator } = useCuratorsAdmin();
    const [assignModalCuratorId, setAssignModalCuratorId] = useState<string | null>(null);

    // Состояние формы создания куратора
    const [formData, setFormData] = useState<CreateCuratorData>({
        first_name: '',
        last_name: '',
        web_login: '',
        web_password: ''
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleCuratorBack = () => {
        setSelectedCuratorId(null);
        loadCurators();
    };

    // Обработчики формы создания куратора
    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setFormError(null); // Сбрасываем ошибку при изменении полей
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            web_login: '',
            web_password: ''
        });
        setFormError(null);
        setIsCreating(false);
    };

    const handleCreateCurator = async () => {
        // Валидация на клиенте
        if (!formData.web_login.trim()) {
            setFormError('Логин обязателен для заполнения');
            return;
        }

        if (!formData.web_password.trim()) {
            setFormError('Пароль обязателен для заполнения');
            return;
        }

        setIsCreating(true);
        setFormError(null);

        try {
            const result = await createCurator(formData);

            if (result.success) {
                // Успешно создан - закрываем модал и обновляем список
                setIsAddModalVisible(false);
                resetForm();
                await loadCurators(); // Перезагружаем список кураторов
            } else {
                // Показываем ошибку
                setFormError(result.error || 'Неизвестная ошибка при создании куратора');
            }
        } catch (err) {
            console.error('Ошибка при создании куратора:', err);
            setFormError('Произошла ошибка при создании куратора');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCloseModal = () => {
        setIsAddModalVisible(false);
        resetForm();
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
                <button
                    className="admin-button admin-add-btn"
                    onClick={() => setIsAddModalVisible(true)}
                    style={{ marginLeft: 'auto' }}
                >
                    Добавить куратора
                </button>
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
            {isAddModalVisible && (
                <div className="admin-modal-backdrop" onClick={handleCloseModal}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={handleCloseModal}>×</button>
                        <h3>Добавить куратора</h3>

                        {formError && (
                            <div className="admin-alert error" style={{ marginBottom: '16px' }}>
                                {formError}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Имя (опционально)</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Имя"
                                value={formData.first_name}
                                onChange={(e) => handleInputChange('first_name', e.target.value)}
                                disabled={isCreating}
                            />
                        </div>
                        <div className="form-group">
                            <label>Фамилия (опционально)</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Фамилия"
                                value={formData.last_name}
                                onChange={(e) => handleInputChange('last_name', e.target.value)}
                                disabled={isCreating}
                            />
                        </div>
                        <div className="form-group">
                            <label>Логин (web_login) *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Логин для входа (только буквы, цифры, _, -)"
                                value={formData.web_login}
                                onChange={(e) => handleInputChange('web_login', e.target.value)}
                                disabled={isCreating}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Пароль *</label>
                            <input
                                className="admin-input"
                                type="password"
                                placeholder="Минимум 8 символов"
                                value={formData.web_password}
                                onChange={(e) => handleInputChange('web_password', e.target.value)}
                                disabled={isCreating}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={handleCreateCurator}
                                disabled={isCreating}
                            >
                                {isCreating ? 'Создание...' : 'Создать'}
                            </button>
                            <button
                                className="admin-button"
                                style={{ marginLeft: '8px' }}
                                onClick={handleCloseModal}
                                disabled={isCreating}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CuratorsManager; 