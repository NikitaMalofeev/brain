import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SubmissionStatus, getSubmissionDisplayStatus } from '@/lib/supabase/types';

// Типы данных для сабмитов с assignment_id
interface SubmissionWithDetails {
    id: number;
    user_id: string;
    lesson_id: number;
    assignment_id?: number; // Новое поле
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
    lesson_deadline?: string;
    // Информация о задании
    assignment_title?: string;
    assignment_order?: number;
}

interface LessonFeedback {
    id: number;
    user_id: string;
    lesson_id: number;
    feedback_text: string;
    created_at: string;
}

// Группа сдач по дню (lesson) и пользователю
interface LessonSubmissionGroup {
    user_id: string;
    user_first_name: string;
    user_last_name: string;
    user_photo_url?: string;
    lesson_id: number;
    lesson_name: string;
    stage_name: string;
    submissions: SubmissionWithDetails[];
    total_assignments: number;
    submitted_assignments: number;
    approved_assignments: number;
    lesson_feedback?: LessonFeedback;
}

interface SubmissionsManagerProps {
    onSubmissionSelect: (submissionId: number) => void;
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
    const [assignments, setAssignments] = useState<Record<number, number>>({});
    const [lessonFeedbacks, setLessonFeedbacks] = useState<Record<string, LessonFeedback>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState<string | null>(null);
    const [feedbackText, setFeedbackText] = useState<string>('');

    // Статистика
    const [stats, setStats] = useState({
        pending: 0,
        reviewedToday: 0
    });

    // Загрузка данных
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

            // Получаем текущего пользователя
            let effectiveCurrentUser = propCurrentUser;
            if (!effectiveCurrentUser) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    effectiveCurrentUser = {
                        id: user.id,
                        role: 'admin',
                        first_name: user.user_metadata?.first_name,
                        last_name: user.user_metadata?.last_name
                    };
                }
            }
            setCurrentUser(effectiveCurrentUser || null);

            // Загружаем assignments для подсчета
            const { data: assignmentsData } = await supabase
                .from('assignments')
                .select('id, lesson_id');

            const assignmentsByLesson: Record<number, number> = {};
            assignmentsData?.forEach((assignment: any) => {
                assignmentsByLesson[assignment.lesson_id] =
                    (assignmentsByLesson[assignment.lesson_id] || 0) + 1;
            });
            setAssignments(assignmentsByLesson);

            // Строим запрос для submissions с assignment_id
            let query = supabase
                .from('submissions')
                .select(`
                    *,
                    users!submissions_user_id_fkey (first_name, last_name, photo_url),
                    lessons!submissions_lesson_id_fkey (
                        name,
                        deadline_at,
                        course_stages!lessons_stage_id_fkey (name)
                    ),
                    assignments!submissions_assignment_id_fkey (id, title, order_num),
                    reviewer:users!submissions_reviewed_by_curator_id_fkey(first_name, last_name)
                `);

            // Фильтр для кураторов
            if (effectiveCurrentUser?.role === 'curator') {
                const { data: curatorStudents } = await supabase
                    .from('user_curator')
                    .select('student_id')
                    .eq('curator_id', effectiveCurrentUser.id);

                const studentIds = curatorStudents?.map(item => item.student_id) || [];
                if (studentIds.length === 0) {
                    setSubmissions([]);
                    setStats({ pending: 0, reviewedToday: 0 });
                    return;
                }
                query = query.in('user_id', studentIds);
            }

            const { data, error: submissionsError } = await query.order('submitted_at', { ascending: false });

            if (submissionsError) {
                console.error('Ошибка загрузки сабмитов:', submissionsError);
                setError(`Ошибка загрузки данных: ${submissionsError.message}`);
                return;
            }

            // Трансформация данных
            const transformedSubmissions: SubmissionWithDetails[] = (data || []).map((submission: any) => ({
                id: submission.id,
                user_id: submission.user_id,
                lesson_id: submission.lesson_id,
                assignment_id: submission.assignment_id,
                submitted_at: submission.submitted_at,
                first_submitted_at: submission.first_submitted_at,
                content_text: submission.content_text,
                file_url: submission.file_url,
                status: submission.status as SubmissionStatus,
                reviewed_by_curator_id: submission.reviewed_by_curator_id,
                reviewed_at: submission.reviewed_at,
                feedback_text: submission.feedback_text,
                points_awarded: submission.points_awarded,
                user_first_name: submission.users?.first_name || 'Неизвестно',
                user_last_name: submission.users?.last_name || '',
                user_photo_url: submission.users?.photo_url,
                lesson_name: submission.lessons?.name || 'Неизвестный урок',
                lesson_deadline: submission.lessons?.deadline_at,
                stage_name: submission.lessons?.course_stages?.name || 'Неизвестная ступень',
                reviewer_name: submission.reviewer?.first_name && submission.reviewer?.last_name
                    ? `${submission.reviewer.first_name} ${submission.reviewer.last_name}`
                    : submission.reviewer?.first_name,
                assignment_title: submission.assignments?.title,
                assignment_order: submission.assignments?.order_num
            }));

            setSubmissions(transformedSubmissions);

            // Загружаем lesson_feedback для всех уроков
            const lessonIds = Array.from(new Set(transformedSubmissions.map(s => s.lesson_id)));
            const userIds = Array.from(new Set(transformedSubmissions.map(s => s.user_id)));

            if (lessonIds.length > 0 && userIds.length > 0) {
                const { data: feedbackData } = await supabase
                    .from('lesson_feedback')
                    .select('*')
                    .in('lesson_id', lessonIds)
                    .in('user_id', userIds);

                const feedbackMap: Record<string, LessonFeedback> = {};
                feedbackData?.forEach((feedback: any) => {
                    const key = `${feedback.user_id}-${feedback.lesson_id}`;
                    feedbackMap[key] = feedback;
                });
                setLessonFeedbacks(feedbackMap);
            }

            // Статистика
            const pendingCount = transformedSubmissions.filter(s =>
                ['submitted', 'pending_review'].includes(s.status)
            ).length;
            const today = new Date().toISOString().split('T')[0];
            const reviewedTodayCount = transformedSubmissions.filter(s =>
                s.reviewed_at && s.reviewed_at.startsWith(today)
            ).length;

            setStats({ pending: pendingCount, reviewedToday: reviewedTodayCount });

        } catch (err) {
            console.error('Неожиданная ошибка:', err);
            setError('Произошла неожиданная ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [propCurrentUser]);

    // Группировка submissions по lesson + user
    const groupedSubmissions = useMemo(() => {
        const groups: Record<string, LessonSubmissionGroup> = {};

        submissions.forEach(submission => {
            const key = `${submission.user_id}-${submission.lesson_id}`;

            if (!groups[key]) {
                const totalAssignments = assignments[submission.lesson_id] || 0;
                groups[key] = {
                    user_id: submission.user_id,
                    user_first_name: submission.user_first_name,
                    user_last_name: submission.user_last_name,
                    user_photo_url: submission.user_photo_url,
                    lesson_id: submission.lesson_id,
                    lesson_name: submission.lesson_name,
                    stage_name: submission.stage_name,
                    submissions: [],
                    total_assignments: totalAssignments,
                    submitted_assignments: 0,
                    approved_assignments: 0,
                    lesson_feedback: lessonFeedbacks[key]
                };
            }

            groups[key].submissions.push(submission);

            // Подсчет submitted и approved
            if (['pending_review', 'approved', 'rejected'].includes(submission.status)) {
                groups[key].submitted_assignments++;
            }
            if (submission.status === 'approved') {
                groups[key].approved_assignments++;
            }
        });

        return Object.values(groups);
    }, [submissions, assignments, lessonFeedbacks]);

    // Фильтрация групп
    const filteredGroups = useMemo(() => {
        return groupedSubmissions.filter(group => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'pending') {
                // Есть хотя бы один submitted/pending_review
                return group.submissions.some(s => ['submitted', 'pending_review'].includes(s.status));
            }
            if (statusFilter === 'completed') {
                // Все задания сданы и проверены
                return group.submitted_assignments === group.total_assignments &&
                       group.submissions.every(s => ['approved', 'rejected'].includes(s.status));
            }
            return true;
        });
    }, [groupedSubmissions, statusFilter]);

    // Действия с submissions
    const handleQuickAction = async (submissionId: number, action: 'approve' | 'reject', points?: number) => {
        try {
            if (!supabase) return;

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

            // Начисление баллов
            if (action === 'approve' && points) {
                const submission = submissions.find(s => s.id === submissionId);
                if (submission) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('total_points')
                        .eq('id', submission.user_id)
                        .single();

                    if (userData) {
                        await supabase
                            .from('users')
                            .update({ total_points: (userData.total_points || 0) + points })
                            .eq('id', submission.user_id);
                    }
                }
            }

            await loadData();
        } catch (err) {
            console.error('Ошибка быстрого действия:', err);
            setError('Произошла ошибка при обработке действия');
        }
    };

    // Сохранение обратной связи по дню
    const handleSaveLessonFeedback = async (userId: string, lessonId: number) => {
        try {
            if (!feedbackText.trim()) {
                alert('Введите текст обратной связи');
                return;
            }

            const key = `${userId}-${lessonId}`;

            if (lessonFeedbacks[key]) {
                // Обновление существующего feedback
                const { error } = await supabase
                    .from('lesson_feedback')
                    .update({
                        feedback_text: feedbackText,
                        curator_id: currentUser?.id || null
                    })
                    .eq('id', lessonFeedbacks[key].id);

                if (error) throw error;
            } else {
                // Создание нового feedback
                const { error } = await supabase
                    .from('lesson_feedback')
                    .insert({
                        user_id: userId,
                        lesson_id: lessonId,
                        feedback_text: feedbackText,
                        curator_id: currentUser?.id || null
                    });

                if (error) throw error;
            }

            setFeedbackModalOpen(null);
            setFeedbackText('');
            await loadData();
        } catch (err) {
            console.error('Ошибка сохранения обратной связи:', err);
            alert('Ошибка сохранения обратной связи');
        }
    };

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
                        onClick={loadData}
                        title="Обновить список"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {error && <div className="admin-error">{error}</div>}

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
                        <option value="completed">Полностью сданные</option>
                    </select>
                </div>
            </div>

            {/* Группы по дням */}
            <div className="submissions-groups" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredGroups.length === 0 ? (
                    <div className="empty-table">
                        {statusFilter === 'pending'
                            ? 'Нет сабмитов, ожидающих проверки'
                            : 'Сабмиты не найдены'
                        }
                    </div>
                ) : (
                    filteredGroups.map((group) => {
                        const key = `${group.user_id}-${group.lesson_id}`;
                        const allSubmitted = group.submitted_assignments === group.total_assignments;

                        return (
                            <div key={key} style={{
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '16px',
                                backgroundColor: '#fff'
                            }}>
                                {/* Заголовок группы */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    paddingBottom: '12px',
                                    borderBottom: '1px solid #e0e0e0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {group.user_photo_url && (
                                            <img
                                                src={group.user_photo_url}
                                                alt="Аватар"
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%'
                                                }}
                                            />
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>
                                                {group.user_first_name} {group.user_last_name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                {group.lesson_name} • {group.stage_name}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        Сдал {group.submitted_assignments} из {group.total_assignments}
                                        {group.approved_assignments > 0 && ` (✅ ${group.approved_assignments})`}
                                    </div>
                                </div>

                                {/* Список заданий */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {group.submissions
                                        .sort((a, b) => (a.assignment_order || 0) - (b.assignment_order || 0))
                                        .map((submission) => (
                                            <div key={submission.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px',
                                                backgroundColor: '#f9f9f9',
                                                borderRadius: '4px'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontWeight: '500' }}>
                                                        {submission.assignment_title || `Задание ${submission.assignment_id}`}
                                                    </span>
                                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                                                        {formatDate(submission.submitted_at)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={
                                                        submission.status === 'approved' ? 'admin-status admin-yes' :
                                                        submission.status === 'rejected' ? 'admin-status admin-no' :
                                                        'admin-status'
                                                    }>
                                                        {submission.status === 'approved' && '✅ Принято'}
                                                        {submission.status === 'rejected' && '❌ Отклонено'}
                                                        {['submitted', 'pending_review'].includes(submission.status) && '⏳ На проверке'}
                                                    </span>

                                                    <button
                                                        className="action-btn edit-btn"
                                                        onClick={() => onSubmissionSelect(submission.id)}
                                                        title="Просмотреть"
                                                    >
                                                        👁️
                                                    </button>

                                                    {['submitted', 'pending_review'].includes(submission.status) && (
                                                        <>
                                                            <button
                                                                className="action-btn admin-yes"
                                                                onClick={() => handleQuickAction(submission.id, 'approve', 100)}
                                                                title="Принять (100 баллов)"
                                                            >
                                                                ✅
                                                            </button>
                                                            <button
                                                                className="action-btn admin-no"
                                                                onClick={() => handleQuickAction(submission.id, 'reject')}
                                                                title="Отклонить"
                                                            >
                                                                ❌
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {/* Обратная связь по дню */}
                                {allSubmitted && (
                                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                                        {group.lesson_feedback ? (
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                                                    Обратная связь по дню:
                                                </div>
                                                <div style={{
                                                    padding: '12px',
                                                    backgroundColor: '#f0f0f0',
                                                    borderRadius: '4px',
                                                    marginBottom: '8px'
                                                }}>
                                                    {group.lesson_feedback.feedback_text}
                                                </div>
                                                <button
                                                    className="action-btn edit-btn"
                                                    onClick={() => {
                                                        setFeedbackModalOpen(key);
                                                        setFeedbackText(group.lesson_feedback?.feedback_text || '');
                                                    }}
                                                >
                                                    Редактировать обратную связь
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => {
                                                    setFeedbackModalOpen(key);
                                                    setFeedbackText('');
                                                }}
                                            >
                                                Оставить обратную связь по дню
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Модальное окно для feedback */}
                                {feedbackModalOpen === key && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '16px',
                                        backgroundColor: '#f9f9f9',
                                        borderRadius: '8px'
                                    }}>
                                        <h4>Обратная связь по дню</h4>
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            placeholder="Напишите общую обратную связь по всем заданиям дня..."
                                            rows={5}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #ccc',
                                                fontSize: '14px',
                                                marginBottom: '8px'
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="action-btn admin-yes"
                                                onClick={() => handleSaveLessonFeedback(group.user_id, group.lesson_id)}
                                            >
                                                Сохранить
                                            </button>
                                            <button
                                                className="action-btn"
                                                onClick={() => {
                                                    setFeedbackModalOpen(null);
                                                    setFeedbackText('');
                                                }}
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default SubmissionsManager;
