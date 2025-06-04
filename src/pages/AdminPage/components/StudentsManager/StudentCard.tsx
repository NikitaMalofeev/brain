import React, { useEffect } from 'react';
import { useStudentDetails, StudentLessonProgress, StudentMaterialView } from '@/lib/supabase/hooks/useStudentDetails';
import { useStudentActions } from '@/lib/supabase/hooks/useStudentActions';

interface StudentCardProps {
    studentId: string;
    onBack: () => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ studentId, onBack }) => {
    const { studentDetails, loading, error, loadStudentDetails } = useStudentDetails();
    const { resetLessonProgress, markMaterialViewed, resetMaterialView, updateStudentPoints } = useStudentActions();

    useEffect(() => {
        loadStudentDetails(studentId);
    }, [studentId]);

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
                <p>
                    <strong>Баллы:</strong> {basicInfo.total_points}{' '}
                    <button className="action-btn edit-btn" onClick={handleUpdatePoints}>Изменить</button>
                </p>
            </div>

            <div className="admin-card">
                <h3>Статистика</h3>
                <p>Уроки: {progressStats.completedLessons} из {progressStats.totalLessonsInCourse} ({progressStats.completedLessonsPercent}%)</p>
                <progress value={progressStats.completedLessons} max={progressStats.totalLessonsInCourse || 1} />
            </div>

            {Object.entries(lessonsByStage).map(([stageName, lessons]) => (
                <div key={stageName} className="admin-card">
                    <h4>{stageName}</h4>
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
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={async () => {
                                                    try {
                                                        await resetLessonProgress(studentId, l.lesson_id);
                                                        await loadStudentDetails(studentId);
                                                        alert('Прогресс урока сброшен');
                                                    } catch (error) {
                                                        console.error('Ошибка при сбросе прогресса:', error);
                                                        alert('Ошибка при сбросе прогресса урока');
                                                    }
                                                }}
                                            >Сбросить</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

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
        </div>
    );
};

export default StudentCard; 