import React, { useEffect, useState } from 'react';
import { useStudentDetails, StudentLessonProgress, StudentMaterialView } from '@/lib/supabase/hooks/useStudentDetails';
import { useStudentActions } from '@/lib/supabase/hooks/useStudentActions';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';

interface StudentCardProps {
    studentId: string;
    onBack: () => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ studentId, onBack }) => {
    const { studentDetails, loading, error, loadStudentDetails, assignStudentTariff, assigningTariff } = useStudentDetails();
    const { resetLessonProgress, markMaterialViewed, resetMaterialView, updateStudentPoints, markLessonAsCompleted, markLessonAsIncomplete } = useStudentActions();
    const { tariffs, loading: tariffsLoading } = useTariffsAdmin();

    // Состояние для выбранного тарифа
    const [selectedTariffId, setSelectedTariffId] = useState<string>('');

    // Локальный стейт для загрузки строк и bulk-операций
    const [rowLoading, setRowLoading] = useState<Record<number, boolean>>({});
    const [bulkLoading, setBulkLoading] = useState<boolean>(false);

    // Состояние для формы добавления/удаления баллов
    const [deltaPoints, setDeltaPoints] = useState<string>('');
    const [pointsLoading, setPointsLoading] = useState<boolean>(false);

    useEffect(() => {
        loadStudentDetails(studentId);
    }, [studentId]);

    // Синхронизируем выбранный тариф с данными студента
    useEffect(() => {
        if (studentDetails?.basicInfo.current_tariff_id) {
            setSelectedTariffId(studentDetails.basicInfo.current_tariff_id);
        } else {
            setSelectedTariffId('');
        }
    }, [studentDetails?.basicInfo.current_tariff_id]);

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    };
    const formatDateTime = (dateString?: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('ru-RU', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleUpdatePoints = async () => {
        const input = prompt('Введите новое количество баллов:', studentDetails?.basicInfo.total_points.toString());
        if (input == null) return;
        const value = parseInt(input, 10);
        if (isNaN(value)) {
            alert('Неверное число');
            return;
        }
        await updateStudentPoints(studentId, value);
        await loadStudentDetails(studentId);
    };

    const handleAssignTariff = async () => {
        if (!selectedTariffId) {
            alert('Выберите тариф');
            return;
        }

        try {
            await assignStudentTariff(studentId, selectedTariffId);
            alert('Тариф успешно назначен');
        } catch (error) {
            console.error('Ошибка при назначении тарифа:', error);
            alert('Ошибка при назначении тарифа');
        }
    };

    // Функция для добавления баллов
    const handleAddPoints = async () => {
        const points = parseInt(deltaPoints, 10);
        if (isNaN(points) || points <= 0) {
            alert('Введите корректное положительное число');
            return;
        }

        setPointsLoading(true);
        try {
            const newPoints = basicInfo.total_points + points;
            await updateStudentPoints(studentId, newPoints);
            await loadStudentDetails(studentId);
            setDeltaPoints('');
            alert(`Добавлено ${points} баллов. Новый баланс: ${newPoints}`);
        } catch (error) {
            console.error('Ошибка при добавлении баллов:', error);
            alert('Ошибка при добавлении баллов');
        } finally {
            setPointsLoading(false);
        }
    };

    // Функция для удаления баллов
    const handleSubtractPoints = async () => {
        const points = parseInt(deltaPoints, 10);
        if (isNaN(points) || points <= 0) {
            alert('Введите корректное положительное число');
            return;
        }

        setPointsLoading(true);
        try {
            const newPoints = Math.max(0, basicInfo.total_points - points);
            await updateStudentPoints(studentId, newPoints);
            await loadStudentDetails(studentId);
            setDeltaPoints('');
            alert(`Удалено ${points} баллов. Новый баланс: ${newPoints}`);
        } catch (error) {
            console.error('Ошибка при удалении баллов:', error);
            alert('Ошибка при удалении баллов');
        } finally {
            setPointsLoading(false);
        }
    };

    // Bulk: отметить все уроки как пройденные
    const handleBulkComplete = async () => {
        if (!window.confirm('Отметить все уроки как пройденные?')) return;
        setBulkLoading(true);
        try {
            for (const lesson of studentDetails?.lessonProgress || []) {
                if (!lesson.is_completed) {
                    await markLessonAsCompleted(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert('Все уроки отмечены как пройденные');
        } catch (error) {
            console.error('Ошибка при массовом завершении уроков:', error);
            alert('Ошибка при массовом завершении уроков');
        } finally {
            setBulkLoading(false);
        }
    };

    // Bulk: снять все отметки пройденных уроков
    const handleBulkReset = async () => {
        if (!window.confirm('Снять все отметки пройденных уроков?')) return;
        setBulkLoading(true);
        try {
            for (const lesson of studentDetails?.lessonProgress || []) {
                if (lesson.is_completed) {
                    await markLessonAsIncomplete(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert('Все отметки сняты');
        } catch (error) {
            console.error('Ошибка при массовом снятии отметок уроков:', error);
            alert('Ошибка при массовом снятии отметок уроков');
        } finally {
            setBulkLoading(false);
        }
    };

    // Bulk операции для конкретной ступени
    const handleStageComplete = async (stageName: string, lessons: StudentLessonProgress[]) => {
        if (!window.confirm(`Отметить все уроки ступени "${stageName}" как пройденные?`)) return;
        setBulkLoading(true);
        try {
            for (const lesson of lessons) {
                if (!lesson.is_completed) {
                    await markLessonAsCompleted(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert(`Все уроки ступени "${stageName}" отмечены как пройденные`);
        } catch (error) {
            console.error('Ошибка при завершении уроков ступени:', error);
            alert('Ошибка при завершении уроков ступени');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleStageReset = async (stageName: string, lessons: StudentLessonProgress[]) => {
        if (!window.confirm(`Снять все отметки с уроков ступени "${stageName}"?`)) return;
        setBulkLoading(true);
        try {
            for (const lesson of lessons) {
                if (lesson.is_completed) {
                    await markLessonAsIncomplete(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert(`Все отметки с уроков ступени "${stageName}" сняты`);
        } catch (error) {
            console.error('Ошибка при сбросе уроков ступени:', error);
            alert('Ошибка при сбросе уроков ступени');
        } finally {
            setBulkLoading(false);
        }
    };

    if (loading) return <div className="admin-loading">Загрузка...</div>;
    if (error) return <div className="admin-error">Ошибка: {error.message}</div>;
    if (!studentDetails) return null;

    const { basicInfo, lessonProgress, materialViews, progressStats } = studentDetails;

    // Группировка уроков по стадиям
    const lessonsByStage: Record<string, StudentLessonProgress[]> = {};
    lessonProgress.forEach(l => {
        if (!lessonsByStage[l.stage_name]) lessonsByStage[l.stage_name] = [];
        lessonsByStage[l.stage_name].push(l);
    });

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Карточка ученика</h2>
                <button className="admin-button" onClick={onBack}>← Назад</button>
            </div>

            <div className="admin-card">
                <h3>Основная информация</h3>
                <p><strong>ФИО:</strong> {basicInfo.full_name}</p>
                <p><strong>Telegram-ID / Web-login:</strong> {basicInfo.web_login || basicInfo.telegram_id}</p>
                <p><strong>Дата регистрации:</strong> {formatDate(basicInfo.created_at)}</p>
                <p><strong>Последний вход:</strong> {formatDateTime(basicInfo.web_last_login || basicInfo.last_login)}</p>
                <p style={{ paddingTop: '12px' }}>
                    <strong>Баллы:</strong> {basicInfo.total_points}{' '}
                    <button className="action-btn edit-btn" onClick={handleUpdatePoints}>Изменить</button>
                </p>

                {/* Форма для добавления/удаления баллов */}
                <div className="form-group" style={{ paddingTop: '12px' }}>
                    <label style={{ fontSize: '16px', fontWeight: '600' }}>Корректировка баллов:</label>
                    <input
                        type="number"
                        className="admin-input"
                        style={{ width: '33%' }}
                        placeholder="Количество баллов"
                        value={deltaPoints}
                        onChange={(e) => setDeltaPoints(e.target.value)}
                        disabled={pointsLoading}
                        min="1"
                    />
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'left' }}>
                        <button
                            className="action-btn edit-btn"
                            style={{
                                position: 'relative'
                            }}
                            onClick={handleAddPoints}
                            disabled={pointsLoading || !deltaPoints}
                            title="Добавить баллы"
                        >
                            <style>{`
                                .action-btn.edit-btn[title="Добавить баллы"]::before {
                                    content: '+' !important;
                                    font-size: 16px !important;
                                }
                            `}</style>
                            {pointsLoading ? '...' : 'Добавить'}
                        </button>
                        <button
                            className="action-btn delete-btn"
                            style={{
                                position: 'relative'
                            }}
                            onClick={handleSubtractPoints}
                            disabled={pointsLoading || !deltaPoints}
                            title="Удалить баллы"
                        >
                            <style>{`
                                .action-btn.delete-btn[title="Удалить баллы"]::before {
                                    content: '−' !important;
                                    font-size: 16px !important;
                                }
                            `}</style>
                            {pointsLoading ? '...' : 'Убрать'}
                        </button>
                    </div>
                </div>
                {/* Выбор тарифа пользователя */}
                <div className="form-group">
                    <label>Текущий тариф:</label>
                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <select
                                className="admin-input"
                                value={selectedTariffId}
                                onChange={(e) => setSelectedTariffId(e.target.value)}
                                disabled={tariffsLoading || assigningTariff}
                            >
                                <option value="">-- Выберите тариф --</option>
                                {tariffs.map(tariff => (
                                    <option key={tariff.id} value={tariff.id}>
                                        {tariff.name} ({tariff.code})
                                    </option>
                                ))}
                            </select>
                            {basicInfo.current_tariff_name && (
                                <small>
                                    Активный: {basicInfo.current_tariff_name} ({basicInfo.current_tariff_code})
                                </small>
                            )}
                        </div>
                        <div className="form-group" style={{ flex: 'none', marginBottom: 0 }}>
                            <button
                                className="admin-button"
                                onClick={handleAssignTariff}
                                disabled={assigningTariff || !selectedTariffId}
                            >
                                {assigningTariff ? 'Назначение...' : 'Назначить'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <h3>Статистика</h3>
                <p>Уроки: {progressStats.completedLessons} из {progressStats.totalLessonsInCourse} ({progressStats.completedLessonsPercent}%)</p>
                <progress value={progressStats.completedLessons} max={progressStats.totalLessonsInCourse || 1} />
            </div>

            <div className="admin-card">
                <h3>Массовые операции</h3>
                <button
                    className="admin-button mr-2"
                    onClick={handleBulkComplete}
                    disabled={bulkLoading || loading}
                >
                    {bulkLoading ? 'Выполняется...' : 'Отметить все как пройденные'}
                </button>
                <button
                    className="admin-button"
                    onClick={handleBulkReset}
                    disabled={bulkLoading || loading}
                >
                    {bulkLoading ? 'Выполняется...' : 'Снять все отметки'}
                </button>
            </div>

            {
                Object.entries(lessonsByStage).map(([stageName, lessons]) => (
                    <div key={stageName} className="admin-card">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="mb-0">{stageName}</h4>
                            <div className="flex gap-2">
                                <button
                                    className="admin-button admin-button-sm"
                                    onClick={() => handleStageComplete(stageName, lessons)}
                                    disabled={bulkLoading || loading}
                                >
                                    Завершить все
                                </button>
                                <button
                                    className="admin-button admin-button-sm"
                                    onClick={() => handleStageReset(stageName, lessons)}
                                    disabled={bulkLoading || loading}
                                >
                                    Сбросить все
                                </button>
                            </div>
                        </div>
                        <div className="admin-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Урок</th>
                                        <th>Открыт</th>
                                        <th>Срок сдачи</th>
                                        <th>Завершен</th>
                                        <th>Дата сдачи</th>
                                        <th>Действие</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessons.map(l => (
                                        <tr key={l.lesson_id}>
                                            <td>{l.lesson_name}</td>
                                            <td>{formatDate(l.open_at)}</td>
                                            <td>{formatDate(l.deadline_at)}</td>
                                            <td>
                                                <span className={`admin-status ${l.is_completed ? 'admin-yes' : 'admin-no'}`}>{l.is_completed ? 'Да' : 'Нет'}</span>
                                            </td>
                                            <td>{formatDateTime(l.completed_at)}</td>
                                            <td>
                                                {!l.is_completed ? (
                                                    <button
                                                        className="action-btn edit-btn"
                                                        disabled={loading || bulkLoading || !!rowLoading[l.lesson_id]}
                                                        onClick={async () => {
                                                            setRowLoading(prev => ({ ...prev, [l.lesson_id]: true }));
                                                            try {
                                                                await markLessonAsCompleted(studentId, l.lesson_id);
                                                                await loadStudentDetails(studentId);
                                                            } catch (error) {
                                                                console.error('Ошибка при завершении урока:', error);
                                                                alert('Ошибка при завершении урока');
                                                            } finally {
                                                                setRowLoading(prev => ({ ...prev, [l.lesson_id]: false }));
                                                            }
                                                        }}
                                                    >Завершить</button>
                                                ) : (
                                                    <button
                                                        className="action-btn delete-btn"
                                                        disabled={loading || bulkLoading || !!rowLoading[l.lesson_id]}
                                                        onClick={async () => {
                                                            setRowLoading(prev => ({ ...prev, [l.lesson_id]: true }));
                                                            try {
                                                                await resetLessonProgress(studentId, l.lesson_id);
                                                                await loadStudentDetails(studentId);
                                                                alert('Прогресс урока сброшен');
                                                            } catch (error) {
                                                                console.error('Ошибка при сбросе прогресса:', error);
                                                                alert('Ошибка при сбросе прогресса урока');
                                                            } finally {
                                                                setRowLoading(prev => ({ ...prev, [l.lesson_id]: false }));
                                                            }
                                                        }}
                                                    >Сбросить</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            }

            <div className="admin-card">
                <h3>Библиотечные материалы</h3>
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Материал</th>
                                <th>Тип</th>
                                <th>Дата первого просмотра</th>
                                <th>Просмотрено</th>
                                <th>Дата просмотра</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materialViews.map(m => (
                                <tr key={m.material_id}>
                                    <td>{m.material_name}</td>
                                    <td>{m.material_type}</td>
                                    <td>{formatDateTime(m.first_viewed_at)}</td>
                                    <td>
                                        <span className={`admin-status ${m.is_completed ? 'admin-yes' : 'admin-no'}`}>{m.is_completed ? '✓' : '✗'}</span>
                                    </td>
                                    <td>{formatDateTime(m.last_viewed_at)}</td>
                                    <td>
                                        {m.is_completed ? (
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={async () => {
                                                    await resetMaterialView(studentId, m.material_id);
                                                    await loadStudentDetails(studentId);
                                                }}
                                            >Сбросить</button>
                                        ) : (
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={async () => {
                                                    await markMaterialViewed(studentId, m.material_id);
                                                    await loadStudentDetails(studentId);
                                                }}
                                            >Пометить просмотренным</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default StudentCard; 