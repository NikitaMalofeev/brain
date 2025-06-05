import React, { useState } from 'react';
import { useBroadcastsAdmin } from '@/lib/supabase/hooks';
import type { Broadcast, CreateBroadcastData, BroadcastStatus } from '@/types';
import { utcToMoscowLocal, moscowLocalToUtc, formatDateTimeMoscow } from '@/helpers/dateMoscow';

// Интерфейс для модального окна
interface BroadcastModalData {
    id?: string;
    name: string;
    description: string;
    broadcast_url: string;
    start_time: string;
    status: BroadcastStatus;
    recording_url: string;
}

const BroadcastsManager: React.FC = () => {
    const { broadcasts, loading, error, loadBroadcasts, createBroadcast, updateBroadcast, deleteBroadcast, reorderBroadcasts } = useBroadcastsAdmin();
    const [updateLoading, setUpdateLoading] = useState<boolean>(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    // Модальное окно
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<BroadcastModalData>({
        name: '',
        description: '',
        broadcast_url: '',
        start_time: '',
        status: 'planned',
        recording_url: '',
    });
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    const handleDragStart = (id: string) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            return;
        }
        const draggedIndex = broadcasts.findIndex(b => b.id === draggedId);
        const targetIndex = broadcasts.findIndex(b => b.id === targetId);
        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedId(null);
            return;
        }

        // Создаем новый порядок
        const reorderedBroadcasts = [...broadcasts];
        const [moved] = reorderedBroadcasts.splice(draggedIndex, 1);
        reorderedBroadcasts.splice(targetIndex, 0, moved);

        // Отправляем новый порядок на сервер
        const newOrder = reorderedBroadcasts.map(b => b.id);
        reorderBroadcasts(newOrder).catch(err => {
            console.error('Ошибка при изменении порядка:', err);
            setUpdateError('Ошибка при изменении порядка эфиров');
        });

        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
    };

    // Открыть модал для добавления
    const openAddModal = () => {
        setModalData({
            name: '',
            description: '',
            broadcast_url: '',
            start_time: '',
            status: 'planned',
            recording_url: '',
        });
        setModalMode('add');
        setUpdateError(null);
        setIsModalOpen(true);
    };

    // Открыть модал для редактирования
    const openEditModal = (broadcast: Broadcast) => {
        setModalData({
            id: broadcast.id,
            name: broadcast.name,
            description: broadcast.description || '',
            broadcast_url: broadcast.broadcast_url || '',
            start_time: utcToMoscowLocal(broadcast.start_time),
            status: broadcast.status,
            recording_url: broadcast.recording_url || '',
        });
        setModalMode('edit');
        setUpdateError(null);
        setIsModalOpen(true);
    };

    // Закрыть модал
    const closeModal = () => {
        setIsModalOpen(false);
        setUpdateError(null);
    };

    // Сохранить эфир
    const saveBroadcast = async () => {
        if (!modalData.name.trim()) {
            alert('Введите название эфира');
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);

            const broadcastData: CreateBroadcastData = {
                name: modalData.name.trim(),
                description: modalData.description.trim() || undefined,
                broadcast_url: modalData.broadcast_url.trim() || undefined,
                start_time: moscowLocalToUtc(modalData.start_time),
                status: modalData.status,
                recording_url: modalData.recording_url.trim() || undefined,
            };

            if (modalMode === 'add') {
                await createBroadcast(broadcastData);
            } else {
                await updateBroadcast({
                    id: modalData.id!,
                    ...broadcastData,
                });
            }

            closeModal();
        } catch (error: any) {
            console.error('Ошибка при сохранении эфира:', error);
            setUpdateError(error.message || 'Произошла ошибка при сохранении эфира');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Удаление эфира
    const handleDeleteBroadcast = async (id: string, name: string) => {
        if (!confirm(`Вы уверены, что хотите удалить эфир "${name}"?`)) {
            return;
        }

        try {
            setUpdateLoading(true);
            setUpdateError(null);

            await deleteBroadcast(id);
        } catch (error: any) {
            console.error('Ошибка при удалении эфира:', error);
            setUpdateError(error.message || 'Произошла ошибка при удалении эфира');
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Эфиры</h2>
                <div className="section-header-actions">
                    <button
                        className="admin-refresh-btn"
                        onClick={loadBroadcasts}
                        disabled={loading}
                    >
                        🔄
                    </button>
                    <button
                        className="admin-button"
                        onClick={openAddModal}
                        disabled={loading}
                    >
                        + Добавить эфир
                    </button>
                </div>
            </div>

            {updateError && (
                <div className="admin-error admin-update-error">
                    {updateError}
                </div>
            )}

            {loading ? (
                <div className="admin-loading">Загрузка эфиров...</div>
            ) : error ? (
                <div className="admin-error">Ошибка: {error.message}</div>
            ) : broadcasts.length === 0 ? (
                <div className="empty-table">Эфиры не найдены</div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th></th>
                                <th>Название</th>
                                <th>Описание</th>
                                <th>Ссылка</th>
                                <th>Дата начала (МСК)</th>
                                <th>Статус</th>
                                <th>Запись</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {broadcasts.map((b) => (
                                <tr
                                    key={b.id}
                                    className={`draggable-row ${draggedId === b.id ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(b.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, b.id)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <td className="drag-handle">⋮⋮</td>
                                    <td>{b.name}</td>
                                    <td>{b.description || '-'}</td>
                                    <td>
                                        {b.broadcast_url ?
                                            <a href={b.broadcast_url} target="_blank" rel="noopener noreferrer">🔗</a>
                                            : '-'
                                        }
                                    </td>
                                    <td>{formatDateTimeMoscow(b.start_time)}</td>
                                    <td>{b.status}</td>
                                    <td>
                                        {b.recording_url ?
                                            <a href={b.recording_url} target="_blank" rel="noopener noreferrer">🔗</a>
                                            : '-'
                                        }
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            className="action-btn edit-btn"
                                            title="Редактировать эфир"
                                            aria-label="Редактировать эфир"
                                            onClick={() => openEditModal(b)}
                                            disabled={updateLoading}
                                        />
                                        <button
                                            className="action-btn delete-btn"
                                            title="Удалить эфир"
                                            aria-label="Удалить эфир"
                                            onClick={() => handleDeleteBroadcast(b.id, b.name)}
                                            disabled={updateLoading}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Модальное окно редактирования эфира */}
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={closeModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeModal}>×</button>

                        <h3>{modalMode === 'add' ? 'Добавить эфир' : 'Редактировать эфир'}</h3>

                        <div className="form-group">
                            <label>Название эфира:</label>
                            <input
                                className="admin-input"
                                value={modalData.name}
                                onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                                placeholder="Введите название эфира..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Описание (опционально):</label>
                            <textarea
                                className="admin-input"
                                value={modalData.description}
                                onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                                rows={3}
                                placeholder="Введите описание эфира..."
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Ссылка на эфир:</label>
                                <input
                                    className="admin-input"
                                    type="url"
                                    value={modalData.broadcast_url}
                                    onChange={(e) => setModalData({ ...modalData, broadcast_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Статус:</label>
                                <select
                                    className="admin-input"
                                    value={modalData.status}
                                    onChange={(e) => setModalData({ ...modalData, status: e.target.value as BroadcastStatus })}
                                >
                                    <option value="planned">Запланирован</option>
                                    <option value="live">В эфире</option>
                                    <option value="completed">Завершен</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Дата и время начала:</label>
                                <input
                                    className="admin-input"
                                    type="datetime-local"
                                    value={modalData.start_time}
                                    onChange={(e) => setModalData({ ...modalData, start_time: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Ссылка на запись (опционально):</label>
                                <input
                                    className="admin-input"
                                    type="url"
                                    value={modalData.recording_url}
                                    onChange={(e) => setModalData({ ...modalData, recording_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {updateError && (
                            <div className="admin-error" style={{ marginBottom: '16px' }}>
                                {updateError}
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={saveBroadcast}
                                disabled={updateLoading || !modalData.name.trim()}
                            >
                                {updateLoading ? 'Сохранение...' : (modalMode === 'add' ? 'Добавить' : 'Сохранить')}
                            </button>
                            <button
                                className="admin-button"
                                onClick={closeModal}
                                disabled={updateLoading}
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

export default BroadcastsManager; 