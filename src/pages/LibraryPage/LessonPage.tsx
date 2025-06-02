import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { User } from '@supabase/supabase-js';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase/client';
import { LessonWithBlocks, LessonBlock, Submission, LessonProgress } from '@/lib/supabase/types';
import { VideoBlock, AudioBlock, FixedSubmissionForm, DocumentBlock, ImageBlock } from '@/components/LessonContent';
import { Button } from '@/components/ui/button';
import { getDeadlineStatus, formatDeadline } from '@/helpers/deadlineUtils';

interface LessonPageState {
    lesson: LessonWithBlocks | null;
    loading: boolean;
    error: string | null;
    submission: Submission | null;
    progress: LessonProgress | null;
}

const LessonPage: React.FC = () => {
    const { id: lessonId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isTelegramApp } = useAppContext();
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    const [state, setState] = useState<LessonPageState>({
        lesson: null,
        loading: true,
        error: null,
        submission: null,
        progress: null,
    });

    // Создаем Supabase-совместимого User
    const [supabaseCompatUser, setSupabaseCompatUser] = useState<User | null>(null);

    // Состояние для завершения урока
    const [isCompletingLesson, setIsCompletingLesson] = useState(false);

    // Состояние для пересдачи задания
    const [isRetryingSubmission, setIsRetryingSubmission] = useState(false);

    useEffect(() => {
        if (supabaseUser) {
            const compatUser: User = {
                id: supabaseUser.id,
                app_metadata: {},
                user_metadata: {
                    full_name: supabaseUser.first_name,
                },
                aud: '',
                created_at: supabaseUser.created_at || new Date().toISOString(),
            } as User;
            setSupabaseCompatUser(compatUser);
        } else {
            setSupabaseCompatUser(null);
        }
    }, [supabaseUser]);

    // Загружаем данные урока
    useEffect(() => {
        const fetchLessonData = async () => {
            if (!lessonId || !supabase) return;

            setState(prev => ({ ...prev, loading: true, error: null }));

            try {
                // Получаем урок с блоками
                const { data: lessonData, error: lessonError } = await supabase
                    .from('lessons')
                    .select(`
            *,
            lesson_blocks (*)
          `)
                    .eq('id', lessonId)
                    .single();

                if (lessonError) {
                    throw new Error(`Ошибка загрузки урока: ${lessonError.message}`);
                }

                // Сортируем блоки по порядку
                const sortedBlocks = lessonData.lesson_blocks?.sort((a: LessonBlock, b: LessonBlock) =>
                    a.order_num - b.order_num) || [];

                const lesson: LessonWithBlocks = {
                    ...lessonData,
                    blocks: sortedBlocks,
                };

                // Обновляем состояние с уроком - урок грузится независимо от пользователя
                setState(prev => ({
                    ...prev,
                    lesson,
                    loading: false,
                }));

                logger.debug('Lesson data loaded', { lessonId, blocksCount: sortedBlocks.length });

            } catch (error) {
                logger.error('Failed to fetch lesson data', { lessonId, error });
                setState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Ошибка загрузки урока',
                    loading: false,
                }));
            }
        };

        fetchLessonData();
    }, [lessonId]); // Убираю зависимость от supabaseCompatUser

    // Отдельно загружаем пользовательские данные
    useEffect(() => {
        const fetchUserData = async () => {
            if (!lessonId || !supabaseCompatUser || !supabase) return;

            try {
                // Получаем сдачи с данными куратора
                const { data: submission } = await supabase
                    .from('submissions')
                    .select(`
                        *,
                        reviewer:users!submissions_reviewed_by_curator_id_fkey(
                            first_name, 
                            last_name
                        )
                    `)
                    .eq('user_id', supabaseCompatUser.id)
                    .eq('lesson_id', lessonId)
                    .maybeSingle();

                // Получаем прогресс урока
                const { data: progress } = await supabase
                    .from('lesson_progress')
                    .select('*')
                    .eq('user_id', supabaseCompatUser.id)
                    .eq('lesson_id', lessonId)
                    .maybeSingle();

                setState(prev => ({
                    ...prev,
                    submission,
                    progress,
                }));

                logger.debug('User data loaded', { lessonId, hasSubmission: !!submission, hasProgress: !!progress });

            } catch (error) {
                logger.error('Failed to fetch user data', { lessonId, error });
                // Не показываем ошибку пользовательских данных как критичную
            }
        };

        fetchUserData();
    }, [lessonId, supabaseCompatUser]);

    // Обработчик обновления submission
    const handleSubmissionUpdate = (submission: Submission) => {
        setState(prev => ({ ...prev, submission }));

        // Сбрасываем режим пересдачи после успешной отправки
        if (isRetryingSubmission) {
            setIsRetryingSubmission(false);
            logger.debug('Retry submission mode reset after successful update');
        }
    };

    // Обработчик обновления прогресса урока
    const handleProgressUpdate = (progress: LessonProgress) => {
        setState(prev => ({ ...prev, progress }));
    };

    // Обработчик завершения урока без задания
    const handleCompleteLesson = async () => {
        if (!supabaseCompatUser || !supabase || isCompletingLesson || !lessonId) return;

        setIsCompletingLesson(true);

        try {
            const now = new Date().toISOString();

            // Данные для создания/обновления записи прогресса
            const progressData = {
                user_id: supabaseCompatUser.id,
                lesson_id: parseInt(lessonId),
                is_completed: true,
                completed_at: now,
                started_at: state.progress?.started_at || now,
                submission_id: null, // Для уроков без задания всегда null
            };

            let updatedProgress: LessonProgress;

            if (state.progress) {
                // Обновляем существующую запись
                const { data, error } = await supabase
                    .from('lesson_progress')
                    .update({
                        is_completed: true,
                        completed_at: now,
                    })
                    .eq('id', state.progress.id)
                    .select()
                    .single();

                if (error) {
                    throw new Error(`Ошибка обновления прогресса: ${error.message}`);
                }

                updatedProgress = data;
            } else {
                // Создаем новую запись
                const { data, error } = await supabase
                    .from('lesson_progress')
                    .insert(progressData)
                    .select()
                    .single();

                if (error) {
                    throw new Error(`Ошибка создания прогресса: ${error.message}`);
                }

                updatedProgress = data;
            }

            // Обновляем состояние
            handleProgressUpdate(updatedProgress);

        } catch (error) {
            console.error('Failed to complete lesson:', error);
            // TODO: Добавить нормальное уведомление об ошибке
        } finally {
            setIsCompletingLesson(false);
        }
    };

    // Обработчик пересдачи отклоненного задания
    const handleRetrySubmission = async () => {
        if (!state.submission || state.submission.status !== 'rejected') return;

        // Просто активируем режим пересдачи, не обновляя базу данных
        setIsRetryingSubmission(true);

        logger.debug('Retry submission mode activated', { submissionId: state.submission.id });
    };

    // Обработчик отмены пересдачи
    const handleCancelRetry = () => {
        setIsRetryingSubmission(false);
        logger.debug('Retry submission mode cancelled');
    };

    // Функция для определения статуса урока на странице урока
    const getLessonPageStatus = () => {
        const hasAssignment = state.lesson?.has_assignment === true;
        const isLessonCompleted = !!state.progress?.is_completed;
        const submission = state.submission;
        const hasStarted = !!state.progress?.started_at || !!submission;
        const deadlineStatus = getDeadlineStatus(state.lesson?.deadline_at);

        // Для урока с заданием
        if (hasAssignment) {
            // Приоритет 1: Завершенный урок
            if (submission?.status === 'approved') {
                return {
                    type: 'completed',
                    text: 'Завершено',
                    bgClass: 'bg-green-500',
                    icon: '✅'
                };
            }

            // Приоритет 2: Пропущенный дедлайн (только если не завершен)
            if (deadlineStatus === 'missed' && (!submission || (submission.status as string) !== 'approved')) {
                return {
                    type: 'deadline_missed',
                    text: 'Опоздание',
                    bgClass: 'bg-red-500',
                    icon: '⏰'
                };
            }

            // Приоритет 3: Дедлайн сегодня
            if (deadlineStatus === 'today') {
                return {
                    type: 'deadline_today',
                    text: 'Дедлайн сегодня',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,152,0)_0%,_rgba(255,107,107)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 4: Дедлайн завтра
            if (deadlineStatus === 'tomorrow') {
                return {
                    type: 'deadline_tomorrow',
                    text: 'Дедлайн завтра',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,193,7)_0%,_rgba(255,152,0)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 5: На проверке
            if (submission?.status === 'submitted' || submission?.status === 'pending_review') {
                return {
                    type: 'in_review',
                    text: 'На проверке',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,193,7)_0%,_rgba(255,152,0)_100%)]',
                    icon: '⏳'
                };
            }

            // Приоритет 6: Нужна доработка
            if (submission?.status === 'rejected') {
                return {
                    type: 'needs_retry',
                    text: 'Нужна доработка',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,107,107)_0%,_rgba(255,82,82)_100%)]',
                    icon: '🔄'
                };
            }

            // Приоритет 7: В процессе
            if (hasStarted) {
                return {
                    type: 'in_progress',
                    text: 'В процессе',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]',
                    icon: '📝'
                };
            }

            // Приоритет 8: Не начато
            return {
                type: 'not_started',
                text: 'Не начато',
                bgClass: 'bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]',
                icon: '⚪'
            };
        } else {
            // Для урока без задания
            // Приоритет 1: Завершенный урок
            if (isLessonCompleted) {
                return {
                    type: 'completed',
                    text: 'Завершено',
                    bgClass: 'bg-green-500',
                    icon: '✅'
                };
            }

            // Приоритет 2: Пропущенный дедлайн (только если не завершен)
            if (deadlineStatus === 'missed') {
                return {
                    type: 'deadline_missed',
                    text: 'Опоздание',
                    bgClass: 'bg-red-500',
                    icon: '⏰'
                };
            }

            // Приоритет 3: Дедлайн сегодня
            if (deadlineStatus === 'today') {
                return {
                    type: 'deadline_today',
                    text: 'Дедлайн сегодня',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,152,0)_0%,_rgba(255,107,107)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 4: Дедлайн завтра
            if (deadlineStatus === 'tomorrow') {
                return {
                    type: 'deadline_tomorrow',
                    text: 'Дедлайн завтра',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,193,7)_0%,_rgba(255,152,0)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 5: Не начато (дефолтный статус для незавершенных уроков без задания)
            return {
                type: 'not_started',
                text: 'Не начато',
                bgClass: 'bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]',
                icon: '⚪'
            };
        }
    };

    // Функция рендера результатов проверки задания
    const renderSubmissionResult = (submission: any) => {
        const status = submission.status;
        const points = submission.points_awarded || 0;
        const feedback = submission.feedback_text;
        const reviewedAt = submission.reviewed_at;
        const reviewerName = submission.reviewer?.first_name;

        // Определяем конфигурацию по статусу
        const getStatusConfig = () => {
            switch (status) {
                case 'approved':
                    return {
                        icon: '✅',
                        title: `Задание принято! +${points} баллов`,
                        titleColor: '#22c55e', // зеленый
                        showFeedback: true,
                        showRetryButton: false,
                    };
                case 'rejected':
                    return {
                        icon: '❌',
                        title: 'Задание требует доработки',
                        titleColor: '#ef4444', // красный
                        showFeedback: true,
                        showRetryButton: true,
                    };
                default: // submitted, pending_review
                    return {
                        icon: '⏳',
                        title: 'Задание на проверке',
                        titleColor: '#3b82f6', // синий
                        showFeedback: false,
                        showRetryButton: false,
                    };
            }
        };

        const config = getStatusConfig();

        return (

            <div>
                {/* Заголовок с иконкой и статусом */}
                {/*<div style={{
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '1.2',
                    color: config.titleColor,
                    marginBottom: '16px',
                }}>
                    {config.icon} {config.title}
                </div>*/}

                {/* Ваш ответ */}
                {submission.content_text && (
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#666666',
                            marginBottom: '8px',
                        }}>
                            Ваш ответ:
                        </p>
                        <div style={{
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#666666',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                        }}>
                            {submission.content_text}
                        </div>
                    </div>
                )}

                {/* Прикрепленный файл */}
                {submission.file_url && (
                    <div style={{ marginBottom: '16px' }}>
                        {(() => {
                            const fileName = decodeURIComponent(submission.file_url.substring(submission.file_url.lastIndexOf('/') + 1));
                            const extension = fileName.split('.').pop()?.toLowerCase() || '';
                            const fileIcon =
                                (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) ? '🖼️' :
                                    (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) ? '🎵' :
                                        (extension === 'pdf') ? '📄' :
                                            (['doc', 'docx'].includes(extension)) ? '📝' : '📎';

                            return (
                                <a
                                    href={submission.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '16px',
                                        color: '#4e9bff',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <span>{fileIcon}</span>
                                    <span>{fileName}</span>
                                </a>
                            );
                        })()}
                    </div>
                )}

                {/* Комментарий куратора (для approved/rejected) */}
                {config.showFeedback && feedback && (
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#666666',
                            marginBottom: '8px',
                        }}>
                            💬 Комментарий куратора:
                        </p>
                        <div style={{
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#666666',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            fontStyle: 'italic',
                        }}>
                            "{feedback}"
                        </div>
                    </div>
                )}

                {/* Информация о проверке (для approved/rejected) */}
                {config.showFeedback && (reviewerName || reviewedAt) && (
                    <div style={{ marginBottom: '16px' }}>
                        {reviewerName && (
                            <p style={{
                                fontSize: '14px',
                                color: '#666666',
                                margin: '4px 0',
                            }}>
                                👤 Проверил: {reviewerName}
                            </p>
                        )}
                        {reviewedAt && (
                            <p style={{
                                fontSize: '14px',
                                color: '#666666',
                                margin: '4px 0',
                            }}>
                                📅 {new Date(reviewedAt).toLocaleDateString('ru-RU')}
                            </p>
                        )}
                    </div>
                )}

                {/* Мотивирующий текст для pending_review */}
                {!config.showFeedback && (
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#666666',
                            fontStyle: 'italic',
                        }}>
                            💭 Ожидайте результата проверки
                        </p>
                    </div>
                )}

                {/* Кнопка пересдачи для rejected */}
                {config.showRetryButton && (
                    <div style={{ marginBottom: '16px' }}>
                        {!isRetryingSubmission ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleRetrySubmission}
                                    className="w-full h-12 text-base font-semibold"
                                    size="lg"
                                    style={{
                                        borderColor: '#3b82f6',
                                        color: '#3b82f6',
                                        marginBottom: '12px',
                                    }}
                                >
                                    🔄 Попробовать снова
                                </Button>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#666666',
                                    textAlign: 'center',
                                    fontStyle: 'italic',
                                }}>
                                    Нажмите, чтобы исправить задание
                                </p>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelRetry}
                                    className="w-full h-12 text-base font-semibold"
                                    size="lg"
                                    style={{
                                        borderColor: '#6b7280',
                                        color: '#6b7280',
                                        marginBottom: '12px',
                                    }}
                                >
                                    ✕ Отменить исправление
                                </Button>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#666666',
                                    textAlign: 'center',
                                    fontStyle: 'italic',
                                }}>
                                    Форма для исправления появилась ниже
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Кнопка возврата к ступени */}
                {state.lesson && typeof state.lesson.stage_id === 'number' && (
                    <Button
                        variant="black"
                        onClick={() => state.lesson && navigate(`/library/stage/${state.lesson.stage_id}`)}
                        className="w-full h-12 text-base font-semibold"
                        size="lg"
                    >
                        Вернуться ко всем урокам ступени
                    </Button>
                )}
            </div>
        );
    };

    // Рендер блока контента
    const renderContentBlock = (block: LessonBlock) => {
        // Убираем визуальное разделение на прямоугольники
        const commonBlockStyle = {
            marginBottom: '24px',
            // Убираем padding, background, border, shadow - делаем единым текстом
        };

        switch (block.block_type) {
            case 'text':
                return (
                    <div key={block.id} style={commonBlockStyle}>
                        {block.title && (
                            <h3 style={{
                                fontWeight: 700,
                                fontSize: '20px',
                                lineHeight: '1.2',
                                color: '#000000',
                                marginBottom: '16px',
                            }}>
                                {block.title}
                            </h3>
                        )}
                        {block.content_text && (
                            <div className={'flex flex-col gap-3 mt-4'} style={{
                                fontSize: '16px',
                                lineHeight: '1.5',
                                color: '#242424',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {block.content_text?.split('\n').map((line, i) => {
                                    return (<p>{line}</p>)
                                })}
                            </div>
                        )}
                    </div>
                );

            case 'video':
                return (
                    <div key={block.id} style={commonBlockStyle}>
                        {block.title && (
                            <h3 style={{

                                fontWeight: 700,
                                fontSize: '20px',
                                lineHeight: '1.2',
                                color: '#000000',
                                marginBottom: '16px',
                            }}>
                                {block.title}
                            </h3>
                        )}
                        <VideoBlock block={block} />
                        {block.content_text && (
                            <div className={'flex flex-col gap-3 mt-4'} style={{
                                fontSize: '16px',
                                lineHeight: '1.5',
                                color: '#242424',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {block.content_text?.split('\n').map((line, i) => {
                                    return (<p>{line}</p>)
                                })}
                            </div>
                        )}
                    </div>
                );

            case 'audio':
                return <AudioBlock key={block.id} block={block} />;

            case 'image':
                // Используем новый компонент ImageBlock
                return <div key={block.id} style={commonBlockStyle}><ImageBlock block={block} /></div>;

            case 'pdf':
                // Используем новый компонент PdfBlock
                return <div key={block.id} style={commonBlockStyle}><DocumentBlock block={block} /></div>;

            // assignment_instruction блоки больше не существуют
            // Инструкции к заданию теперь обычные текстовые блоки

            default:
                return (
                    <div key={block.id} style={commonBlockStyle}>
                        <div style={{
                            color: '#6d6d6d',
                            textAlign: 'center',
                            padding: '20px',
                        }}>
                            ❓ Неизвестный тип контента: {block.block_type}
                        </div>
                    </div>
                );
        }
    };

    // Состояния загрузки и ошибок
    const loading = state.loading || (isTelegramApp && supabaseUserLoading);
    const error = state.error || (isTelegramApp && supabaseUserError);

    if (loading) {
        return (
            <Page back={true}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '200px',
                    fontSize: '16px',
                    color: '#6d6d6d',
                }}>
                    Загрузка урока...
                </div>
            </Page>
        );
    }

    if (error) {
        return (
            <Page back={true}>
                <div style={{
                    textAlign: 'center',
                    marginTop: '60px',
                    color: '#c53030',
                    fontSize: '16px',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <div>{error instanceof Error ? error.message : String(error)}</div>
                </div>
            </Page>
        );
    }

    if (!state.lesson) {
        return (
            <Page back={true}>
                <div style={{
                    textAlign: 'center',
                    marginTop: '60px',
                    color: '#6d6d6d',
                    fontSize: '16px',
                }}>
                    Урок не найден
                </div>
            </Page>
        );
    }

    // Логика отображения fixed элементов внизу
    const hasAssignment = state.lesson?.has_assignment === true;
    const isAssignmentSubmitted = !!state.submission;
    const isLessonCompleted = !!state.progress?.is_completed;

    // Показываем форму если:
    // 1. Есть задание И (нет сдачи ИЛИ задание отклонено и включена пересдача)
    const isRetryAllowed = state.submission?.status === 'rejected' && isRetryingSubmission;
    const showSubmissionForm = hasAssignment && (!isAssignmentSubmitted || isRetryAllowed);

    // 2. Нет задания и урок не завершен (кнопка завершения)
    const showFixedElement = showSubmissionForm || (!hasAssignment && !isLessonCompleted);
    const bottomPadding = showFixedElement ? '120px' : '40px';

    return (
        <Page back={true} showTabBar={false}>
            <div className={'text-black'}>
                <img src={state.lesson.cover_image_url || '/test.png'}
                    className={'h-[320px] rounded-b-3xl object-cover'} alt={''} />
                <div className={'p-4 flex flex-col gap-2'}>
                    <p className={'font-bold text-xl'}>{state.lesson.name}</p>
                    <div className={'flex flex-wrap gap-1'}>
                        <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]'}>День {state.lesson.order_num}</p>

                        {/* Отображаем статус урока с учетом submissions */}
                        {(() => {
                            const status = getLessonPageStatus();
                            return (
                                <p className={`rounded-full px-2 py-1 text-white text-xs font-medium ${status.bgClass}`}>
                                    {status.text}
                                </p>
                            );
                        })()}

                        {/* Отображаем дедлайн если есть */}
                        {state.lesson.deadline_at && (
                            <p className={'rounded-full px-2 py-1 text-white text-xs font-medium bg-gray-600'}>
                                До {formatDeadline(state.lesson.deadline_at)}
                            </p>
                        )}
                    </div>
                </div>
                <div className={'p-4 pb-8'}>
                    {state.lesson.blocks.map((block: LessonBlock) => renderContentBlock(block))}
                </div>
                {state.submission && (
                    <div style={{ marginBottom: '32px' }}>
                        {renderSubmissionResult(state.submission)}
                    </div>
                )}

                {/* Блок завершенного урока без задания */}
                {!hasAssignment && isLessonCompleted && state.progress && (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1.2',
                            color: '#000000',
                            marginBottom: '16px',
                        }}>
                            ✅ Урок пройден
                        </div>

                        <p style={{
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#666666',
                            marginBottom: '20px',
                        }}>
                            Урок
                            завершен {state.progress.completed_at ? new Date(state.progress.completed_at).toLocaleDateString('ru-RU') : ''}
                        </p>

                        {state.lesson && typeof state.lesson.stage_id === 'number' && (
                            <Button
                                variant="black"
                                onClick={() => state.lesson && navigate(`/library/stage/${state.lesson.stage_id}`)}
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                            >
                                Вернуться ко всем урокам ступени
                            </Button>
                        )}
                    </div>
                )}


                {/* Fixed форма сдачи (если есть задание и оно не сдано ИЛИ идет пересдача) */}
                {showSubmissionForm && state.lesson && (
                    <FixedSubmissionForm
                        lessonId={parseInt(lessonId || '0')}
                        stageId={state.lesson.stage_id as number | undefined}
                        user={supabaseCompatUser}
                        existingSubmission={state.submission}
                        onSubmissionUpdate={handleSubmissionUpdate}
                        isRetryMode={isRetryingSubmission}
                        lessonDeadline={state.lesson.deadline_at}
                    />
                )}

                {/* Кнопка завершения урока (если нет задания и урок не завершен) */}
                {!hasAssignment && !isLessonCompleted && state.lesson && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8 z-50">
                        <Button
                            variant="black"
                            onClick={handleCompleteLesson}
                            disabled={!supabaseCompatUser || isCompletingLesson}
                            className="w-full h-12 text-base font-semibold"
                            size="lg"
                        >
                            {isCompletingLesson ? 'Завершаем...' : '✓ Урок пройден'}
                        </Button>
                    </div>
                )}
            </div>


        </Page>
    );
};

export default LessonPage; 