import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SubmissionStatus, getSubmissionDisplayStatus } from '@/lib/supabase/types';
import {
    Card,
    Button,
    Select,
    Tag,
    Avatar,
    Space,
    Spin,
    Alert,
    Modal,
    Input,
    InputNumber,
    Typography,
    Statistic,
    Row,
    Col,
    Collapse,
    Empty,
    Tooltip,
    Badge,
    Divider,
    message
} from 'antd';
import {
    ReloadOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    EditOutlined,
    CheckOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    MessageOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// Типы данных для потоков
interface Stream {
    id: string;
    name: string;
}

// Типы данных для сабмитов с assignment_id
interface SubmissionWithDetails {
    id: number;
    user_id: string;
    lesson_id: number;
    assignment_id?: number;
    submitted_at: string;
    first_submitted_at?: string;
    content_text?: string;
    file_url?: string;
    status: SubmissionStatus;
    reviewed_by_curator_id?: string;
    reviewed_at?: string;
    feedback_text?: string;
    points_awarded: number;
    user_first_name: string;
    user_last_name: string;
    user_photo_url?: string;
    lesson_name: string;
    stage_name: string;
    stream_id?: string;
    reviewer_name?: string;
    lesson_deadline?: string;
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

interface LessonSubmissionGroup {
    user_id: string;
    user_first_name: string;
    user_last_name: string;
    user_photo_url?: string;
    lesson_id: number;
    lesson_name: string;
    stage_name: string;
    stream_id?: string;
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
    const [streamFilter, setStreamFilter] = useState<string>('all');
    const [streams, setStreams] = useState<Stream[]>([]);
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState<string | null>(null);
    const [feedbackText, setFeedbackText] = useState<string>('');
    const [feedbackModalGroup, setFeedbackModalGroup] = useState<LessonSubmissionGroup | null>(null);
    const [lessonAssignments, setLessonAssignments] = useState<Record<number, any[]>>({});

    const [manualApproveModal, setManualApproveModal] = useState<{
        userId: string;
        lessonId: number;
        assignmentId: number;
        assignmentTitle: string;
    } | null>(null);
    const [manualApprovePoints, setManualApprovePoints] = useState<number>(100);

    const [stats, setStats] = useState({
        pending: 0,
        reviewedToday: 0
    });

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError('Supabase не инициализирован');
                return;
            }

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

            // Загружаем список потоков
            const { data: streamsData } = await supabase
                .from('streams')
                .select('id, name')
                .order('start_date', { ascending: false });

            setStreams(streamsData || []);

            const { data: assignmentsData } = await supabase
                .from('assignments')
                .select('id, lesson_id, title, order_num');

            const assignmentsByLesson: Record<number, number> = {};
            const assignmentsDetailsByLesson: Record<number, any[]> = {};
            assignmentsData?.forEach((assignment: any) => {
                assignmentsByLesson[assignment.lesson_id] =
                    (assignmentsByLesson[assignment.lesson_id] || 0) + 1;

                if (!assignmentsDetailsByLesson[assignment.lesson_id]) {
                    assignmentsDetailsByLesson[assignment.lesson_id] = [];
                }
                assignmentsDetailsByLesson[assignment.lesson_id].push(assignment);
            });
            setAssignments(assignmentsByLesson);
            setLessonAssignments(assignmentsDetailsByLesson);

            let query = supabase
                .from('submissions')
                .select(`
                    *,
                    users!submissions_user_id_fkey (first_name, last_name, photo_url),
                    lessons!submissions_lesson_id_fkey (
                        name,
                        deadline_at,
                        stream_modules (name, stream_id)
                    ),
                    assignments!submissions_assignment_id_fkey (id, title, order_num),
                    reviewer:users!submissions_reviewed_by_curator_id_fkey(first_name, last_name)
                `);

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
                setError(`Ошибка загрузки данных: ${submissionsError.message}`);
                return;
            }

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
                stage_name: submission.lessons?.stream_modules?.name || 'Неизвестный модуль',
                stream_id: submission.lessons?.stream_modules?.stream_id,
                reviewer_name: submission.reviewer?.first_name && submission.reviewer?.last_name
                    ? `${submission.reviewer.first_name} ${submission.reviewer.last_name}`
                    : submission.reviewer?.first_name,
                assignment_title: submission.assignments?.title,
                assignment_order: submission.assignments?.order_num
            }));

            setSubmissions(transformedSubmissions);

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

            const pendingCount = transformedSubmissions.filter(s =>
                ['submitted', 'pending_review'].includes(s.status)
            ).length;
            const today = new Date().toISOString().split('T')[0];
            const reviewedTodayCount = transformedSubmissions.filter(s =>
                s.reviewed_at && s.reviewed_at.startsWith(today)
            ).length;

            setStats({ pending: pendingCount, reviewedToday: reviewedTodayCount });

        } catch (err) {
            setError('Произошла неожиданная ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [propCurrentUser]);

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
                    stream_id: submission.stream_id,
                    submissions: [],
                    total_assignments: totalAssignments,
                    submitted_assignments: 0,
                    approved_assignments: 0,
                    lesson_feedback: lessonFeedbacks[key]
                };
            }

            groups[key].submissions.push(submission);

            if (submission.assignment_id) {
                if (['pending_review', 'approved', 'rejected'].includes(submission.status)) {
                    groups[key].submitted_assignments++;
                }
                if (submission.status === 'approved') {
                    groups[key].approved_assignments++;
                }
            }
        });

        return Object.values(groups);
    }, [submissions, assignments, lessonFeedbacks]);

    const filteredGroups = useMemo(() => {
        return groupedSubmissions.filter(group => {
            // Фильтр по потоку
            if (streamFilter !== 'all' && group.stream_id !== streamFilter) {
                return false;
            }

            // Фильтр по статусу
            if (statusFilter === 'all') return true;
            if (statusFilter === 'pending') {
                return group.submissions.some(s => ['submitted', 'pending_review'].includes(s.status));
            }
            if (statusFilter === 'completed') {
                return group.submitted_assignments === group.total_assignments &&
                       group.submissions.every(s => ['approved', 'rejected'].includes(s.status));
            }
            return true;
        });
    }, [groupedSubmissions, statusFilter, streamFilter]);

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
                message.error(`Ошибка: ${error.message}`);
                return;
            }

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

            message.success(action === 'approve' ? 'Задание принято' : 'Задание отклонено');
            await loadData();
        } catch (err) {
            message.error('Произошла ошибка при обработке действия');
        }
    };

    const handleApproveAllAndFeedback = async () => {
        if (!feedbackModalGroup || !supabase) return;

        try {
            if (!feedbackText.trim()) {
                message.warning('Введите текст обратной связи');
                return;
            }

            const { user_id: userId, lesson_id: lessonId, submissions } = feedbackModalGroup;
            const key = `${userId}-${lessonId}`;
            const now = new Date().toISOString();

            // 1. Принять все непроверенные задания
            const pendingSubmissions = submissions.filter(s =>
                ['submitted', 'pending_review'].includes(s.status)
            );

            let totalPointsAwarded = 0;

            for (const submission of pendingSubmissions) {
                const { error } = await supabase
                    .from('submissions')
                    .update({
                        status: 'approved',
                        reviewed_at: now,
                        reviewed_by_curator_id: currentUser?.id || null,
                        points_awarded: 100
                    })
                    .eq('id', submission.id);

                if (error) {
                    message.error(`Ошибка при принятии задания: ${error.message}`);
                    return;
                }
                totalPointsAwarded += 100;
            }

            // 2. Обновить баллы пользователя
            if (totalPointsAwarded > 0) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('total_points')
                    .eq('id', userId)
                    .single();

                if (userData) {
                    await supabase
                        .from('users')
                        .update({ total_points: (userData.total_points || 0) + totalPointsAwarded })
                        .eq('id', userId);
                }
            }

            // 3. Сохранить обратную связь по дню
            if (lessonFeedbacks[key]) {
                const { error } = await supabase
                    .from('lesson_feedback')
                    .update({
                        feedback_text: feedbackText,
                        curator_id: currentUser?.id || null
                    })
                    .eq('id', lessonFeedbacks[key].id);

                if (error) throw error;
            } else {
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
            setFeedbackModalGroup(null);
            setFeedbackText('');
            message.success(`Принято ${pendingSubmissions.length} заданий, обратная связь сохранена`);
            await loadData();
        } catch (err) {
            message.error('Ошибка при сохранении');
        }
    };

    const handleManualApprove = async () => {
        if (!manualApproveModal || !supabase) return;

        try {
            const { userId, lessonId, assignmentId } = manualApproveModal;
            const now = new Date().toISOString();

            const { error: insertError } = await supabase
                .from('submissions')
                .insert({
                    user_id: userId,
                    lesson_id: lessonId,
                    assignment_id: assignmentId,
                    content_text: '[Ручная отметка трекером]',
                    status: 'approved',
                    submitted_at: now,
                    first_submitted_at: now,
                    reviewed_at: now,
                    reviewed_by_curator_id: currentUser?.id || null,
                    points_awarded: manualApprovePoints,
                    feedback_text: 'Задание отмечено как выполненное трекером'
                });

            if (insertError) {
                message.error(`Ошибка: ${insertError.message}`);
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('total_points')
                .eq('id', userId)
                .single();

            if (userData) {
                await supabase
                    .from('users')
                    .update({ total_points: (userData.total_points || 0) + manualApprovePoints })
                    .eq('id', userId);
            }

            setManualApproveModal(null);
            setManualApprovePoints(100);
            message.success('Задание отмечено как выполненное');
            await loadData();
        } catch (err) {
            message.error('Произошла ошибка при ручном подтверждении задания');
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

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'approved':
                return <Tag icon={<CheckCircleOutlined />} color="success">Принято</Tag>;
            case 'rejected':
                return <Tag icon={<CloseCircleOutlined />} color="error">Отклонено</Tag>;
            case 'submitted':
            case 'pending_review':
                return <Tag icon={<ClockCircleOutlined />} color="warning">На проверке</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Загрузка сабмитов...</div>
            </div>
        );
    }

    return (
        <div>
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <Title level={4} style={{ margin: 0 }}>Проверка домашних заданий</Title>
                    </Col>
                    <Col>
                        <Space size="large">
                            <Statistic
                                title="Ожидают проверки"
                                value={stats.pending}
                                valueStyle={{ color: stats.pending > 0 ? '#faad14' : '#52c41a' }}
                            />
                            <Statistic
                                title="Проверено сегодня"
                                value={stats.reviewedToday}
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadData}
                            >
                                Обновить
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {error && (
                <Alert
                    message="Ошибка"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    style={{ marginBottom: 16 }}
                />
            )}

            <Card style={{ marginBottom: 16 }}>
                <Space size="large">
                    <Space>
                        <Text strong>Поток:</Text>
                        <Select
                            value={streamFilter}
                            onChange={setStreamFilter}
                            style={{ width: 200 }}
                            options={[
                                { value: 'all', label: 'Все потоки' },
                                ...streams.map(stream => ({
                                    value: stream.id,
                                    label: stream.name
                                }))
                            ]}
                        />
                    </Space>
                    <Space>
                        <Text strong>Статус:</Text>
                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 200 }}
                            options={[
                                { value: 'all', label: 'Все' },
                                { value: 'pending', label: 'Ожидают проверки' },
                                { value: 'completed', label: 'Полностью сданные' }
                            ]}
                        />
                    </Space>
                </Space>
            </Card>

            {filteredGroups.length === 0 ? (
                <Empty
                    description={
                        statusFilter === 'pending'
                            ? 'Нет сабмитов, ожидающих проверки'
                            : 'Сабмиты не найдены'
                    }
                />
            ) : (
                <Collapse
                    accordion
                    defaultActiveKey={filteredGroups.length > 0 ? [`${filteredGroups[0].user_id}-${filteredGroups[0].lesson_id}`] : []}
                >
                    {filteredGroups.map((group) => {
                        const key = `${group.user_id}-${group.lesson_id}`;
                        const allSubmitted = group.submitted_assignments === group.total_assignments;
                        const hasPending = group.submissions.some(s => ['submitted', 'pending_review'].includes(s.status));

                        return (
                            <Panel
                                key={key}
                                header={
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <Space>
                                            <Avatar
                                                src={group.user_photo_url}
                                                icon={!group.user_photo_url && <UserOutlined />}
                                            />
                                            <div>
                                                <Text strong>
                                                    {group.user_first_name} {group.user_last_name}
                                                </Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {group.lesson_name} • {group.stage_name}
                                                </Text>
                                            </div>
                                        </Space>
                                        <Space>
                                            {hasPending && (
                                                <Badge status="warning" text="" />
                                            )}
                                            <Tag color={allSubmitted ? 'green' : 'default'}>
                                                {group.submitted_assignments} / {group.total_assignments}
                                                {group.approved_assignments > 0 && ` (✓${group.approved_assignments})`}
                                            </Tag>
                                        </Space>
                                    </div>
                                }
                            >
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    {/* Несданные задания */}
                                    {(lessonAssignments[group.lesson_id] || [])
                                        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                                        .map((assignment) => {
                                            const submission = group.submissions.find(
                                                s => s.assignment_id === assignment.id
                                            );

                                            if (!submission) {
                                                return (
                                                    <Card
                                                        key={`unsubmitted-${assignment.id}`}
                                                        size="small"
                                                        style={{ backgroundColor: '#fff7e6', borderColor: '#ffd591' }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Space>
                                                                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                                                                <Text>
                                                                    {assignment.title || `Задание ${assignment.order_num}`}
                                                                </Text>
                                                                <Tag color="default">Не сдано</Tag>
                                                            </Space>
                                                            <Button
                                                                size="small"
                                                                icon={<CheckOutlined />}
                                                                onClick={() => {
                                                                    setManualApproveModal({
                                                                        userId: group.user_id,
                                                                        lessonId: group.lesson_id,
                                                                        assignmentId: assignment.id,
                                                                        assignmentTitle: assignment.title || `Задание ${assignment.order_num}`
                                                                    });
                                                                    setManualApprovePoints(100);
                                                                }}
                                                            >
                                                                Отметить
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                );
                                            }

                                            return null;
                                        })}

                                    {/* Сданные задания */}
                                    {group.submissions
                                        .filter(s => s.assignment_id)
                                        .sort((a, b) => (a.assignment_order || 0) - (b.assignment_order || 0))
                                        .map((submission) => (
                                            <Card key={submission.id} size="small">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Space direction="vertical" size={0}>
                                                        <Text strong>
                                                            {submission.assignment_title || `Задание ${submission.assignment_order || submission.assignment_id}`}
                                                        </Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {formatDate(submission.submitted_at)}
                                                        </Text>
                                                    </Space>
                                                    <Space>
                                                        {getStatusTag(submission.status)}

                                                        <Tooltip title="Просмотреть">
                                                            <Button
                                                                size="small"
                                                                icon={<EyeOutlined />}
                                                                onClick={() => onSubmissionSelect(submission.id)}
                                                            />
                                                        </Tooltip>

                                                        {['submitted', 'pending_review'].includes(submission.status) && (
                                                            <>
                                                                <Tooltip title="Принять (100 баллов)">
                                                                    <Button
                                                                        size="small"
                                                                        type="primary"
                                                                        icon={<CheckCircleOutlined />}
                                                                        onClick={() => handleQuickAction(submission.id, 'approve', 100)}
                                                                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                                                    />
                                                                </Tooltip>
                                                                <Tooltip title="Отклонить">
                                                                    <Button
                                                                        size="small"
                                                                        danger
                                                                        icon={<CloseCircleOutlined />}
                                                                        onClick={() => handleQuickAction(submission.id, 'reject')}
                                                                    />
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                    </Space>
                                                </div>
                                            </Card>
                                        ))}

                                    {/* Обратная связь по дню */}
                                    <>
                                        <Divider style={{ margin: '12px 0' }} />
                                        {group.lesson_feedback ? (
                                            <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <Text strong>
                                                        <MessageOutlined /> Обратная связь по дню:
                                                    </Text>
                                                    <Text>{group.lesson_feedback.feedback_text}</Text>
                                                    <Button
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={() => {
                                                            setFeedbackModalOpen(key);
                                                            setFeedbackModalGroup(group);
                                                            setFeedbackText(group.lesson_feedback?.feedback_text || '');
                                                        }}
                                                    >
                                                        Редактировать
                                                    </Button>
                                                </Space>
                                            </Card>
                                        ) : (
                                            <Button
                                                type="primary"
                                                icon={<CheckCircleOutlined />}
                                                onClick={() => {
                                                    setFeedbackModalOpen(key);
                                                    setFeedbackModalGroup(group);
                                                    setFeedbackText('');
                                                }}
                                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                            >
                                                Принять все и оставить обратную связь по дню
                                            </Button>
                                        )}
                                    </>
                                </Space>
                            </Panel>
                        );
                    })}
                </Collapse>
            )}

            {/* Модальное окно для обратной связи по дню */}
            <Modal
                title="Принять все и оставить обратную связь"
                open={!!feedbackModalOpen}
                onOk={handleApproveAllAndFeedback}
                onCancel={() => {
                    setFeedbackModalOpen(null);
                    setFeedbackModalGroup(null);
                    setFeedbackText('');
                }}
                okText="Принять все и сохранить"
                cancelText="Отмена"
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    {feedbackModalGroup && (
                        <Alert
                            type="info"
                            message={`Будет принято заданий: ${feedbackModalGroup.submissions.filter(s => ['submitted', 'pending_review'].includes(s.status)).length}`}
                            style={{ marginBottom: 12 }}
                        />
                    )}
                    <TextArea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Напишите общую обратную связь по всем заданиям дня..."
                        rows={5}
                    />
                </Space>
            </Modal>

            {/* Модалка ручного подтверждения */}
            <Modal
                title="Ручное подтверждение"
                open={!!manualApproveModal}
                onOk={handleManualApprove}
                onCancel={() => {
                    setManualApproveModal(null);
                    setManualApprovePoints(100);
                }}
                okText="Подтвердить"
                cancelText="Отмена"
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>
                        Отметить задание "<strong>{manualApproveModal?.assignmentTitle}</strong>" как выполненное?
                    </Text>
                    <div>
                        <Text>Баллы:</Text>
                        <InputNumber
                            min={0}
                            max={100}
                            value={manualApprovePoints}
                            onChange={(value) => setManualApprovePoints(value || 0)}
                            style={{ width: '100%', marginTop: 8 }}
                        />
                    </div>
                </Space>
            </Modal>
        </div>
    );
};

export default SubmissionsManager;
