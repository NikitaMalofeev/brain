import React, { useState, useEffect } from 'react';
import { useChatsAdmin } from '@/lib/supabase/hooks/useChatsAdmin';
import { useChatAccess } from '@/lib/supabase/hooks/useChatAccess';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import ChatAvatarModal from './ChatAvatarModal';
import type { Chat, CreateChatData, UpdateChatData } from '@/types';

/**
 * Компонент для управления Telegram чатами в админ-панели
 * Полный CRUD функционал с drag & drop сортировкой, фильтрацией по потокам
 */
const ChatsManager: React.FC = () => {
    const {
        chats,
        loading,
        error,
        loadChats,
        createChat,
        updateChat,
        deleteChat,
        updateChatAvatar,
        deleteChatAvatar,
        streams,
        streamsLoading,
        tariffs,
        tariffsLoading
    } = useChatsAdmin();

    // Состояние для фильтрации по потокам
    const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>('all');

    // Состояние для модальных окон
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChat, setEditingChat] = useState<Chat | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Состояние для модального окна аватара
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [selectedChatForAvatar, setSelectedChatForAvatar] = useState<Chat | null>(null);

    // Хук для работы с доступами конкретного чата (поток + тарифы)
    const chatAccess = useChatAccess(editingChat?.id || null);

    // Локальное состояние для формы (поток + тарифы)
    const [selectedStreamId, setSelectedStreamId] = useState<string>('');
    const [selectedTariffIds, setSelectedTariffIds] = useState<string[]>([]);

    // Состояние для формы
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        link: '',
        order_num: 1
    });

    // Состояние для drag & drop
    const [draggedChatId, setDraggedChatId] = useState<string | null>(null);

    // Синхронизируем выбранный поток и тарифы с данными из хука
    useEffect(() => {
        if (editingChat && !chatAccess.loading) {
            // Устанавливаем поток только если он изменился
            if (chatAccess.streamId !== selectedStreamId) {
                setSelectedStreamId(chatAccess.streamId || '');
            }

            // Устанавливаем тарифы только если они изменились
            const currentTariffIds = chatAccess.tariffIds || [];
            const hasChanged = currentTariffIds.length !== selectedTariffIds.length ||
                !currentTariffIds.every(id => selectedTariffIds.includes(id));

            if (hasChanged) {
                setSelectedTariffIds(currentTariffIds);
            }
        }
    }, [editingChat?.id, chatAccess.streamId, chatAccess.tariffIds?.join(','), chatAccess.loading]);

    // Фильтрация чатов по выбранному потоку
    const filteredChats = selectedStreamFilter === 'all'
        ? chats
        : chats.filter(chat => chat.stream_id === selectedStreamFilter);

    // Обработчик изменения фильтра потоков
    const handleStreamFilterChange = (streamId: string) => {
        setSelectedStreamFilter(streamId);
    };

    // Обработчик изменения потока в форме
    const handleStreamChange = (streamId: string) => {
        setSelectedStreamId(streamId);
    };

    // Обработчик изменения чекбоксов тарифов
    const handleTariffCheckboxChange = (tariffId: string, checked: boolean) => {
        setSelectedTariffIds(prev => {
            if (checked) {
                return [...prev, tariffId];
            } else {
                return prev.filter(id => id !== tariffId);
            }
        });
    };

    // Обработчики модального окна
    const openCreateModal = () => {
        setEditingChat(null);
        setSelectedStreamId('');
        setSelectedTariffIds([]);
        setFormData({
            name: '',
            description: '',
            link: '',
            order_num: (chats.length + 1)
        });
        setIsModalOpen(true);
    };

    const openEditModal = (chat: Chat) => {
        setEditingChat(chat);
        setFormData({
            name: chat.name,
            description: chat.description || '',
            link: chat.link,
            order_num: chat.order_num
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingChat(null);
        setSelectedStreamId('');
        setSelectedTariffIds([]);
        setModalLoading(false);
    };

    // Валидация формы
    const validateForm = (): string | null => {
        if (!formData.name.trim()) {
            return 'Название чата обязательно';
        }
        if (!formData.link.trim()) {
            return 'Ссылка на чат обязательна';
        }
        if (!formData.link.includes('t.me/')) {
            return 'Ссылка должна содержать t.me/';
        }
        if (!selectedStreamId) {
            return 'Поток обязателен для выбора';
        }
        if (formData.order_num < 1) {
            return 'Порядковый номер должен быть больше 0';
        }
        return null;
    };

    // Сохранение чата
    const handleSaveChat = async () => {
        const validationError = validateForm();
        if (validationError) {
            alert(validationError);
            return;
        }

        try {
            setModalLoading(true);

            if (editingChat) {
                // Обновление существующего чата
                const updateData: UpdateChatData = {
                    id: editingChat.id,
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    link: formData.link.trim(),
                    order_num: formData.order_num,
                    stream_id: selectedStreamId
                };

                // Параллельно обновляем чат и доступы
                await Promise.all([
                    updateChat(updateData),
                    chatAccess.saveAccess({
                        streamId: selectedStreamId,
                        tariffIds: selectedTariffIds
                    })
                ]);
            } else {
                // Создание нового чата
                const createData: CreateChatData = {
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    link: formData.link.trim(),
                    order_num: formData.order_num,
                    stream_id: selectedStreamId
                };
                const createdChat = await createChat(createData);

                // Сохраняем доступы для нового чата (тарифы)
                if (selectedTariffIds.length > 0) {
                    const { saveChatTariffAccess } = await import('@/lib/supabase/hooks');
                    await saveChatTariffAccess(createdChat.id, selectedTariffIds);
                }
            }

            // Закрываем модальное окно после успешного сохранения
            closeModal();
        } catch (error: any) {
            console.error('Ошибка при сохранении чата:', error);

            // Более понятные сообщения об ошибках
            let errorMessage = 'Произошла ошибка при сохранении чата';
            if (error.message?.includes('duplicate')) {
                errorMessage = 'Чат с таким названием уже существует';
            } else if (error.message?.includes('stream_id')) {
                errorMessage = 'Ошибка при связывании с потоком. Проверьте выбранный поток.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);
        } finally {
            setModalLoading(false);
        }
    };

    // Удаление чата
    const handleDeleteChat = async (chat: Chat) => {
        if (!confirm(`Вы уверены, что хотите удалить чат "${chat.name}"?`)) {
            return;
        }

        try {
            await deleteChat(chat.id);
        } catch (error: any) {
            console.error('Ошибка при удалении чата:', error);
            alert(error.message || 'Произошла ошибка при удалении чата');
        }
    };

    // Inline редактирование order_num
    const handleOrderChange = async (chatId: string, newOrder: number) => {
        if (newOrder < 1) return;

        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        try {
            const updateData: UpdateChatData = {
                id: chatId,
                order_num: newOrder
            };
            await updateChat(updateData);
        } catch (error: any) {
            console.error('Ошибка при изменении порядка:', error);
            alert(error.message || 'Произошла ошибка при изменении порядка');
        }
    };

    // Drag & Drop обработчики
    const handleDragStart = (chatId: string) => {
        setDraggedChatId(chatId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetChatId: string) => {
        e.preventDefault();

        if (!draggedChatId || draggedChatId === targetChatId) {
            setDraggedChatId(null);
            return;
        }

        const draggedChat = chats.find(c => c.id === draggedChatId);
        const targetChat = chats.find(c => c.id === targetChatId);

        if (!draggedChat || !targetChat) {
            setDraggedChatId(null);
            return;
        }

        try {
            // Меняем порядковые номера местами
            await Promise.all([
                updateChat({
                    id: draggedChat.id,
                    order_num: targetChat.order_num
                }),
                updateChat({
                    id: targetChat.id,
                    order_num: draggedChat.order_num
                })
            ]);
        } catch (error: any) {
            console.error('Ошибка при изменении порядка:', error);
            alert(error.message || 'Произошла ошибка при изменении порядка');
        } finally {
            setDraggedChatId(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedChatId(null);
    };

    // === АВАТАР ЧАТА ===
    const openAvatarModal = (chat: Chat) => {
        setSelectedChatForAvatar(chat);
        setAvatarModalOpen(true);
    };

    const closeAvatarModal = () => {
        setAvatarModalOpen(false);
        setSelectedChatForAvatar(null);
    };

    const handleSaveAvatar = async (filePath: string) => {
        if (!selectedChatForAvatar) return;

        try {
            await updateChatAvatar(selectedChatForAvatar.id, filePath);
            console.log('Аватар чата успешно сохранен:', filePath);
        } catch (error: any) {
            console.error('Ошибка сохранения аватара:', error);
            throw error;
        }
    };

    const handleDeleteAvatar = async () => {
        if (!selectedChatForAvatar) return;

        try {
            await deleteChatAvatar(selectedChatForAvatar.id);
            console.log('Аватар чата успешно удален');
        } catch (error: any) {
            console.error('Ошибка удаления аватара:', error);
            throw error;
        }
    };

    // Функция для отображения аватара или плейсхолдера
    const renderChatAvatar = (chat: Chat) => {
        const avatar_url = chat.avatar_url;

        if (avatar_url) {
            return (
                <img
                    src={buildFileUrl(avatar_url) || ''}
                    alt={chat.name}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e0e0e0',
                        cursor: 'pointer'
                    }}
                    onClick={() => openAvatarModal(chat)}
                    onError={(e) => {
                        console.warn('Ошибка загрузки аватара чата:', avatar_url);
                        e.currentTarget.style.display = 'none';
                    }}
                />
            );
        }

        // Плейсхолдер с первой буквой названия
        const initial = chat.name?.[0]?.toUpperCase() || '?';
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
                onClick={() => openAvatarModal(chat)}
                title="Нажмите для загрузки аватара"
            >
                {initial}
            </div>
        );
    };

    // Отображение загрузки
    if (loading) {
        return (
            <div className="admin-section">
                <div className="section-header">
                    <h2>Чаты</h2>
                </div>
                <div className="admin-loading">Загрузка чатов...</div>
            </div>
        );
    }

    // Отображение ошибки
    if (error) {
        return (
            <div className="admin-section">
                <div className="section-header">
                    <h2>Чаты</h2>
                    <button className="admin-refresh-btn" onClick={loadChats}>
                        Обновить
                    </button>
                </div>
                <div className="admin-error">
                    Ошибка загрузки чатов: {error.message}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Управление чатами</h2>
                <div className="section-header-actions">
                    <button className="admin-refresh-btn" onClick={loadChats}>
                        Обновить
                    </button>
                    <button className="admin-button" onClick={openCreateModal}>
                        + Добавить чат
                    </button>
                </div>
            </div>

            {/* Панель фильтров */}
            <div className="admin-toolbar">
                <div className="admin-filters">
                    <div className="admin-filter-group">
                        <label>Фильтр по потоку:</label>
                        <select
                            className="admin-input"
                            value={selectedStreamFilter}
                            onChange={(e) => handleStreamFilterChange(e.target.value)}
                            style={{ margin: 0, minWidth: '200px' }}
                        >
                            <option value="all">Все потоки</option>
                            {streams.map(stream => (
                                <option key={stream.id} value={stream.id}>
                                    {stream.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="admin-filter-info">
                        Найдено чатов: {filteredChats.length} из {chats.length}
                    </div>
                </div>
            </div>

            {filteredChats.length === 0 ? (
                <div className="admin-empty-state">
                    {selectedStreamFilter === 'all' ? (
                        <>
                            <p>Чаты не найдены</p>
                            <button className="admin-button" onClick={openCreateModal}>
                                Добавить первый чат
                            </button>
                        </>
                    ) : (
                        <p>Чаты для выбранного потока не найдены</p>
                    )}
                </div>
            ) : (
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>🔄</th>
                                <th>Порядок</th>
                                <th>Аватар</th>
                                <th>Название</th>
                                <th>Поток</th>
                                <th>Ссылка</th>
                                <th>Дата создания</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredChats
                                .sort((a, b) => a.order_num - b.order_num)
                                .map((chat) => (
                                    <tr
                                        key={chat.id}
                                        className={`draggable-row ${draggedChatId === chat.id ? 'dragging' : ''}`}
                                        draggable
                                        onDragStart={() => handleDragStart(chat.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, chat.id)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <td className="drag-handle">⋮⋮</td>
                                        <td>
                                            <input
                                                type="number"
                                                value={chat.order_num}
                                                onChange={(e) => handleOrderChange(chat.id, parseInt(e.target.value) || 1)}
                                                className="admin-input small"
                                                min="1"
                                            />
                                        </td>
                                        <td>{renderChatAvatar(chat)}</td>
                                        <td className="font-medium">{chat.name}</td>
                                        <td className="text-gray-600">
                                            {chat.stream_name || '—'}
                                        </td>
                                        <td>
                                            <a
                                                href={chat.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                {chat.link}
                                            </a>
                                        </td>
                                        <td className="text-gray-500">
                                            {new Date(chat.created_at).toLocaleDateString('ru-RU')}
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => openEditModal(chat)}
                                                title="Редактировать чат"
                                            >
                                                Редактировать
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteChat(chat)}
                                                title="Удалить чат"
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

            {/* Модальное окно создания/редактирования чата */}
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={closeModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeModal}>×</button>

                        <h3>{editingChat ? 'Редактирование чата' : 'Создание чата'}</h3>

                        {/* Секция аватара - только для редактирования */}
                        {editingChat && (
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <label style={{ minWidth: 'auto' }}>Аватар</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {editingChat.avatar_url ? (
                                        <img
                                            src={buildFileUrl(editingChat.avatar_url) || ''}
                                            alt="Аватар"
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '2px solid #e0e0e0'
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                border: '2px solid #e0e0e0'
                                            }}
                                        >
                                            {editingChat.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="admin-button secondary"
                                        onClick={() => {
                                            closeModal();
                                            openAvatarModal(editingChat);
                                        }}
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                        disabled={modalLoading}
                                    >
                                        {editingChat.avatar_url ? 'Изменить' : 'Добавить'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Название чата *</label>
                            <input
                                type="text"
                                className="admin-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Например: Общий чат"
                                disabled={modalLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Описание</label>
                            <textarea
                                className="admin-input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Краткое описание чата"
                                rows={3}
                                disabled={modalLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Ссылка на чат *</label>
                            <input
                                type="url"
                                className="admin-input"
                                value={formData.link}
                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                placeholder="https://t.me/your_chat"
                                disabled={modalLoading}
                            />
                        </div>

                        {/* Селектор потока */}
                        <div className="form-group">
                            <label>Поток *</label>
                            {streamsLoading ? (
                                <div className="admin-loading">Загрузка потоков...</div>
                            ) : (
                                <select
                                    className="admin-input"
                                    value={selectedStreamId}
                                    onChange={(e) => handleStreamChange(e.target.value)}
                                    disabled={modalLoading}
                                >
                                    <option value="">Выберите поток</option>
                                    {streams.map(stream => (
                                        <option key={stream.id} value={stream.id}>
                                            {stream.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Мульти-селект тарифов */}
                        <div className="form-group">
                            <label>Доступно для тарифов</label>
                            {tariffsLoading || chatAccess.loading ? (
                                <div className="admin-loading">Загрузка тарифов...</div>
                            ) : (
                                <div className="checkbox-group" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-md)', padding: '12px' }}>
                                    {tariffs.map(tariff => (
                                        <label key={tariff.id} className="checkbox-inline" style={{ display: 'block', marginBottom: '8px' }}>
                                            <input
                                                type="checkbox"
                                                className="admin-checkbox"
                                                checked={selectedTariffIds.includes(tariff.id)}
                                                onChange={(e) => handleTariffCheckboxChange(tariff.id, e.target.checked)}
                                                disabled={modalLoading}
                                                style={{ marginRight: '8px' }}
                                            />
                                            {tariff.name} ({tariff.code})
                                        </label>
                                    ))}
                                </div>
                            )}
                            {chatAccess.error && (
                                <div className="admin-error" style={{ marginTop: '8px', fontSize: '12px' }}>
                                    Ошибка загрузки доступов: {chatAccess.error.message}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Порядковый номер</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formData.order_num}
                                onChange={(e) => setFormData({ ...formData, order_num: parseInt(e.target.value) || 1 })}
                                min="1"
                                disabled={modalLoading}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={handleSaveChat}
                                disabled={modalLoading}
                            >
                                {modalLoading ? 'Сохранение...' : editingChat ? 'Сохранить изменения' : 'Создать чат'}
                            </button>
                            <button
                                className="admin-button"
                                onClick={closeModal}
                                disabled={modalLoading}
                                style={{ background: 'var(--admin-danger)' }}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно аватара чата */}
            <ChatAvatarModal
                isOpen={avatarModalOpen}
                chat={selectedChatForAvatar}
                onClose={closeAvatarModal}
                onSave={handleSaveAvatar}
                onDelete={handleDeleteAvatar}
            />
        </div>
    );
};

export default ChatsManager;
