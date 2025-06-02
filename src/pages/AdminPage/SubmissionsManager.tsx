import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SubmissionStatus, getSubmissionDisplayStatus } from '@/lib/supabase/types';

// Типы данных для сабмитов
interface SubmissionWithDetails {
    id: number;
    user_id: string;
    lesson_id: number;
    submitted_at: string;
    first_submitted_at?: string;
    content_text?: string;
    file_url?: string;
    status: SubmissionStatus;
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
    // Добавляем поле для дедлайна из урока
    lesson_deadline?: string;
}

interface SubmissionsManagerProps {
    onSubmissionSelect: (submissionId: number) => void;
    // Добавляем информацию о текущем пользователе для админки
    currentUser?: {
        id: string;
        role: string;
        first_name?: string;
        last_name?: string;
    } | null;
}

const SubmissionsManager: React.FC<SubmissionsManagerProps> = ({
    onSubmissionSelect,
    currentUser: propCurrentUser
}) => {
    const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

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

            // Получаем текущего пользователя для админки
            let effectiveCurrentUser = propCurrentUser;
            if (!effectiveCurrentUser) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    effectiveCurrentUser = {
                        id: user.id,
                        role: 'admin', // По умолчанию админ для авторизованных в админке
                        first_name: user.user_metadata?.first_name,
                        last_name: user.user_metadata?.last_name
                    };
                }
            }

            setCurrentUser(effectiveCurrentUser || null);

            // Полный запрос со всеми JOIN-ами
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    *,
                    users!submissions_user_id_fkey (first_name, last_name, photo_url),
                    lessons!submissions_lesson_id_fkey (
                        name, 
                        deadline_at,
                        course_stages!lessons_stage_id_fkey (name)
                    ),
                    reviewer:users!submissions_reviewed_by_curator_id_fkey(first_name)
                `)
                .order('submitted_at', { ascending: false });

            if (error) {
                console.error('Ошибка загрузки сабмитов:', error);
                console.error('Детали ошибки:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                setError(`Ошибка загрузки данных: ${error.message}`);
                return;
            }

            console.log('Загруженные submissions:', data);

            // Полная трансформация с пользователями, уроками и этапами
            const transformedSubmissions: SubmissionWithDetails[] = (data || []).map((submission: any) => ({
                id: submission.id,
                user_id: submission.user_id,
                lesson_id: submission.lesson_id,
                submitted_at: submission.submitted_at,
                first_submitted_at: submission.first_submitted_at,
                content_text: submission.content_text,
                file_url: submission.file_url,
                status: submission.status as SubmissionStatus,
                reviewed_by_curator_id: submission.reviewed_by_curator_id,
                reviewed_at: submission.reviewed_at,
                feedback_text: submission.feedback_text,
                points_awarded: submission.points_awarded,
                user_first_name: (submission.users as any)?.first_name || 'Неизвестно',
                user_last_name: (submission.users as any)?.last_name || '',
                user_photo_url: (submission.users as any)?.photo_url,
                lesson_name: (submission.lessons as any)?.name || 'Неизвестный урок',
                lesson_deadline: (submission.lessons as any)?.deadline_at,
                stage_name: (submission.lessons as any)?.course_stages?.name || 'Неизвестная ступень',
                reviewer_name: (submission.reviewer as any)?.first_name || undefined
            }));

            // Применяем фильтр по статусу
            let filteredSubmissions = transformedSubmissions;
            if (statusFilter !== 'all') {
                if (statusFilter === 'pending') {
                    filteredSubmissions = transformedSubmissions.filter(s =>
                        ['submitted', 'pending_review'].includes(s.status)
                    );
                } else if (statusFilter === 'late') {
                    // Фильтр поздних сдач - статус submitted/pending_review И опоздание по first_submitted_at
                    filteredSubmissions = transformedSubmissions.filter(s => {
                        if (!['submitted', 'pending_review'].includes(s.status)) return false;
                        if (!s.lesson_deadline) return false;

                        // Используем first_submitted_at если есть, иначе submitted_at
                        const timeToCheck = s.first_submitted_at || s.submitted_at;
                        const submissionDate = new Date(timeToCheck);
                        const deadlineDate = new Date(s.lesson_deadline);
                        return submissionDate > deadlineDate;
                    });
                } else {
                    filteredSubmissions = transformedSubmissions.filter(s => s.status === statusFilter);
                }
            }

            setSubmissions(filteredSubmissions);

            // Подсчитываем статистику по всем данным (не фильтрованным)
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
    }, [statusFilter, stageFilter, propCurrentUser]);

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
                reviewed_by_curator_id: currentUser?.id || null
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

    // Форматирование даты сдачи с индикатором пересдачи
    const formatSubmissionDate = (submission: SubmissionWithDetails) => {
        const isResubmission = submission.first_submitted_at &&
            submission.first_submitted_at !== submission.submitted_at;

        return (
            <div>
                <div>{formatDate(submission.submitted_at)}</div>
                {isResubmission && (
                    <div style={{
                        fontSize: '11px',
                        color: '#666',
                        fontStyle: 'italic'
                    }}>
                        (пересдача)
                    </div>
                )}
            </div>
        );
    };

    // Получение статуса на русском с учетом опоздания
    const getStatusText = (submission: SubmissionWithDetails) => {
        const { text } = getSubmissionDisplayStatus(
            submission.status,
            submission.submitted_at,
            submission.lesson_deadline,
            submission.first_submitted_at
        );
        return text;
    };

    // Получение CSS класса для статуса
    const getStatusClass = (submission: SubmissionWithDetails) => {
        const { isLate } = getSubmissionDisplayStatus(
            submission.status,
            submission.submitted_at,
            submission.lesson_deadline,
            submission.first_submitted_at
        );

        switch (submission.status) {
            case 'submitted':
            case 'pending_review':
                return isLate ? 'admin-status admin-no' : 'admin-status admin-no';
            case 'approved':
                return 'admin-status admin-yes';
            case 'rejected':
                return 'admin-status admin-no';
            default:
                return 'admin-status';
        }
    };

    if (loading) {
        return <div className="admin-loading">Загрузка сабмитов...</div>;
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Проверка домашних заданий</h2>
                <div className="admin-stats">
                    <div className="admin-stat-card">
                        <div className="admin-stat-value">{stats.pending}</div>
                        <div className="admin-stat-label">Ожидают проверки</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-value">{stats.reviewedToday}</div>
                        <div className="admin-stat-label">Проверено сегодня</div>
                    </div>
                    <button
                        className="admin-refresh-btn"
                        onClick={loadSubmissions}
                        title="Обновить список"
                    >

                    </button>
                </div>
            </div>

            {error && (
                <div className="admin-error">
                    {error}
                </div>
            )}

            {/* Фильтры */}
            <div className="admin-filters">
                <div className="admin-filter-group">
                    <label>Статус:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="admin-input"
                    >
                        <option value="all">Все</option>
                        <option value="pending">Ожидают проверки</option>
                        <option value="approved">Принятые</option>
                        <option value="rejected">Отклоненные</option>
                        <option value="late">Поздние сдачи</option>
                    </select>
                </div>
            </div>

            {/* Таблица сабмитов */}
            <div className="admin-table">
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
                                        <div className="admin-user-card">
                                            {submission.user_photo_url && (
                                                <img
                                                    src={submission.user_photo_url}
                                                    alt="Аватар"
                                                    className="admin-avatar-sm"
                                                />
                                            )}
                                            <div className="admin-user-info">
                                                <div className="admin-user-name">
                                                    {submission.user_first_name} {submission.user_last_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{submission.lesson_name}</td>
                                    <td>{submission.stage_name}</td>
                                    <td>{formatSubmissionDate(submission)}</td>
                                    <td>
                                        <span className={getStatusClass(submission)}>
                                            {getStatusText(submission)}
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