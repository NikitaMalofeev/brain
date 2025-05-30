import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

// Типы данных для сабмитов
interface SubmissionWithDetails {
    id: number;
    user_id: string;
    lesson_id: number;
    submitted_at: string;
    content_text?: string;
    file_url?: string;
    status: 'submitted' | 'pending_review' | 'approved' | 'rejected';
    reviewed_by_curator_id?: string;
    reviewed_at?: string;
    feedback_text?: string;
    points_awarded: number;
    // Дополнительные поля из JOIN
    user_first_name: string;
    user_last_name: string;
    user_photo_url?: string;
    lesson_name: string;
    stage_name: string;
    reviewer_name?: string;
}

interface SubmissionsManagerProps {
    onSubmissionSelect: (submissionId: number) => void;
}

const SubmissionsManager: React.FC<SubmissionsManagerProps> = ({ onSubmissionSelect }) => {
    const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stageFilter, setStageFilter] = useState<string>('all');

    // Статистика для отображения
    const [stats, setStats] = useState({
        pending: 0,
        reviewedToday: 0
    });

    // Загрузка сабмитов
    const loadSubmissions = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

            // Основной SQL запрос для получения сабмитов с деталями
            let query = supabase
                .from('submissions')
                .select(`
          id,
          user_id,
          lesson_id,
          submitted_at,
          content_text,
          file_url,
          status,
          reviewed_by_curator_id,
          reviewed_at,
          feedback_text,
          points_awarded,
          users!submissions_user_id_fkey(first_name, last_name, photo_url),
          lessons!submissions_lesson_id_fkey(
            name,
            course_stages!lessons_stage_id_fkey(name)
          ),
          reviewer:users!submissions_reviewed_by_curator_id_fkey(first_name, last_name)
        `)
                .order('submitted_at', { ascending: false });

            // Применяем фильтр по статусу
            if (statusFilter !== 'all') {
                if (statusFilter === 'pending') {
                    query = query.in('status', ['submitted', 'pending_review']);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error: queryError } = await query;

            if (queryError) {
                console.error('Ошибка загрузки сабмитов:', queryError);
                setError(`Ошибка загрузки данных: ${queryError.message}`);
                return;
            }

            // Трансформируем данные для удобства
            const transformedSubmissions: SubmissionWithDetails[] = (data || []).map((submission: any) => ({
                id: submission.id,
                user_id: submission.user_id,
                lesson_id: submission.lesson_id,
                submitted_at: submission.submitted_at,
                content_text: submission.content_text,
                file_url: submission.file_url,
                status: submission.status as 'submitted' | 'pending_review' | 'approved' | 'rejected',
                reviewed_by_curator_id: submission.reviewed_by_curator_id,
                reviewed_at: submission.reviewed_at,
                feedback_text: submission.feedback_text,
                points_awarded: submission.points_awarded,
                user_first_name: (submission.users as any)?.first_name || 'Неизвестно',
                user_last_name: (submission.users as any)?.last_name || '',
                user_photo_url: (submission.users as any)?.photo_url,
                lesson_name: (submission.lessons as any)?.name || 'Неизвестный урок',
                stage_name: (submission.lessons as any)?.course_stages?.name || 'Неизвестная ступень',
                reviewer_name: (submission.reviewer as any)?.first_name || undefined
            }));

            setSubmissions(transformedSubmissions);

            // Подсчитываем статистику
            const pendingCount = transformedSubmissions.filter(s =>
                ['submitted', 'pending_review'].includes(s.status)
            ).length;

            const today = new Date().toISOString().split('T')[0];
            const reviewedTodayCount = transformedSubmissions.filter(s =>
                s.reviewed_at && s.reviewed_at.startsWith(today)
            ).length;

            setStats({
                pending: pendingCount,
                reviewedToday: reviewedTodayCount
            });

        } catch (err) {
            console.error('Неожиданная ошибка:', err);
            setError('Произошла неожиданная ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSubmissions();
    }, [statusFilter, stageFilter]);

    // Быстрые действия для проверки сабмита
    const handleQuickAction = async (submissionId: number, action: 'approve' | 'reject', points?: number) => {
        try {
            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

            const updateData: any = {
                status: action === 'approve' ? 'approved' : 'rejected',
                reviewed_at: new Date().toISOString(),
                // TODO: Получить ID текущего куратора
                reviewed_by_curator_id: null
            };

            if (action === 'approve' && points) {
                updateData.points_awarded = points;
            }

            const { error } = await supabase
                .from('submissions')
                .update(updateData)
                .eq('id', submissionId);

            if (error) {
                console.error('Ошибка обновления сабмита:', error);
                setError(`Ошибка обновления: ${error.message}`);
                return;
            }

            // Начисляем баллы пользователю при одобрении
            if (action === 'approve' && points) {
                const submission = submissions.find(s => s.id === submissionId);
                if (submission) {
                    // Сначала получаем текущие баллы пользователя
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('total_points')
                        .eq('id', submission.user_id)
                        .single();

                    if (!userError && userData) {
                        // Обновляем баллы
                        const { error: pointsError } = await supabase
                            .from('users')
                            .update({
                                total_points: (userData.total_points || 0) + points
                            })
                            .eq('id', submission.user_id);

                        if (pointsError) {
                            console.error('Ошибка начисления баллов:', pointsError);
                        }
                    }
                }
            }

            // Перезагружаем данные
            await loadSubmissions();

            // TODO: Отправить уведомление пользователю
            console.log(`Уведомление: Сабмит ${submissionId} ${action === 'approve' ? 'принят' : 'отклонен'}`);

        } catch (err) {
            console.error('Ошибка быстрого действия:', err);
            setError('Произошла ошибка при обработке действия');
        }
    };

    // Форматирование даты
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Получение статуса на русском
    const getStatusText = (status: string) => {
        switch (status) {
            case 'submitted': return '📝 Сдано';
            case 'pending_review': return '⏳ В проверке';
            case 'approved': return '✅ Принято';
            case 'rejected': return '❌ Отклонено';
            default: return status;
        }
    };

    // Получение CSS класса для статуса
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'submitted': return 'admin-status admin-no';
            case 'pending_review': return 'admin-status admin-no';
            case 'approved': return 'admin-status admin-yes';
            case 'rejected': return 'admin-status admin-no';
            default: return 'admin-status';
        }
    };

    if (loading) {
        return <div className="admin-loading">Загрузка сабмитов...</div>;
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Проверка домашних заданий</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className="admin-status">
                        Ожидают проверки: <strong>{stats.pending}</strong>
                    </span>
                    <span className="admin-status">
                        Проверено сегодня: <strong>{stats.reviewedToday}</strong>
                    </span>
                    <button
                        className="admin-refresh-btn"
                        onClick={loadSubmissions}
                        title="Обновить список"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {error && (
                <div className="admin-error">
                    {error}
                </div>
            )}

            {/* Фильтры */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div>
                    <label>Статус: </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="admin-input"
                        style={{ width: 'auto', marginLeft: '0.5rem' }}
                    >
                        <option value="all">Все</option>
                        <option value="pending">Ожидают проверки</option>
                        <option value="approved">Принятые</option>
                        <option value="rejected">Отклоненные</option>
                    </select>
                </div>
            </div>

            {/* Таблица сабмитов */}
            <div className="practices-table">
                {submissions.length === 0 ? (
                    <div className="empty-table">
                        {statusFilter === 'pending'
                            ? 'Нет сабмитов, ожидающих проверки'
                            : 'Сабмиты не найдены'
                        }
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Пользователь</th>
                                <th>Урок</th>
                                <th>Ступень</th>
                                <th>Дата сдачи</th>
                                <th>Статус</th>
                                <th>Баллы</th>
                                <th>Куратор</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((submission) => (
                                <tr key={submission.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {submission.user_photo_url && (
                                                <img
                                                    src={submission.user_photo_url}
                                                    alt="Аватар"
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                                                />
                                            )}
                                            <div>
                                                <div>{submission.user_first_name} {submission.user_last_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{submission.lesson_name}</td>
                                    <td>{submission.stage_name}</td>
                                    <td>{formatDate(submission.submitted_at)}</td>
                                    <td>
                                        <span className={getStatusClass(submission.status)}>
                                            {getStatusText(submission.status)}
                                        </span>
                                    </td>
                                    <td>{submission.points_awarded || '-'}</td>
                                    <td>{submission.reviewer_name || '-'}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => onSubmissionSelect(submission.id)}
                                            title="Просмотреть детали"
                                        >
                                            👁️
                                        </button>

                                        {['submitted', 'pending_review'].includes(submission.status) && (
                                            <>
                                                <button
                                                    className="action-btn admin-yes"
                                                    onClick={() => handleQuickAction(submission.id, 'approve', 100)}
                                                    title="Быстро принять (100 баллов)"
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    className="action-btn admin-no"
                                                    onClick={() => handleQuickAction(submission.id, 'reject')}
                                                    title="Быстро отклонить"
                                                >
                                                    ❌
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SubmissionsManager; 