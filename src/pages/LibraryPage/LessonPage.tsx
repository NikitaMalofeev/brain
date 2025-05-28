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
import { VideoBlock, AudioBlock, FixedSubmissionForm } from '@/components/LessonContent';
import { Button } from '@/components/ui/button';

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

                // Если есть пользователь, получаем его сдачи и прогресс
                if (supabaseCompatUser && supabase) {
                    // Получаем сдачи
                    const { data: submission } = await supabase
                        .from('submissions')
                        .select('*')
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
                        lesson,
                        submission,
                        progress,
                        loading: false,
                    }));
                } else {
                    setState(prev => ({
                        ...prev,
                        lesson,
                        loading: false,
                    }));
                }

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
    }, [lessonId, supabaseCompatUser]);

    // Обработчик обновления submission
    const handleSubmissionUpdate = (submission: Submission) => {
        setState(prev => ({ ...prev, submission }));
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

    // Определение типа файла для отображения
    const getFileTypeInfo = (fileUrl: string) => {
        const fileName = decodeURIComponent(fileUrl.substring(fileUrl.lastIndexOf('/') + 1));
        const extension = fileName.split('.').pop()?.toLowerCase() || '';

        // Определяем тип и иконку
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
            return { type: 'image', icon: '🖼️', name: fileName };
        }
        if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) {
            return { type: 'audio', icon: '🎵', name: fileName };
        }
        if (extension === 'pdf') {
            return { type: 'pdf', icon: '📄', name: fileName };
        }
        if (['doc', 'docx'].includes(extension)) {
            return { type: 'document', icon: '📝', name: fileName };
        }
        return { type: 'unknown', icon: '📎', name: fileName };
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
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontWeight: 700,
                                fontSize: '20px',
                                lineHeight: '1.2',
                                color: '#000000',
                                marginBottom: '16px',
                            }}>
                                {block.title}
                            </h3>
                        )}
                        <div style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#242424',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {block.content_text}
                        </div>
                    </div>
                );

            case 'video':
                return (
                    <div key={block.id} style={commonBlockStyle}>
                        {block.title && (
                            <h3 style={{
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                            <div style={{
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '16px',
                                lineHeight: '1.5',
                                color: '#242424',
                                whiteSpace: 'pre-wrap',
                                marginTop: '16px',
                            }}>
                                {block.content_text}
                            </div>
                        )}
                    </div>
                );

            case 'audio':
                return <AudioBlock key={block.id} block={block} />;

            case 'image':
                return (
                    <div key={block.id} style={commonBlockStyle}>
                        {block.title && (
                            <h3 style={{
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontWeight: 700,
                                fontSize: '20px',
                                lineHeight: '1.2',
                                color: '#000000',
                                marginBottom: '16px',
                                margin: '0 0 16px 0',
                            }}>
                                {block.title}
                            </h3>
                        )}
                        {block.content_url ? (
                            <img
                                src={block.content_url}
                                alt={block.title || 'Изображение'}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    borderRadius: '12px',
                                }}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '200px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '12px',
                                color: '#6d6d6d',
                                fontSize: '16px',
                            }}>
                                🖼 Изображение недоступно
                            </div>
                        )}
                    </div>
                );

            case 'pdf':
                return (
                    <div key={block.id} style={commonBlockStyle}>
                        {block.title && (
                            <h3 style={{
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontWeight: 700,
                                fontSize: '20px',
                                lineHeight: '1.2',
                                color: '#000000',
                                marginBottom: '16px',
                                margin: '0 0 16px 0',
                            }}>
                                📄 {block.title}
                            </h3>
                        )}
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#f9f9fa',
                            borderRadius: '12px',
                            border: '1px solid #e0e0e0',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '12px',
                            }}>
                                <span style={{ fontSize: '24px' }}>📎</span>
                                <span style={{
                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    fontSize: '16px',
                                    color: '#242424',
                                }}>
                                    PDF-материал
                                </span>
                            </div>
                            {block.content_url ? (
                                <a
                                    href={block.content_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '8px 16px',
                                        backgroundColor: '#4e9bff',
                                        color: '#ffffff',
                                        textDecoration: 'none',
                                        borderRadius: '8px',
                                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }}
                                >
                                    Открыть PDF
                                </a>
                            ) : (
                                <div style={{ color: '#6d6d6d' }}>
                                    PDF недоступен
                                </div>
                            )}
                        </div>
                    </div>
                );

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
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                }}>
                    Урок не найден
                </div>
            </Page>
        );
    }

    // Определяем нужен ли bottom padding для fixed элементов
    const hasAssignment = state.lesson.has_assignment;
    const isAssignmentSubmitted = !!state.submission;
    const isLessonCompleted = state.progress?.is_completed || false;

    // Показываем fixed элемент если:
    // 1. Есть задание и оно не сдано (форма сдачи)
    // 2. Нет задания и урок не завершен (кнопка завершения)
    const showFixedElement = (hasAssignment && !isAssignmentSubmitted) || (!hasAssignment && !isLessonCompleted);
    const bottomPadding = showFixedElement ? '120px' : '40px';

    return (
        <Page back={false} showTabBar={false}>
            <div style={{
                maxWidth: '768px',
                margin: '0 auto',
                padding: `0 16px ${bottomPadding} 16px`,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                {/* Кнопка назад и заголовок урока */}
                <div style={{
                    marginBottom: '24px',
                    textAlign: 'left',
                }}>
                    {/* Кнопка назад */}
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'none',
                            border: 'none',
                            padding: '8px 0',
                            marginBottom: '16px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#000000',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginRight: '8px' }}
                        >
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        Назад
                    </button>

                    <h1 style={{
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: 700,
                        fontSize: '24px',
                        lineHeight: '1.2',
                        color: '#000000',
                        margin: '0 0 8px 0',
                    }}>
                        {state.lesson.name}
                    </h1>
                    {state.lesson.description && (
                        <p style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#8C8C8C',
                            margin: '0',
                        }}>
                            {state.lesson.description}
                        </p>
                    )}
                </div>

                {/* Блоки контента */}
                <div style={{ marginBottom: '32px' }}>
                    {state.lesson.blocks.map((block: LessonBlock) => renderContentBlock(block))}
                </div>

                {/* Блок с результатом сданного задания */}
                {state.submission && (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1.2',
                            color: '#000000',
                            marginBottom: '16px',
                        }}>
                            ✅ Задание сдано на проверку
                        </div>

                        {state.submission.content_text && (
                            <div style={{ marginBottom: '16px' }}>
                                <p style={{
                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#666666',
                                    marginBottom: '8px',
                                }}>
                                    Ваш ответ:
                                </p>
                                <div style={{
                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    fontSize: '16px',
                                    lineHeight: '1.5',
                                    color: '#666666',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                }}>
                                    {state.submission.content_text}
                                </div>
                            </div>
                        )}

                        {state.submission.file_url && (
                            <div style={{ marginBottom: '16px' }}>
                                {(() => {
                                    const fileInfo = getFileTypeInfo(state.submission.file_url);
                                    return (
                                        <a
                                            href={state.submission.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                                fontSize: '16px',
                                                color: '#4e9bff',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <span>{fileInfo.icon}</span>
                                            <span>{fileInfo.name}</span>
                                        </a>
                                    );
                                })()}
                            </div>
                        )}

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

                {/* Блок завершенного урока без задания */}
                {!hasAssignment && isLessonCompleted && state.progress && (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1.2',
                            color: '#000000',
                            marginBottom: '16px',
                        }}>
                            ✅ Урок пройден
                        </div>

                        <p style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: '#666666',
                            marginBottom: '20px',
                        }}>
                            Урок завершен {state.progress.completed_at ? new Date(state.progress.completed_at).toLocaleDateString('ru-RU') : ''}
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
            </div>

            {/* Fixed форма сдачи (если есть задание и оно не сдано) */}
            {hasAssignment && !isAssignmentSubmitted && state.lesson && (
                <FixedSubmissionForm
                    lessonId={parseInt(lessonId || '0')}
                    stageId={state.lesson.stage_id as number | undefined}
                    user={supabaseCompatUser}
                    existingSubmission={state.submission}
                    onSubmissionUpdate={handleSubmissionUpdate}
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
        </Page>
    );
};

export default LessonPage; 