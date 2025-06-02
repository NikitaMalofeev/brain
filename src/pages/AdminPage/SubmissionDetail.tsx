import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SubmissionStatus, getSubmissionDisplayStatus } from '@/lib/supabase/types';

// Интерфейс для детальной информации о сабмите
interface SubmissionDetailData {
    id: number;
    user_id: string;
    lesson_id: number;
    submitted_at: string;
    first_submitted_at?: string; // Время первоначальной сдачи
    content_text?: string;
    file_url?: string;
    status: SubmissionStatus;
    reviewed_by_curator_id?: string;
    reviewed_at?: string;
    feedback_text?: string;
    points_awarded: number;

    // Данные пользователя
    user_first_name: string;
    user_last_name: string;
    user_photo_url?: string;
    user_total_points: number;
    user_lives_remaining: number;

    // Данные урока
    lesson_name: string;
    lesson_description?: string;
    lesson_deadline?: string;
    stage_name: string;

    // Куратор
    reviewer_name?: string;
}

interface SubmissionDetailProps {
    submissionId: number;
    onBack: () => void;
    onSubmissionUpdated?: () => void;
    // Добавляем информацию о текущем пользователе для админки
    currentUser?: {
        id: string;
        role: string;
        first_name?: string;
        last_name?: string;
    } | null;
}

const SubmissionDetail: React.FC<SubmissionDetailProps> = ({
    submissionId,
    onBack,
    onSubmissionUpdated,
    currentUser: propCurrentUser
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Данные submission и пользователя
    const [submission, setSubmission] = useState<SubmissionDetailData | null>(null);
    const [currentUser, setCurrentUser] = useState<{
        id: string;
        role: string;
        first_name?: string;
        last_name?: string;
    } | null>(null);

    const [showDecisionChange, setShowDecisionChange] = useState(false);

    // Форма для изменения решения
    const [reviewForm, setReviewForm] = useState({
        status: '' as SubmissionStatus,
        feedback: '',
        points: 0
    });

    // Загрузка детальной информации о сабмите
    const loadSubmissionDetail = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

            // Используем переданного пользователя из props (для админки) или получаем через Supabase Auth
            let effectiveCurrentUser = propCurrentUser;

            if (!effectiveCurrentUser) {
                // Загрузка данных текущего пользователя через Supabase Auth (для обычных пользователей)
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setError('Пользователь не авторизован');
                    return;
                }

                // Получаем данные пользователя из таблицы users
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, role')
                    .eq('telegram_id', user.id)
                    .single();

                if (userError || !userData) {
                    console.error('Ошибка получения данных пользователя:', userError);
                    setError('Ошибка загрузки данных пользователя');
                    return;
                }

                effectiveCurrentUser = { id: userData.id, role: userData.role };
            }

            setCurrentUser(effectiveCurrentUser);

            const { data, error: queryError } = await supabase
                .from('submissions')
                .select(`
                    *,
                    users!submissions_user_id_fkey(
                        first_name, 
                        last_name, 
                        photo_url, 
                        total_points, 
                        lives_remaining
                    ),
                    lessons!submissions_lesson_id_fkey(
                        name,
                        description,
                        deadline_at,
                        course_stages!lessons_stage_id_fkey(name)
                    ),
                    reviewer:users!submissions_reviewed_by_curator_id_fkey(
                        first_name, 
                        last_name
                    )
                `)
                .eq('id', submissionId)
                .single();

            if (queryError) {
                console.error('Ошибка загрузки сабмита:', queryError);
                setError(`Ошибка загрузки: ${queryError.message}`);
                return;
            }

            if (!data) {
                setError('Сабмит не найден');
                return;
            }

            // Трансформируем данные
            const submissionDetail: SubmissionDetailData = {
                id: data.id,
                user_id: data.user_id,
                lesson_id: data.lesson_id,
                submitted_at: data.submitted_at,
                first_submitted_at: data.first_submitted_at,
                content_text: data.content_text,
                file_url: data.file_url,
                status: data.status as SubmissionStatus,
                reviewed_by_curator_id: data.reviewed_by_curator_id,
                reviewed_at: data.reviewed_at,
                feedback_text: data.feedback_text,
                points_awarded: data.points_awarded,

                user_first_name: (data.users as any)?.first_name || 'Неизвестно',
                user_last_name: (data.users as any)?.last_name || '',
                user_photo_url: (data.users as any)?.photo_url,
                user_total_points: (data.users as any)?.total_points || 0,
                user_lives_remaining: (data.users as any)?.lives_remaining || 0,

                lesson_name: (data.lessons as any)?.name || 'Неизвестный урок',
                lesson_description: (data.lessons as any)?.description,
                lesson_deadline: (data.lessons as any)?.deadline_at,
                stage_name: (data.lessons as any)?.course_stages?.name || 'Неизвестная ступень',

                reviewer_name: (data.reviewer as any)?.first_name || undefined
            };

            setSubmission(submissionDetail);

            // Инициализируем форму проверки текущими значениями
            if (['submitted', 'pending_review'].includes(submissionDetail.status)) {
                setReviewForm({
                    status: 'approved',
                    points: 100,
                    feedback: ''
                });
            } else {
                setReviewForm({
                    status: submissionDetail.status as 'approved' | 'rejected',
                    points: submissionDetail.points_awarded || 0,
                    feedback: submissionDetail.feedback_text || ''
                });
            }

        } catch (err) {
            console.error('Неожиданная ошибка:', err);
            setError('Произошла неожиданная ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSubmissionDetail();
    }, [submissionId, propCurrentUser]);

    // Сохранение проверки (работает и для первичной проверки, и для изменения решения)
    const saveReview = async () => {
        if (!submission) {
            setError('Данные о сдаче не загружены');
            return;
        }

        // Проверяем обязательные поля
        if (!reviewForm.feedback.trim()) {
            setError('Обратная связь обязательна');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

            const oldStatus = submission.status;
            const oldPoints = submission.points_awarded;
            const newStatus = reviewForm.status;
            const newPoints = newStatus === 'approved' ? reviewForm.points : 0;

            // Обновляем сабмит
            const updateData: any = {
                status: newStatus,
                reviewed_at: new Date().toISOString(),
                feedback_text: reviewForm.feedback,
                points_awarded: newPoints,
                reviewed_by_curator_id: currentUser?.id || null
            };

            const { error: updateError } = await supabase
                .from('submissions')
                .update(updateData)
                .eq('id', submissionId);

            if (updateError) {
                console.error('Ошибка обновления сабмита:', updateError);
                setError(`Ошибка обновления: ${updateError.message}`);
                return;
            }

            // Пересчитываем баллы пользователя при изменении
            let pointsDifference = 0;

            if (oldStatus === 'approved' && newStatus === 'rejected') {
                // Списываем ранее начисленные баллы
                pointsDifference = -oldPoints;
            } else if (oldStatus === 'rejected' && newStatus === 'approved') {
                // Начисляем новые баллы
                pointsDifference = newPoints;
            } else if (oldStatus === 'approved' && newStatus === 'approved') {
                // Корректируем разницу в баллах
                pointsDifference = newPoints - oldPoints;
            } else if ((oldStatus === 'submitted' || oldStatus === 'pending_review') && newStatus === 'approved') {
                // Первичное одобрение
                pointsDifference = newPoints;
            }

            if (pointsDifference !== 0) {
                // Получаем текущие баллы пользователя
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('total_points')
                    .eq('id', submission.user_id)
                    .single();

                if (!userError && userData) {
                    // Обновляем баллы с учетом разницы
                    const newTotalPoints = Math.max(0, (userData.total_points || 0) + pointsDifference);

                    const { error: pointsError } = await supabase
                        .from('users')
                        .update({
                            total_points: newTotalPoints
                        })
                        .eq('id', submission.user_id);

                    if (pointsError) {
                        console.error('Ошибка пересчета баллов:', pointsError);
                        setError('Решение сохранено, но произошла ошибка при пересчете баллов');
                    }
                }
            }

            // Если это было изменение решения - скрываем форму
            if (showDecisionChange) {
                setShowDecisionChange(false);
            }

            // Обновляем локальные данные
            await loadSubmissionDetail();

            // Уведомляем родительский компонент
            if (onSubmissionUpdated) {
                onSubmissionUpdated();
            }

            // Показываем соответствующее уведомление
            if (showDecisionChange) {
                if (oldStatus !== newStatus) {
                    alert('Решение успешно изменено!');
                } else if (pointsDifference !== 0) {
                    alert(`Баллы успешно скорректированы! Изменение: ${pointsDifference > 0 ? '+' : ''}${pointsDifference} баллов`);
                } else {
                    alert('Изменения сохранены!');
                }
            } else {
                alert('Проверка сохранена!');
            }

        } catch (err) {
            console.error('Ошибка сохранения проверки:', err);
            setError('Произошла ошибка при сохранении проверки');
        } finally {
            setSaving(false);
        }
    };

    // Проверка прав доступа для изменения решения
    const canEditDecision = () => {
        if (!currentUser || !submission) return false;

        // Админы могут редактировать любые сабмиты
        if (currentUser.role === 'admin') return true;

        // Кураторы могут редактировать только свои сабмиты
        if (currentUser.role === 'curator' && submission.reviewed_by_curator_id === currentUser.id) {
            return true;
        }

        return false;
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

    // Получение статуса на русском с учетом опоздания
    const getStatusText = () => {
        if (!submission) return '';

        const { text } = getSubmissionDisplayStatus(
            submission.status,
            submission.submitted_at,
            submission.lesson_deadline,
            submission.first_submitted_at
        );
        return text;
    };

    if (loading) {
        return <div className="admin-loading">Загрузка детальной информации...</div>;
    }

    if (error || !submission) {
        return (
            <div className="admin-section">
                <div className="section-header">
                    <h2>Ошибка загрузки</h2>
                    <button className="admin-button" onClick={onBack}>
                        ← Назад к списку
                    </button>
                </div>
                <div className="admin-error">
                    {error || 'Сабмит не найден'}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Проверка домашнего задания</h2>
                <button className="admin-button" onClick={onBack}>
                    ← Назад к списку
                </button>
            </div>

            <div className="admin-grid">
                {/* Левая панель - информация о сабмите */}
                <div className="admin-card">
                    <h3>Информация о сабмите</h3>

                    {/* Данные пользователя */}
                    <div className="admin-info-card">
                        <h4>Пользователь</h4>
                        <div className="admin-user-card">
                            {submission.user_photo_url && (
                                <img
                                    src={submission.user_photo_url}
                                    alt="Аватар"
                                    className="admin-user-avatar"
                                />
                            )}
                            <div className="admin-user-info">
                                <div className="admin-user-name">
                                    {submission.user_first_name} {submission.user_last_name}
                                </div>
                                <div className="admin-user-meta">
                                    Баллы: {submission.user_total_points} | Жизни: {submission.user_lives_remaining}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Информация об уроке */}
                    <div className="admin-info-card">
                        <h4>Урок</h4>
                        <div><strong>Название:</strong> {submission.lesson_name}</div>
                        <div><strong>Ступень:</strong> {submission.stage_name}</div>
                        {submission.lesson_description && (
                            <div><strong>Описание:</strong> {submission.lesson_description}</div>
                        )}
                    </div>

                    {/* Время сдачи */}
                    <div className="admin-info-card">
                        <h4>Время сдачи</h4>

                        {/* Основное время сдачи */}
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Текущая сдача:</strong> {formatDate(submission.submitted_at)}
                        </div>

                        {/* Время первой сдачи (если есть пересдача) */}
                        {submission.first_submitted_at && submission.first_submitted_at !== submission.submitted_at && (
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Первая сдача:</strong> {formatDate(submission.first_submitted_at)}
                                <div style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    fontStyle: 'italic',
                                    marginTop: '2px'
                                }}>
                                    (пересдача задания)
                                </div>
                            </div>
                        )}

                        {/* Дедлайн задания для контекста */}
                        {submission.lesson_deadline && (
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Дедлайн:</strong> {formatDate(submission.lesson_deadline)}
                                <div style={{
                                    fontSize: '12px',
                                    color: '#888',
                                    fontStyle: 'italic',
                                    marginTop: '2px'
                                }}>
                                    (время окончания приема заданий)
                                </div>
                            </div>
                        )}

                        {/* Статус с учетом опоздания */}
                        <div className="admin-status">
                            {getStatusText()}
                        </div>
                    </div>

                    {/* Текст ответа */}
                    {submission.content_text && (
                        <div className="admin-info-card">
                            <h4>Текст ответа</h4>
                            <div className="content-text">
                                {submission.content_text}
                            </div>
                        </div>
                    )}

                    {/* Прикрепленный файл */}
                    {submission.file_url && (
                        <div className="admin-info-card">
                            <h4>Прикрепленный файл</h4>
                            <div className="file-attachment">
                                <div className="file-attachment-icon">📎</div>
                                <div className="file-attachment-info">
                                    <div className="file-attachment-name">Прикрепленный файл</div>
                                    <div className="file-attachment-meta">Нажмите чтобы открыть</div>
                                </div>
                                <a
                                    href={submission.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="admin-button"
                                >
                                    Открыть
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Текущая обратная связь (если есть) */}
                    {submission.feedback_text && (
                        <div className="admin-info-card">
                            <h4>Обратная связь</h4>
                            <div className="content-text">
                                {submission.feedback_text}
                            </div>
                        </div>
                    )}
                </div>

                {/* Правая панель - форма проверки */}
                <div className="admin-card">
                    {/* Для новых сабмитов (submitted/pending_review/late) */}
                    {['submitted', 'pending_review'].includes(submission.status) && (
                        <>
                            <h3>Форма проверки</h3>

                            {error && (
                                <div className="admin-error">
                                    {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Результат проверки</label>
                                <select
                                    value={reviewForm.status}
                                    onChange={(e) => setReviewForm({
                                        ...reviewForm,
                                        status: e.target.value as 'approved' | 'rejected'
                                    })}
                                    className="admin-input"
                                >
                                    <option value="approved">✅ Принято</option>
                                    <option value="rejected">❌ Отклонено</option>
                                </select>
                            </div>

                            {reviewForm.status === 'approved' && (
                                <div className="form-group">
                                    <label>Количество баллов (0-100)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={reviewForm.points}
                                        onChange={(e) => setReviewForm({
                                            ...reviewForm,
                                            points: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                                        })}
                                        className="admin-input"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Комментарий для пользователя</label>
                                <textarea
                                    value={reviewForm.feedback}
                                    onChange={(e) => setReviewForm({
                                        ...reviewForm,
                                        feedback: e.target.value
                                    })}
                                    className="admin-input"
                                    rows={6}
                                    placeholder="Оставьте комментарий для пользователя..."
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    className="admin-button"
                                    onClick={saveReview}
                                    disabled={saving}
                                    style={{ width: '100%' }}
                                >
                                    {saving ? 'Сохранение...' : 'Сохранить результат'}
                                </button>
                            </div>

                            {/* Быстрые действия - только при первичной проверке */}
                            {!showDecisionChange && (
                                <div className="quick-actions">
                                    <h4>Быстрые действия</h4>
                                    <div className="quick-actions-buttons">
                                        <button
                                            className="admin-button admin-yes"
                                            onClick={() => {
                                                setReviewForm({ status: 'approved', points: 100, feedback: 'Отличная работа!' });
                                            }}
                                        >
                                            ✅ Принять с 100 баллами
                                        </button>
                                        <button
                                            className="admin-button admin-no"
                                            onClick={() => {
                                                setReviewForm({ status: 'rejected', points: 0, feedback: 'Работа требует доработки.' });
                                            }}
                                        >
                                            ❌ Отклонить
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Для уже проверенных сабмитов (approved/rejected) */}
                    {['approved', 'rejected'].includes(submission.status) && (
                        <>
                            <h3>Результат проверки</h3>

                            {/* Отображение текущего результата */}
                            <div className={`review-result ${submission.status}`}>
                                <div className="review-result-header">
                                    <span className="emoji">
                                        {submission.status === 'approved' ? '✅' : '❌'}
                                    </span>
                                    <span>
                                        {submission.status === 'approved' ? 'Принято' : 'Отклонено'}
                                    </span>
                                </div>
                                <div className="review-result-info">
                                    <span><strong>Баллы:</strong> {submission.points_awarded}</span>
                                    {submission.reviewed_at && (
                                        <span><strong>Дата проверки:</strong> {formatDate(submission.reviewed_at)}</span>
                                    )}
                                    {submission.reviewer_name && (
                                        <span><strong>Куратор:</strong> {submission.reviewer_name}</span>
                                    )}
                                </div>
                            </div>

                            {/* Кнопка изменения решения */}
                            {canEditDecision() && (
                                <button
                                    className="admin-button"
                                    onClick={() => {
                                        setShowDecisionChange(true);
                                        // Инициализируем форму текущими значениями для корректировки
                                        setReviewForm({
                                            status: submission.status as 'approved' | 'rejected',
                                            points: submission.points_awarded || 0,
                                            feedback: ''
                                        });
                                    }}
                                    style={{ width: '100%', marginBottom: '1rem' }}
                                >
                                    🔄 Изменить решение
                                </button>
                            )}

                            {/* Форма изменения решения */}
                            {showDecisionChange && (
                                <>
                                    {error && (
                                        <div className="admin-error">
                                            {error}
                                        </div>
                                    )}

                                    <div className="admin-warning-block">
                                        <div className="admin-warning-block-header">
                                            <span>⚠️</span>
                                            <span>Предупреждение</span>
                                        </div>
                                        <div className="admin-warning-block-content">
                                            Баллы пользователя будут автоматически пересчитаны.
                                            Можно изменить статус или скорректировать количество баллов.
                                            Пользователь получит уведомление об изменении.
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Новое решение</label>
                                        <select
                                            value={reviewForm.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value as 'approved' | 'rejected';
                                                setReviewForm({
                                                    ...reviewForm,
                                                    status: newStatus,
                                                    points: newStatus === 'approved'
                                                        ? (submission.status === 'approved' ? reviewForm.points : 100)
                                                        : 0
                                                });
                                            }}
                                            className="admin-input"
                                        >
                                            <option value="approved">✅ Принято</option>
                                            <option value="rejected">❌ Отклонено</option>
                                        </select>
                                    </div>

                                    {reviewForm.status === 'approved' && (
                                        <div className="form-group">
                                            <label>Количество баллов (0-100)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={reviewForm.points}
                                                onChange={(e) => setReviewForm({
                                                    ...reviewForm,
                                                    points: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                                                })}
                                                className="admin-input"
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Новый комментарий (опционально)</label>
                                        <textarea
                                            value={reviewForm.feedback}
                                            onChange={(e) => setReviewForm({
                                                ...reviewForm,
                                                feedback: e.target.value
                                            })}
                                            className="admin-input"
                                            rows={4}
                                            placeholder="Оставьте пустым чтобы сохранить старый комментарий..."
                                        />
                                        <small>
                                            Если поле пустое - останется предыдущий комментарий
                                        </small>
                                    </div>

                                    <div className="form-actions">
                                        <button
                                            className="admin-button"
                                            onClick={saveReview}
                                            disabled={saving || !reviewForm.feedback.trim()}
                                            style={{ flex: 1 }}
                                        >
                                            {saving ? 'Сохранение...' : 'Сохранить изменения'}
                                        </button>
                                        <button
                                            className="admin-button"
                                            onClick={() => {
                                                setShowDecisionChange(false);
                                                setError(null);
                                            }}
                                            disabled={saving}
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#f5f5f5',
                                                color: '#333'
                                            }}
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetail; 