import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

// Интерфейс для детальной информации о сабмите
interface SubmissionDetailData {
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

    // Данные пользователя
    user_first_name: string;
    user_last_name: string;
    user_photo_url?: string;
    user_total_points: number;
    user_lives_remaining: number;

    // Данные урока
    lesson_name: string;
    lesson_description?: string;
    stage_name: string;

    // Куратор
    reviewer_name?: string;
}

interface SubmissionDetailProps {
    submissionId: number;
    onBack: () => void;
    onSubmissionUpdated?: () => void;
}

const SubmissionDetail: React.FC<SubmissionDetailProps> = ({
    submissionId,
    onBack,
    onSubmissionUpdated
}) => {
    const [submission, setSubmission] = useState<SubmissionDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Форма проверки
    const [reviewForm, setReviewForm] = useState({
        status: 'approved' as 'approved' | 'rejected',
        points: 100,
        feedback: ''
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

            const { data, error: queryError } = await supabase
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
            course_stages!lessons_stage_id_fkey(name)
          ),
          reviewer:users!submissions_reviewed_by_curator_id_fkey(first_name, last_name)
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
                content_text: data.content_text,
                file_url: data.file_url,
                status: data.status as 'submitted' | 'pending_review' | 'approved' | 'rejected',
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
    }, [submissionId]);

    // Сохранение результата проверки
    const saveReview = async () => {
        if (!submission) return;

        try {
            setSaving(true);
            setError(null);

            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

            const updateData: any = {
                status: reviewForm.status,
                reviewed_at: new Date().toISOString(),
                feedback_text: reviewForm.feedback,
                points_awarded: reviewForm.status === 'approved' ? reviewForm.points : 0,
                // TODO: Получить ID текущего куратора
                reviewed_by_curator_id: null
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

            // Начисляем баллы пользователю при одобрении
            if (reviewForm.status === 'approved' && reviewForm.points > 0) {
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
                            total_points: (userData.total_points || 0) + reviewForm.points
                        })
                        .eq('id', submission.user_id);

                    if (pointsError) {
                        console.error('Ошибка начисления баллов:', pointsError);
                        // Не блокируем сохранение из-за ошибки баллов
                    }
                }
            }

            // TODO: Отправить уведомление пользователю
            console.log(`Уведомление: Сабмит ${submissionId} ${reviewForm.status === 'approved' ? 'принят' : 'отклонен'}`);

            // Обновляем локальные данные
            await loadSubmissionDetail();

            // Уведомляем родительский компонент
            if (onSubmissionUpdated) {
                onSubmissionUpdated();
            }

            alert('Результат проверки сохранен успешно!');

        } catch (err) {
            console.error('Ошибка сохранения:', err);
            setError('Произошла ошибка при сохранении результата проверки');
        } finally {
            setSaving(false);
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
                {/* Левая панель - информация о сабмите */}
                <div className="admin-card">
                    <h3>Информация о сабмите</h3>

                    {/* Данные пользователя */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4>Пользователь</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {submission.user_photo_url && (
                                <img
                                    src={submission.user_photo_url}
                                    alt="Аватар"
                                    style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                                />
                            )}
                            <div>
                                <div style={{ fontWeight: 'bold' }}>
                                    {submission.user_first_name} {submission.user_last_name}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    Баллы: {submission.user_total_points} | Жизни: {submission.user_lives_remaining}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Информация об уроке */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4>Урок</h4>
                        <div><strong>Название:</strong> {submission.lesson_name}</div>
                        <div><strong>Ступень:</strong> {submission.stage_name}</div>
                        {submission.lesson_description && (
                            <div><strong>Описание:</strong> {submission.lesson_description}</div>
                        )}
                    </div>

                    {/* Детали сдачи */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4>Детали сдачи</h4>
                        <div><strong>Дата сдачи:</strong> {formatDate(submission.submitted_at)}</div>
                        <div><strong>Статус:</strong> {getStatusText(submission.status)}</div>
                        {submission.reviewed_at && (
                            <div><strong>Дата проверки:</strong> {formatDate(submission.reviewed_at)}</div>
                        )}
                        {submission.reviewer_name && (
                            <div><strong>Куратор:</strong> {submission.reviewer_name}</div>
                        )}
                    </div>

                    {/* Текст ответа */}
                    {submission.content_text && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4>Текст ответа</h4>
                            <div
                                style={{
                                    padding: '1rem',
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '8px',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {submission.content_text}
                            </div>
                        </div>
                    )}

                    {/* Прикрепленный файл */}
                    {submission.file_url && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4>Прикрепленный файл</h4>
                            <div>
                                <a
                                    href={submission.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="admin-button"
                                    style={{ display: 'inline-block', marginTop: '0.5rem' }}
                                >
                                    📎 Открыть файл
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Текущая обратная связь (если есть) */}
                    {submission.feedback_text && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4>Обратная связь куратора</h4>
                            <div
                                style={{
                                    padding: '1rem',
                                    backgroundColor: '#f0f8ff',
                                    borderRadius: '8px',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {submission.feedback_text}
                            </div>
                        </div>
                    )}
                </div>

                {/* Правая панель - форма проверки */}
                <div className="admin-card">
                    <h3>Форма проверки</h3>

                    {error && (
                        <div className="admin-error" style={{ marginBottom: '1rem' }}>
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

                    {/* Быстрые действия */}
                    {['submitted', 'pending_review'].includes(submission.status) && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <h4>Быстрые действия</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
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
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetail; 