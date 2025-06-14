import React, { useState, useRef } from 'react';
import { useCuratorsAdmin, type CreateCuratorData, type UpdateCuratorData, type Curator } from '@/lib/supabase/hooks/useCuratorsAdmin';
import { buildImageUrl } from '@/lib/cloudflareR2Service';
import CuratorCard from './CuratorCard';
import StudentCard from '../StudentsManager/StudentCard';
import AssignStudentModal from './AssignStudentModal';
import CuratorAvatarModal from './CuratorAvatarModal';

const CuratorsManager: React.FC = () => {
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [selectedCuratorId, setSelectedCuratorId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [assignModalCuratorId, setAssignModalCuratorId] = useState<string | null>(null);

    // Состояние для модального окна аватара
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [selectedCuratorForAvatar, setSelectedCuratorForAvatar] = useState<Curator | null>(null);

    // Используем новый хук с React Query
    const {
        curators,
        loading,
        error,
        refetchCurators,
        createCurator,
        isCreating,
        updateCurator,
        isUpdating,
        deleteCurator,
        isDeleting,
        updateCuratorAvatar,
        isUpdatingAvatar,
        deleteCuratorAvatar,
        isDeletingAvatar
    } = useCuratorsAdmin();

    // Состояние формы создания куратора
    const [formData, setFormData] = useState<CreateCuratorData>({
        first_name: '',
        last_name: '',
        web_login: '',
        web_password: '',
        username: ''
    });
    const [formError, setFormError] = useState<string | null>(null);

    // Состояние для редактирования куратора
    const [editingCurator, setEditingCurator] = useState<Curator | null>(null);
    const [editData, setEditData] = useState<UpdateCuratorData>({
        first_name: '',
        last_name: '',
        web_login: '',
        username: ''
    });
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    const handleCuratorBack = () => {
        setSelectedCuratorId(null);
        refetchCurators();
    };

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setFormError(null);
    };

    const resetForm = () => {
        setFormData({ first_name: '', last_name: '', web_login: '', web_password: '', username: '' });
        setFormError(null);
    };

    const handleCreateCurator = async () => {
        if (!formData.first_name?.trim()) {
            setFormError('Имя обязательно для заполнения');
            return;
        }

        if (!formData.web_login.trim()) {
            setFormError('Логин обязателен для заполнения');
            return;
        }
        if (!formData.web_password.trim()) {
            setFormError('Пароль обязателен для заполнения');
            return;
        }
        if (!formData.username.trim()) {
            setFormError('Юзернейм Telegram обязателен для заполнения');
            return;
        }

        setFormError(null);

        try {
            await createCurator(formData);
            setIsAddModalVisible(false);
            resetForm();
        } catch (err: any) {
            console.error('Ошибка при создании куратора:', err);
            setFormError(err.message || 'Произошла ошибка при создании куратора');
        }
    };

    const handleCloseModal = () => {
        setIsAddModalVisible(false);
        resetForm();
    };

    const handleEditInputChange = (field: keyof UpdateCuratorData, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        setFormError(null);
    };

    const resetEditForm = () => {
        setEditData({ first_name: '', last_name: '', web_login: '', username: '' });
        setFormError(null);
    };

    const openEditModal = (curator: Curator) => {
        setEditingCurator(curator);
        setEditData({
            first_name: curator.first_name || '',
            last_name: curator.last_name || '',
            web_login: curator.web_login || '',
            username: curator.username || ''
        });
        setIsEditModalVisible(true);
        setFormError(null);
    };

    const handleCloseEditModal = () => {
        setIsEditModalVisible(false);
        setEditingCurator(null);
        resetEditForm();
    };

    const handleUpdateCurator = async () => {
        if (!editingCurator) return;

        // Добавляем такую же валидацию, как при создании
        if (!editData.first_name?.trim()) {
            setFormError('Имя обязательно для заполнения');
            return;
        }

        if (!editData.web_login?.trim()) {
            setFormError('Логин обязателен для заполнения');
            return;
        }

        if (!editData.username?.trim()) {
            setFormError('Юзернейм Telegram обязателен для заполнения');
            return;
        }

        setFormError(null);

        try {
            await updateCurator({ userId: editingCurator.user_id, data: editData });
            setIsEditModalVisible(false);
            setEditingCurator(null);
            resetEditForm();
        } catch (err: any) {
            console.error('Ошибка при обновлении куратора:', err);
            setFormError(err.message || 'Произошла ошибка при обновлении куратора');
        }
    };

    const handleDeleteCurator = async (curator: Curator) => {
        const curatorName = `${curator.first_name || ''} ${curator.last_name || ''}`.trim() || curator.web_login || 'Безымянный куратор';

        const confirmMessage = curator.assigned_students_count > 0
            ? `Вы уверены, что хотите удалить куратора "${curatorName}"?\n\nВ системе ${curator.assigned_students_count} студентов назначено данному куратору. Они будут автоматически отвязаны.`
            : `Вы уверены, что хотите удалить куратора "${curatorName}"?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const result = await deleteCurator(curator.user_id);

            // Показываем информацию о результате удаления
            if (result && result.unassigned_students > 0) {
                alert(`Куратор "${curatorName}" успешно удален.\nОтвязано студентов: ${result.unassigned_students}`);
            } else {
                alert(`Куратор "${curatorName}" успешно удален.`);
            }
        } catch (err: any) {
            console.error('Ошибка при удалении куратора:', err);
            alert(`Ошибка при удалении куратора: ${err.message || 'Произошла неожиданная ошибка'}`);
        }
    };

    // === АВАТАР КУРАТОРА ===
    const openAvatarModal = (curator: Curator) => {
        // Теперь photo_url уже есть в типе Curator
        setSelectedCuratorForAvatar(curator);
        setAvatarModalOpen(true);
    };

    const closeAvatarModal = () => {
        setAvatarModalOpen(false);
        setSelectedCuratorForAvatar(null);
    };

    const handleSaveAvatar = async (filePath: string) => {
        if (!selectedCuratorForAvatar) return;

        try {
            // Обновляем photo_url в базе данных через хук
            await updateCuratorAvatar({ userId: selectedCuratorForAvatar.user_id, photoUrl: filePath });
            console.log('Аватар успешно сохранен:', filePath);
        } catch (error: any) {
            console.error('Ошибка сохранения аватара:', error);
            throw error; // Пробрасываем ошибку в модальное окно
        }
    };

    const handleDeleteAvatar = async () => {
        if (!selectedCuratorForAvatar) return;

        try {
            // Удаляем photo_url из базы данных (устанавливаем NULL)
            await deleteCuratorAvatar(selectedCuratorForAvatar.user_id);
            console.log('Аватар успешно удален');
        } catch (error: any) {
            console.error('Ошибка удаления аватара:', error);
            throw error; // Пробрасываем ошибку в модальное окно
        }
    };

    // Функция для отображения аватара или плейсхолдера
    const renderCuratorAvatar = (curator: Curator) => {
        const photo_url = curator.photo_url;

        if (photo_url) {
            return (
                <img
                    src={buildImageUrl(photo_url)}
                    alt={`${curator.first_name || ''} ${curator.last_name || ''}`.trim()}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e0e0e0',
                        cursor: 'pointer'
                    }}
                    onClick={() => openAvatarModal(curator)}
                    onError={(e) => {
                        console.warn('Ошибка загрузки аватара куратора:', photo_url);
                        e.currentTarget.style.display = 'none';
                    }}
                />
            );
        }

        // Плейсхолдер с инициалами
        const initials = `${curator.first_name?.[0] || ''}${curator.last_name?.[0] || ''}`.toUpperCase() || curator.web_login?.[0]?.toUpperCase() || '?';
        return (
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: '1px solid #e0e0e0'
                }}
                onClick={() => openAvatarModal(curator)}
                title="Нажмите для загрузки аватара"
            >
                {initials}
            </div>
        );
    };

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
                    <button className="admin-button" onClick={() => refetchCurators()}>
                        Повторить
                    </button>
                </div>
            )}

            {loading ? (
                <div className="admin-loading">Загрузка списка кураторов...</div>
            ) : curators.length === 0 ? (
                <div className="empty-table">
                    <h3>Кураторы не найдены</h3>
                    <p>В системе пока нет кураторов. Добавьте первого куратора.</p>
                </div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Web Login</th>
                                <th>Telegram Username</th>
                                <th>Кол-во учеников</th>
                                <th>Аватар</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {curators.map((curator) => (
                                <tr key={curator.user_id}>
                                    <td>{`${curator.first_name || ''} ${curator.last_name || ''}`.trim()}</td>
                                    <td>{curator.web_login || <span style={{ color: '#999' }}>—</span>}</td>
                                    <td>
                                        {curator.username ? (
                                            <a
                                                href={`https://t.me/${curator.username.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ textDecoration: 'none', color: '#0088cc' }}
                                            >
                                                @{curator.username.replace('@', '')}
                                            </a>
                                        ) : (
                                            <span style={{ color: '#999' }}>—</span>
                                        )}
                                    </td>
                                    <td>{curator.assigned_students_count}</td>
                                    <td>{renderCuratorAvatar(curator)}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="action-btn edit-btn"
                                            title="Открыть карточку куратора"
                                            onClick={() => setSelectedCuratorId(curator.user_id)}
                                        >
                                            Открыть
                                        </button>
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => openEditModal(curator)}
                                            title="Редактировать куратора"
                                        >
                                            Изменить
                                        </button>
                                        <button
                                            className="action-btn assign-btn"
                                            title="Назначить ученика"
                                            onClick={() => setAssignModalCuratorId(curator.user_id)}
                                        >
                                            Назначить
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            title="Удалить куратора"
                                            onClick={() => handleDeleteCurator(curator)}
                                            disabled={isDeleting}
                                        >
                                            Удалить
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isAddModalVisible && (
                <div className="admin-modal-backdrop" onClick={handleCloseModal}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={handleCloseModal}>×</button>
                        <h3>Создать нового куратора</h3>

                        {formError && (
                            <div className="admin-alert error" style={{ marginBottom: '1rem' }}>
                                {formError}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Имя *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Имя куратора"
                                value={formData.first_name}
                                onChange={(e) => handleInputChange('first_name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Фамилия</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Фамилия куратора"
                                value={formData.last_name}
                                onChange={(e) => handleInputChange('last_name', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Логин для входа *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Только a-z, A-Z, 0-9, _, -"
                                value={formData.web_login}
                                onChange={(e) => handleInputChange('web_login', e.target.value)}
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
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Telegram Username (без @) *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="например, curator_ivan"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button className="admin-button" onClick={handleCreateCurator} disabled={isCreating}>
                                {isCreating ? 'Создание...' : 'Создать'}
                            </button>
                            <button className="admin-button secondary" onClick={handleCloseModal} disabled={isCreating}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalVisible && editingCurator && (
                <div className="admin-modal-backdrop" onClick={handleCloseEditModal}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={handleCloseEditModal}>×</button>
                        <h3>Редактировать куратора: {`${editingCurator.first_name || ''} ${editingCurator.last_name || ''}`.trim()}</h3>

                        {formError && (
                            <div className="admin-alert error" style={{ marginBottom: '1rem' }}>
                                {formError}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Имя *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Имя куратора"
                                value={editData.first_name}
                                onChange={(e) => handleEditInputChange('first_name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Фамилия</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Фамилия куратора"
                                value={editData.last_name}
                                onChange={(e) => handleEditInputChange('last_name', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Логин для входа *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Только a-z, A-Z, 0-9, _, -"
                                value={editData.web_login}
                                onChange={(e) => handleEditInputChange('web_login', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Telegram Username (без @) *</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="например, curator_ivan"
                                value={editData.username}
                                onChange={(e) => handleEditInputChange('username', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button className="admin-button" onClick={handleUpdateCurator} disabled={isUpdating}>
                                {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
                            </button>
                            <button className="admin-button secondary" onClick={handleCloseEditModal} disabled={isUpdating}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {assignModalCuratorId && (
                <AssignStudentModal
                    visible={!!assignModalCuratorId}
                    curatorId={assignModalCuratorId}
                    onClose={() => setAssignModalCuratorId(null)}
                    onAssigned={() => {
                        setAssignModalCuratorId(null);
                        refetchCurators();
                    }}
                />
            )}

            <CuratorAvatarModal
                isOpen={avatarModalOpen}
                curator={selectedCuratorForAvatar}
                onClose={closeAvatarModal}
                onSave={handleSaveAvatar}
                onDelete={handleDeleteAvatar}
            />
        </div>
    );
};

export default CuratorsManager; 