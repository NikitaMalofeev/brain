import React, { useState, useMemo } from 'react';
import { useTariffsAdmin, type Tariff, type TariffFormData } from '@/lib/supabase/hooks/useTariffsAdmin';

const TariffsManager: React.FC = () => {
    const {
        tariffs,
        loading,
        error,
        refetch,
        createTariff,
        createTariffLoading,
        createTariffError,
        updateTariff,
        updateTariffLoading,
        updateTariffError,
        deleteTariff,
        deleteTariffLoading,
        deleteTariffError,
        isMutating
    } = useTariffsAdmin();

    // Состояния для модального окна
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentTariff, setCurrentTariff] = useState<Tariff | null>(null);

    // Состояния для формы
    const [formData, setFormData] = useState<TariffFormData>({
        name: '',
        code: '',
        description: '',
    });

    // Состояния для сортировки
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Сортированные тарифы
    const sortedTariffs = useMemo(() => {
        if (!tariffs || tariffs.length === 0) return [];

        return [...tariffs].sort((a, b) => {
            const comparison = a.code.localeCompare(b.code);
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [tariffs, sortDirection]);

    // Переключение направления сортировки
    const toggleSort = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    // Открыть модал для создания
    const openCreateModal = () => {
        setFormData({ name: '', code: '', description: '' });
        setModalMode('add');
        setCurrentTariff(null);
        setIsModalOpen(true);
    };

    // Открыть модал для редактирования
    const openEditModal = (tariff: Tariff) => {
        setFormData({
            name: tariff.name,
            code: tariff.code,
            description: tariff.description || '',
        });
        setModalMode('edit');
        setCurrentTariff(tariff);
        setIsModalOpen(true);
    };

    // Закрыть модал
    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTariff(null);
        setFormData({ name: '', code: '', description: '' });
    };

    // Сохранить тариф
    const handleSave = async () => {
        if (!formData.name.trim() || !formData.code.trim()) {
            return;
        }

        try {
            if (modalMode === 'add') {
                await createTariff(formData);
            } else if (currentTariff) {
                await updateTariff(currentTariff.id, formData);
            }
            closeModal();
        } catch (err) {
            console.error('Ошибка при сохранении тарифа:', err);
        }
    };

    // Удалить тариф
    const handleDelete = async (tariff: Tariff) => {
        if (!confirm(`Вы уверены, что хотите удалить тариф "${tariff.name}"?`)) {
            return;
        }

        try {
            await deleteTariff(tariff.id);
        } catch (err) {
            console.error('Ошибка при удалении тарифа:', err);
        }
    };

    // Вычисляем общие состояния ошибок
    const mutationError = createTariffError || updateTariffError || deleteTariffError;
    const isSaving = modalMode === 'add' ? createTariffLoading : updateTariffLoading;

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Тарифы</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="admin-refresh-btn"
                        onClick={() => refetch()}
                        disabled={loading}
                        title="Обновить список тарифов"
                    >
                        Обновить
                    </button>
                    <button
                        className="admin-add-btn"
                        onClick={openCreateModal}
                        disabled={loading || isMutating}
                        title="Создать новый тариф"
                    >
                        Создать тариф
                    </button>
                </div>
            </div>

            {/* Отображение ошибок */}
            {(error || mutationError) && (
                <div className="admin-error admin-update-error">
                    {error?.message || mutationError?.message}
                </div>
            )}

            {/* Основной контент */}
            {loading ? (
                <div className="admin-loading">Загрузка тарифов...</div>
            ) : sortedTariffs.length === 0 ? (
                <div className="empty-table">
                    Тарифы не найдены. Создайте первый тариф.
                </div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th
                                    className="sortable-header"
                                    onClick={toggleSort}
                                    title="Кликните для сортировки"
                                    style={{ cursor: 'pointer' }}
                                >
                                    Код {sortDirection === 'asc' ? '↑' : '↓'}
                                </th>
                                <th>Описание</th>
                                <th>Создан</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTariffs.map((tariff) => (
                                <tr key={tariff.id}>
                                    <td>{tariff.name}</td>
                                    <td>
                                        <span className="admin-code">{tariff.code}</span>
                                    </td>
                                    <td>{tariff.description || '-'}</td>
                                    <td>{new Date(tariff.created_at).toLocaleDateString()}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => openEditModal(tariff)}
                                            disabled={isMutating}
                                            title="Редактировать тариф"
                                        >
                                            Изменить
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => handleDelete(tariff)}
                                            disabled={isMutating}
                                            title="Удалить тариф"
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

            {/* Модальное окно для создания/редактирования */}
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={closeModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeModal}>×</button>

                        <h3>{modalMode === 'add' ? 'Создать тариф' : 'Редактировать тариф'}</h3>

                        {mutationError && modalMode === (createTariffError ? 'add' : 'edit') && (
                            <div className="admin-error" style={{ marginBottom: '16px' }}>
                                {mutationError.message}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Название тарифа *:</label>
                            <input
                                className="admin-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Название тарифа..."
                                disabled={isSaving}
                            />
                        </div>

                        <div className="form-group">
                            <label>Код тарифа *:</label>
                            <input
                                className="admin-input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="T1, T2, T3..."
                                disabled={isSaving}
                                maxLength={10}
                            />
                            <small style={{ color: 'var(--admin-text-secondary)', marginTop: '4px', display: 'block' }}>
                                Краткий код для идентификации тарифа (например: T1, T2, T3)
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Описание:</label>
                            <textarea
                                className="admin-input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Описание тарифа..."
                                rows={4}
                                disabled={isSaving}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={handleSave}
                                disabled={isSaving || !formData.name.trim() || !formData.code.trim()}
                            >
                                {isSaving ? 'Сохранение...' : (modalMode === 'add' ? 'Создать' : 'Сохранить')}
                            </button>
                            <button
                                className="admin-button"
                                onClick={closeModal}
                                disabled={isSaving}
                                style={{ background: 'var(--admin-danger)' }}
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

export default TariffsManager; 