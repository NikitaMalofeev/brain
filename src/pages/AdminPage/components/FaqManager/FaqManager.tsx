import React, { useState } from 'react';
import { useFaqAdmin } from '@/lib/supabase/hooks';
import type { FAQ, CreateFAQData, UpdateFAQData } from '@/types';

const FaqManager: React.FC = () => {
    const { faqItems, loading, error, createFaq, updateFaq, deleteFaq } = useFaqAdmin();

    // Состояние для drag & drop
    const [draggedFaqId, setDraggedFaqId] = useState<string | null>(null);

    // Состояние для модальных окон
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

    // Состояние для форм
    const [formData, setFormData] = useState({
        question: '',
        answer: '',
        order_num: 1
    });

    // === DRAG & DROP ЛОГИКА ===
    const handleDragStart = (id: string) => {
        setDraggedFaqId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedFaqId || draggedFaqId === targetId) {
            setDraggedFaqId(null);
            return;
        }

        const draggedIndex = faqItems.findIndex(f => f.id === draggedFaqId);
        const targetIndex = faqItems.findIndex(f => f.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedFaqId(null);
            return;
        }

        // Создаем новый массив с измененным порядком
        const updatedFaqs = [...faqItems];
        const [movedItem] = updatedFaqs.splice(draggedIndex, 1);
        updatedFaqs.splice(targetIndex, 0, movedItem);

        // Обновляем order_num для всех элементов
        try {
            for (let i = 0; i < updatedFaqs.length; i++) {
                const faq = updatedFaqs[i];
                if (faq.order_num !== i + 1) {
                    await updateFaq({
                        id: faq.id,
                        order_num: i + 1
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении порядка FAQ:', error);
        }

        setDraggedFaqId(null);
    };

    const handleDragEnd = () => {
        setDraggedFaqId(null);
    };

    // === МОДАЛЬНЫЕ ОКНА ===
    const openCreateModal = () => {
        setFormData({
            question: '',
            answer: '',
            order_num: faqItems.length + 1
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (faq: FAQ) => {
        setEditingFaq(faq);
        setFormData({
            question: faq.question,
            answer: faq.answer,
            order_num: faq.order_num
        });
        setIsEditModalOpen(true);
    };

    const closeModals = () => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setEditingFaq(null);
        setFormData({
            question: '',
            answer: '',
            order_num: 1
        });
    };

    // === CRUD ОПЕРАЦИИ ===
    const handleCreate = async () => {
        try {
            const createData: CreateFAQData = {
                question: formData.question.trim(),
                answer: formData.answer.trim(),
                order_num: formData.order_num
            };

            if (!createData.question || !createData.answer) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }

            await createFaq(createData);
            closeModals();
        } catch (error) {
            console.error('Ошибка при создании FAQ:', error);
            alert('Ошибка при создании FAQ');
        }
    };

    const handleUpdate = async () => {
        if (!editingFaq) return;

        try {
            const updateData: UpdateFAQData = {
                id: editingFaq.id,
                question: formData.question.trim(),
                answer: formData.answer.trim(),
                order_num: formData.order_num
            };

            if (!updateData.question || !updateData.answer) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }

            await updateFaq(updateData);
            closeModals();
        } catch (error) {
            console.error('Ошибка при обновлении FAQ:', error);
            alert('Ошибка при обновлении FAQ');
        }
    };

    const handleDelete = async (faq: FAQ) => {
        if (!confirm(`Вы уверены, что хотите удалить вопрос "${faq.question}"?`)) {
            return;
        }

        try {
            await deleteFaq(faq.id);
        } catch (error) {
            console.error('Ошибка при удалении FAQ:', error);
            alert('Ошибка при удалении FAQ');
        }
    };

    // === РЕНДЕР ===
    if (loading) {
        return (
            <div className="admin-section">
                <div className="admin-loading">Загрузка FAQ...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-section">
                <div className="admin-error">Ошибка загрузки FAQ: {error.message}</div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>FAQ</h2>
                <div className="section-header-actions">
                    <button className="admin-refresh-btn" onClick={() => window.location.reload()}>
                        🔄 Обновить
                    </button>
                    <button className="admin-button" onClick={openCreateModal}>
                        + Добавить вопрос
                    </button>
                </div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Вопрос</th>
                            <th>Ответ</th>
                            <th>Порядок</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {faqItems.map((faq) => (
                            <tr
                                key={faq.id}
                                className={`draggable-row ${draggedFaqId === faq.id ? 'dragging' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(faq.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, faq.id)}
                                onDragEnd={handleDragEnd}
                            >
                                <td className="drag-handle">⋮⋮</td>
                                <td>{faq.question}</td>
                                <td>{faq.answer}</td>
                                <td>{faq.order_num}</td>
                                <td className="actions-cell">
                                    <button
                                        className="action-btn edit-btn"
                                        onClick={() => openEditModal(faq)}
                                        title="Редактировать вопрос"
                                    >
                                        ✎ Редактировать
                                    </button>
                                    <button
                                        className="action-btn delete-btn"
                                        onClick={() => handleDelete(faq)}
                                        title="Удалить вопрос"
                                    >
                                        ✕ Удалить
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ */}
            {isCreateModalOpen && (
                <div className="admin-modal-backdrop" onClick={closeModals}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeModals}>×</button>
                        <h3>Добавить новый вопрос</h3>

                        <div className="form-group">
                            <label>Вопрос:</label>
                            <input
                                type="text"
                                className="admin-input"
                                value={formData.question}
                                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Введите вопрос"
                            />
                        </div>

                        <div className="form-group">
                            <label>Ответ:</label>
                            <textarea
                                className="admin-input"
                                rows={4}
                                value={formData.answer}
                                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                                placeholder="Введите ответ"
                            />
                        </div>

                        <div className="form-group">
                            <label>Порядковый номер:</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formData.order_num}
                                onChange={(e) => setFormData(prev => ({ ...prev, order_num: parseInt(e.target.value) || 1 }))}
                                min="1"
                            />
                        </div>

                        <div className="form-actions">
                            <button className="admin-button" onClick={handleCreate}>
                                Сохранить
                            </button>
                            <button className="admin-button" style={{ background: 'var(--admin-danger)' }} onClick={closeModals}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
            {isEditModalOpen && editingFaq && (
                <div className="admin-modal-backdrop" onClick={closeModals}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeModals}>×</button>
                        <h3>Редактировать вопрос</h3>

                        <div className="form-group">
                            <label>Вопрос:</label>
                            <input
                                type="text"
                                className="admin-input"
                                value={formData.question}
                                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Введите вопрос"
                            />
                        </div>

                        <div className="form-group">
                            <label>Ответ:</label>
                            <textarea
                                className="admin-input"
                                rows={4}
                                value={formData.answer}
                                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                                placeholder="Введите ответ"
                            />
                        </div>

                        <div className="form-group">
                            <label>Порядковый номер:</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formData.order_num}
                                onChange={(e) => setFormData(prev => ({ ...prev, order_num: parseInt(e.target.value) || 1 }))}
                                min="1"
                            />
                        </div>

                        <div className="form-actions">
                            <button className="admin-button" onClick={handleUpdate}>
                                Сохранить изменения
                            </button>
                            <button className="admin-button" style={{ background: 'var(--admin-danger)' }} onClick={closeModals}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaqManager; 