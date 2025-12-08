import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { User } from '@supabase/supabase-js';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useUserStreamInfo } from '@/lib/supabase/hooks';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase/client';
import { LessonWithBlocks, LessonBlock, Submission, LessonProgress } from '@/lib/supabase/types';
import { VideoBlock, DocumentBlock, ImageBlock, MaterialBlock, TechniqueInBlock } from '@/components/LessonContent';
import { MarkdownContent } from '@/components/LessonContent/MarkdownContent';
import { Button } from '@/components/ui/button';
import { getDeadlineStatus, formatDeadline } from '@/helpers/deadlineUtils';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import NewPlayer from "@/components/NewPlayer/NewPlayer.tsx";
import { clsx } from "clsx";
import { Ripple } from '@/components/ui/Ripple/Ripple';
import ReactMarkdown from 'react-markdown';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import { motion } from 'framer-motion';
import dayBackground from '@/shared/assets/images/dayBackground.png';
import Background1 from '@/shared/assets/images/background1.png';
import whiteOkIcon from '@/shared/assets/icons/whiteOk.svg';
import { Check, Clock, XCircle } from 'lucide-react';
import { useAssignmentsWithProgress, useSaveAssignmentDraft, useSubmitAssignment, useAssignmentProgress } from '@/lib/supabase/hooks/useAssignments';
import { useTechniqueByModuleAndDay } from '@/lib/supabase/hooks/useTechniqueSchedule';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

// Варианты анимации для блоков урока
const lessonBlocksVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.25,
        },
    },
};

const lessonBlockVariants = {
    hidden: { opacity: 0, y: 25 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 60,
            damping: 14,
            duration: 0.8
        }
    },
};

interface LessonFeedback {
    id: number;
    feedback_text: string;
    created_at: string;
    curator_id?: string;
}

interface LessonPageState {
    lesson: LessonWithBlocks | null;
    loading: boolean;
    error: string | null;
    submission: Submission | null;
    progress: LessonProgress | null;
    userDataLoading: boolean; // Добавляем флаг загрузки пользовательских данных
    // Прогресс по заданиям урока
    totalAssignments: number;
    completedAssignments: number;
    // Для связи с техниками
    moduleId: string | null;
    // Обратная связь по дню от куратора
    lessonFeedback: LessonFeedback | null;
}

// Функция для преобразования URL в тексте в кликабельные ссылки
function linkifyText(text: string): React.ReactNode[] {
    // Регулярное выражение для поиска URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={index} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#4e9bff', textDecoration: 'underline' }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

function BlockContent({ block }: { block: LessonBlock }) {
    // Основной контент блока
    const renderMainContent = () => {
        switch (block.block_type) {
            case 'text':
                return (
                    <MarkdownContent content={block.content_text || ''} />
                );

            case 'video':
                return (
                    <div className={'flex flex-col gap-3'}>
                        <VideoBlock block={block} />
                        {block.content_text && (
                            <MarkdownContent content={block.content_text} className="mt-4" />
                        )}
                    </div>
                );

            case 'audio':
                const audioWaveformData = block.meta_json?.audio_data;
                return <div className={'flex flex-col gap-3'}>
                    {block.content_url && <NewPlayer
                        audioUrl={buildFileUrl(block.content_url) || ''}
                        waveformData={audioWaveformData}
                    />}
                    {block.content_text && <MarkdownContent content={block.content_text} className="mt-4" />}
                </div>


            case 'image':
                return <ImageBlock block={block} />;

            case 'pdf':
                return <DocumentBlock block={block} />;

            case 'material':
                return <MaterialBlock block={block} />;

            default:
                return (
                    <div className={'flex flex-col gap-3'}>
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

    // Собираем все ID техник: сначала из technique_ids, затем fallback на technique_id
    const techniqueIds = block.technique_ids && block.technique_ids.length > 0
        ? block.technique_ids
        : block.technique_id
            ? [block.technique_id]
            : [];

    return (
        <div>
            {renderMainContent()}
            {/* Показываем привязанные техники если есть */}
            {techniqueIds.map((techId) => (
                <TechniqueInBlock key={techId} techniqueId={techId} />
            ))}
        </div>
    );
}

// Компонент формы сдачи задания (встроенный в BlockItem)
interface AssignmentFormProps {
    assignmentId: number;
    userId: string;
    lessonId: number;
    initialText?: string;
    submission?: any;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ assignmentId, userId, lessonId, initialText = '', submission }) => {
    const [text, setText] = useState(initialText);
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const saveDraftMutation = useSaveAssignmentDraft();
    const submitMutation = useSubmitAssignment();

    // Автосохранение с debounce 1 секунда
    const debouncedSave = useCallback(
        (value: string) => {
            if (saveTimeoutId) {
                clearTimeout(saveTimeoutId);
            }

            const timeoutId = setTimeout(() => {
                if (value.trim()) {
                    setIsSaving(true);
                    saveDraftMutation.mutate(
                        {
                            userId,
                            assignmentId,
                            draftText: value,
                        },
                        {
                            onSuccess: () => {
                                setIsSaving(false);
                                logger.debug('Draft saved', { assignmentId });
                            },
                            onError: () => {
                                setIsSaving(false);
                            },
                        }
                    );
                }
            }, 1000);

            setSaveTimeoutId(timeoutId);
        },
        [userId, assignmentId, saveDraftMutation, saveTimeoutId]
    );

    const handleTextChange = (value: string) => {
        setText(value);
        debouncedSave(value);
    };

    const handleSubmit = () => {
        if (!text.trim()) {
            alert('Пожалуйста, введите ответ перед сдачей');
            return;
        }

        submitMutation.mutate(
            {
                userId,
                assignmentId,
                lessonId,
                submissionText: text,
            },
            {
                onSuccess: () => {
                    logger.debug('Assignment submitted', { assignmentId });
                    setText('');
                    setShowSuccessMessage(true);
                    // Скрыть сообщение через 5 секунд
                    setTimeout(() => {
                        setShowSuccessMessage(false);
                    }, 5000);
                },
                onError: () => {
                    alert('Ошибка при сдаче задания. Попробуйте еще раз.');
                },
            }
        );
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutId) {
                clearTimeout(saveTimeoutId);
            }
        };
    }, [saveTimeoutId]);

    const canEdit = !submission || submission.status === 'rejected';
    const showFeedback = submission?.status === 'approved' || submission?.status === 'rejected';

    return (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Ваш ответ (если уже отправлен) */}
            {submission?.content_text && (
                <div
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        padding: 16,
                    }}
                >
                    <p
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: '100%',
                            color: '#222222',
                            margin: 0,
                            marginBottom: 8,
                        }}
                    >
                        Ваш ответ
                    </p>
                    <p
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '140%',
                            color: 'rgba(0, 0, 0, 0.48)',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {submission.content_text}
                    </p>
                </div>
            )}

            {/* Комментарий куратора */}
            {showFeedback && submission?.feedback_text && (
                <div
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        padding: 16,
                    }}
                >
                    <p
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: '100%',
                            color: '#222222',
                            margin: 0,
                            marginBottom: 8,
                        }}
                    >
                        Комментарий куратора
                    </p>
                    <p
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '140%',
                            color: 'rgba(0, 0, 0, 0.48)',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {submission.feedback_text}
                    </p>
                    {/* Информация о проверке */}
                    {(submission.reviewer?.first_name || submission.reviewed_at) && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                            {submission.reviewer?.first_name && (
                                <p
                                    style={{
                                        fontFamily: 'Nunito, sans-serif',
                                        fontWeight: 500,
                                        fontSize: 12,
                                        lineHeight: '14px',
                                        color: 'rgba(0, 0, 0, 0.48)',
                                        margin: 0,
                                    }}
                                >
                                    {submission.reviewer.first_name}
                                </p>
                            )}
                            {submission.reviewed_at && (
                                <p
                                    style={{
                                        fontFamily: 'Nunito, sans-serif',
                                        fontWeight: 500,
                                        fontSize: 12,
                                        lineHeight: '14px',
                                        color: 'rgba(0, 0, 0, 0.48)',
                                        margin: 0,
                                    }}
                                >
                                    {new Date(submission.reviewed_at).toLocaleDateString('ru-RU')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Поле ввода (если можно редактировать) */}
            {canEdit && !showSuccessMessage && (
                <div>
                    <textarea
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder=""
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            borderRadius: 16,
                            resize: 'none',
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: 14,
                            lineHeight: '140%',
                            color: '#000',
                            backgroundColor: '#F9F9F9',
                            outline: 'none',
                            marginBottom: 16,
                        }}
                    />

                    {/* Кнопка отправки */}
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || submitMutation.isPending}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            background: text.trim() && !submitMutation.isPending
                                ? 'linear-gradient(90deg, rgba(34, 34, 34, 0.6) 0%, rgba(117, 117, 117, 0.6) 100%)'
                                : '#E6E6E6',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            borderRadius: 32,
                            border: 'none',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: text.trim() && !submitMutation.isPending ? 700 : 400,
                            fontSize: 16,
                            lineHeight: '140%',
                            color: text.trim() && !submitMutation.isPending ? '#fff' : '#ADADAD',
                            cursor: text.trim() && !submitMutation.isPending ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                        }}
                    >
                        {submitMutation.isPending ? 'Отправка...' : 'Отправить'}
                    </button>
                </div>
            )}

            {/* Сообщение об успешной отправке */}
            {showSuccessMessage && (
                <div
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: 'linear-gradient(90deg, rgba(34, 34, 34, 0.6) 0%, rgba(117, 117, 117, 0.6) 100%)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        borderRadius: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    <img src={whiteOkIcon} alt="ok" style={{ width: 20, height: 20 }} />
                    <span
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 700,
                            fontSize: 16,
                            lineHeight: '140%',
                            color: '#fff',
                        }}
                    >
                        Ответ отправлен
                    </span>
                </div>
            )}
        </div>
    );
};

interface BlockItemProps {
    block: LessonBlock;
    initialState: boolean;
    childBlocks?: LessonBlock[];
    assignmentData?: any;
    userId?: string;
    lessonId?: number;
}

export const BlockItem = ({ block, initialState, childBlocks = [], assignmentData, userId, lessonId }: BlockItemProps) => {
    const [isOpen, setIsOpen] = useState(false); // Изначально закрыт

    // Проверяем, является ли блок заданием (по названию)
    const isAssignment = block.title?.toLowerCase().includes('задание');

    // Определяем статус задания
    const getAssignmentStatus = () => {
        if (!isAssignment || !assignmentData?.submission) return null;

        const status = assignmentData.submission.status;
        if (status === 'approved') {
            return 'Выполнено';
        }
        if (status === 'pending_review' || status === 'submitted') {
            return 'На проверке';
        }
        if (status === 'rejected') {
            return 'Доработка';
        }
        return null;
    };

    const assignmentStatus = getAssignmentStatus();

    return (
        <div>
            {/* Заголовок секции */}
            <div
                onClick={() => setIsOpen((prev) => !prev)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '8px 0',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Стрелка-треугольник */}
                    <svg
                        width="7"
                        height="12"
                        viewBox="0 0 7 12"
                        fill="none"
                        style={{
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            marginRight: 10,
                        }}
                    >
                        <path
                            d="M1 1L6 6L1 11"
                            stroke="#222222"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    {/* Заголовок */}
                    <h3
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 600,
                            fontSize: 16,
                            lineHeight: '100%',
                            color: '#222222',
                            margin: 0,
                        }}
                    >
                        {block.title}
                    </h3>
                </div>

                {/* Статус задания справа */}
                {assignmentStatus && (
                    <div
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.43)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            color: '#fff',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: '120%',
                            padding: '4px 12px',
                            borderRadius: 32,
                        }}
                    >
                        {assignmentStatus}
                    </div>
                )}
            </div>

            {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                    <BlockContent block={block} key={block.id} />
                    {childBlocks.map((childBlock) => (
                        <BlockContent block={childBlock} key={childBlock.id} />
                    ))}
                    {/* Форма сдачи задания (если это задание и есть данные) */}
                    {isAssignment && assignmentData && userId && lessonId && (
                        <AssignmentForm
                            assignmentId={assignmentData.id}
                            userId={userId}
                            lessonId={lessonId}
                            initialText={assignmentData.draft?.draft_text || ''}
                            submission={assignmentData.submission}
                        />
                    )}
                </div>
            )}
        </div>
    );
};
const LessonPage: React.FC = () => {
    const { id: lessonId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isTelegramApp } = useAppContext();
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    // Проверяем статус гостя
    const { isGuest, isLoading: guestCheckLoading } = useGuestStatus(supabaseUser?.id);

    // Состояние для модалки гостя
    const [showGuestModal, setShowGuestModal] = useState(false);

    const [state, setState] = useState<LessonPageState>({
        lesson: null,
        loading: true,
        error: null,
        submission: null,
        progress: null,
        userDataLoading: true, // Изначально пользовательские данные загружаются
        totalAssignments: 0,
        completedAssignments: 0,
        moduleId: null,
        lessonFeedback: null,
    });

    // Создаем Supabase-совместимого User
    const [supabaseCompatUser, setSupabaseCompatUser] = useState<User | null>(null);

    // Состояние для завершения урока
    const [isCompletingLesson, setIsCompletingLesson] = useState(false);

    // Состояние для пересдачи задания
    const [isRetryingSubmission, setIsRetryingSubmission] = useState(false);

    // Получаем информацию о потоке пользователя
    const { data: streamInfo } = useUserStreamInfo(supabaseUser?.id);

    // Загружаем данные заданий с прогрессом
    const { data: assignmentsWithProgress } = useAssignmentsWithProgress(
        supabaseUser?.id,
        lessonId ? parseInt(lessonId) : undefined
    );

    // Загружаем прогресс по заданиям (используется для прогресс-бара, автообновляется при сдаче ДЗ)
    const { data: assignmentProgress } = useAssignmentProgress(
        supabaseUser?.id,
        lessonId ? parseInt(lessonId) : undefined
    );

    // Загружаем технику для этого дня в модуле
    const { data: techniqueData, isLoading: techniqueLoading, error: techniqueError } = useTechniqueByModuleAndDay(
        state.moduleId,
        state.lesson?.order_num || null,
        streamInfo?.streamId || null,
        streamInfo?.tariffId || null
    );

    // Отладочные логи для техники
    console.log('Technique debug:', {
        moduleId: state.moduleId,
        orderNum: state.lesson?.order_num,
        streamId: streamInfo?.streamId,
        tariffId: streamInfo?.tariffId,
        techniqueData,
        techniqueLoading,
        techniqueError,
    });


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

    // Проверяем гостя и показываем модалку
    useEffect(() => {
        if (!guestCheckLoading && isGuest) {
            setShowGuestModal(true);
        }
    }, [isGuest, guestCheckLoading]);

    // Загружаем данные урока
    useEffect(() => {
        const fetchLessonData = async () => {
            if (!lessonId || !supabase) return;

            setState(prev => ({ ...prev, loading: true, error: null }));

            try {
                // Получаем урок с блоками и stage (для получения module_id)
                const { data: lessonData, error: lessonError } = await supabase
                    .from('lessons')
                    .select(`
            *,
            lesson_blocks (*),
            stage:course_stages (
              id,
              stream_module_id
            )
          `)
                    .eq('id', lessonId)
                    .single();

                if (lessonError) {
                    throw new Error(`Ошибка загрузки урока: ${lessonError.message}`);
                }

                // Получаем start_date потока пользователя для расчёта дат
                let streamStartDate = new Date().toISOString().split('T')[0]; // fallback
                if (supabaseUser?.id) {
                    const { data: streamData } = await supabase
                        .from('user_stream_enrollments')
                        .select('streams(start_date)')
                        .eq('user_id', supabaseUser.id)
                        .single();

                    if ((streamData?.streams as any)?.start_date) {
                        streamStartDate = (streamData.streams as any).start_date;
                    }
                }

                // Рассчитываем фактические даты из смещений
                const calculateDateFromOffset = (startDate: string, dayOffset: number, timeString?: string): string => {
                    const start = new Date(startDate);
                    start.setDate(start.getDate() + dayOffset);
                    if (timeString) {
                        const timeParts = timeString.split('T')[1];
                        if (timeParts) {
                            return `${start.toISOString().split('T')[0]}T${timeParts}`;
                        }
                    }
                    return `${start.toISOString().split('T')[0]}T09:00:00.000Z`;
                };

                // Применяем смещения к датам
                const openDayOffset = lessonData.open_day_offset ?? (lessonData.order_num - 1);
                const deadlineDayOffset = lessonData.deadline_day_offset ?? (lessonData.order_num + 1);

                const calculatedOpenAt = calculateDateFromOffset(streamStartDate, openDayOffset, lessonData.open_at);
                const calculatedDeadlineAt = calculateDateFromOffset(streamStartDate, deadlineDayOffset, lessonData.deadline_at);

                // Сортируем блоки по порядку
                const sortedBlocks = lessonData.lesson_blocks?.sort((a: LessonBlock, b: LessonBlock) =>
                    a.order_num - b.order_num) || [];

                const lesson: LessonWithBlocks = {
                    ...lessonData,
                    open_at: calculatedOpenAt,
                    deadline_at: calculatedDeadlineAt,
                    blocks: sortedBlocks,
                };

                // Получаем module_id из stage
                const moduleId = (lessonData as any).stage?.stream_module_id || null;
                console.log('Lesson data stage:', {
                    stage: (lessonData as any).stage,
                    stream_module_id: (lessonData as any).stage?.stream_module_id,
                    moduleId,
                    order_num: lessonData.order_num,
                });

                // Обновляем состояние с уроком - урок грузится независимо от пользователя
                setState(prev => ({
                    ...prev,
                    lesson,
                    loading: false,
                    moduleId,
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
    }, [lessonId, supabaseUser?.id]); // Добавляем зависимость от supabaseUser для пересчёта дат

    // Отдельно загружаем пользовательские данные
    useEffect(() => {
        const fetchUserData = async () => {
            if (!lessonId || !supabaseCompatUser || !supabase) {
                // Если нет пользователя, помечаем что загрузка завершена
                setState(prev => ({ ...prev, userDataLoading: false }));
                return;
            }

            setState(prev => ({ ...prev, userDataLoading: true }));

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

                // Загружаем assignments для этого урока
                const { data: assignmentsData } = await supabase
                    .from('assignments')
                    .select('id')
                    .eq('lesson_id', lessonId);

                const totalAssignments = assignmentsData?.length || 0;

                // Загружаем submissions пользователя по этим assignments
                let completedAssignments = 0;
                if (totalAssignments > 0) {
                    const assignmentIds = assignmentsData?.map(a => a.id) || [];
                    const { data: assignmentSubmissions } = await supabase
                        .from('submissions')
                        .select('id, assignment_id, status')
                        .eq('user_id', supabaseCompatUser.id)
                        .in('assignment_id', assignmentIds)
                        .neq('status', 'rejected');

                    completedAssignments = assignmentSubmissions?.length || 0;
                }

                // Загружаем обратную связь по дню от куратора
                const { data: lessonFeedback } = await supabase
                    .from('lesson_feedback')
                    .select('id, feedback_text, created_at, curator_id')
                    .eq('user_id', supabaseCompatUser.id)
                    .eq('lesson_id', lessonId)
                    .maybeSingle();

                setState(prev => ({
                    ...prev,
                    submission,
                    progress,
                    userDataLoading: false, // Загрузка пользовательских данных завершена
                    totalAssignments,
                    completedAssignments,
                    lessonFeedback,
                }));

                logger.debug('User data loaded', { lessonId, hasSubmission: !!submission, hasProgress: !!progress });

            } catch (error) {
                logger.error('Failed to fetch user data', { lessonId, error });
                // Даже при ошибке помечаем загрузку как завершенную
                setState(prev => ({ ...prev, userDataLoading: false }));
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
                stream_id: streamInfo?.streamId || null, // Привязка к потоку
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

        // Проверяем прогресс по заданиям (используем данные из хука)
        const totalAssignments = assignmentProgress?.total_assignments || 0;
        const completedAssignments = assignmentProgress?.submitted_assignments || 0;
        const hasMultipleAssignments = totalAssignments > 0;
        const allAssignmentsCompleted = hasMultipleAssignments && completedAssignments === totalAssignments;
        const someAssignmentsCompleted = hasMultipleAssignments && completedAssignments > 0 && completedAssignments < totalAssignments;

        // ПРИОРИТЕТ 0: Все задания сданы - Завершено (зеленый)
        if (allAssignmentsCompleted) {
            return {
                type: 'completed',
                text: 'Завершено',
                bgClass: 'bg-green-500',
                icon: '✅'
            };
        }

        // ПРИОРИТЕТ 1: Частичный прогресс - Прогресс (желтый)
        if (someAssignmentsCompleted) {
            return {
                type: 'in_progress',
                text: 'Прогресс',
                bgClass: 'bg-yellow-500',
                icon: '📝'
            };
        }

        // ПРИОРИТЕТ 2: Урок завершен через lesson_progress (для уроков без множественных заданий)
        // Это покрывает случаи ручного управления прогрессом через админку
        if (isLessonCompleted && !hasMultipleAssignments) {
            return {
                type: 'completed',
                text: 'Завершено',
                bgClass: 'bg-green-500',
                icon: '✅'
            };
        }

        // Для урока с заданием
        if (hasAssignment) {
            // Приоритет 1: Пропущенный дедлайн (только если не завершен)
            if (deadlineStatus === 'missed') {
                return {
                    type: 'deadline_missed',
                    text: 'Просрочено',
                    bgClass: 'bg-red-500',
                    icon: '⏰'
                };
            }

            // Приоритет 2: Дедлайн сегодня
            if (deadlineStatus === 'today') {
                return {
                    type: 'deadline_today',
                    text: 'Дедлайн сегодня',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,152,0)_0%,_rgba(255,107,107)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 3: Дедлайн завтра
            if (deadlineStatus === 'tomorrow') {
                return {
                    type: 'deadline_tomorrow',
                    text: 'Дедлайн завтра',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,193,7)_0%,_rgba(255,152,0)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 4: На проверке
            if (submission?.status === 'submitted' || submission?.status === 'pending_review') {
                return {
                    type: 'in_review',
                    text: 'На проверке',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,193,7)_0%,_rgba(255,152,0)_100%)]',
                    icon: '⏳'
                };
            }

            // Приоритет 5: Нужна доработка
            if (submission?.status === 'rejected') {
                return {
                    type: 'needs_retry',
                    text: 'Нужна доработка',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,107,107)_0%,_rgba(255,82,82)_100%)]',
                    icon: '🔄'
                };
            }

            // Приоритет 6: В процессе
            if (hasStarted) {
                return {
                    type: 'in_progress',
                    text: 'В процессе',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]',
                    icon: '📝'
                };
            }

            // Приоритет 7: Не начато
            return {
                type: 'not_started',
                text: 'Не начато',
                bgClass: 'bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]',
                icon: '⚪'
            };
        } else {
            // Для урока без задания
            // Приоритет 1: Пропущенный дедлайн (только если не завершен)
            if (deadlineStatus === 'missed') {
                return {
                    type: 'deadline_missed',
                    text: 'Просрочено',
                    bgClass: 'bg-red-500',
                    icon: '⏰'
                };
            }

            // Приоритет 2: Дедлайн сегодня
            if (deadlineStatus === 'today') {
                return {
                    type: 'deadline_today',
                    text: 'Дедлайн сегодня',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,152,0)_0%,_rgba(255,107,107)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 3: Дедлайн завтра
            if (deadlineStatus === 'tomorrow') {
                return {
                    type: 'deadline_tomorrow',
                    text: 'Дедлайн завтра',
                    bgClass: 'bg-[linear-gradient(135deg,_rgba(255,193,7)_0%,_rgba(255,152,0)_100%)]',
                    icon: '⏰'
                };
            }

            // Приоритет 4: Не начато (дефолтный статус для незавершенных уроков без задания)
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
        const feedback = submission.feedback_text;
        const reviewedAt = submission.reviewed_at;
        const reviewerName = submission.reviewer?.first_name;
        const showFeedback = submission.status === 'approved' || submission.status === 'rejected';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Ваш ответ */}
                {submission.content_text && (
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: 16,
                            padding: 16,
                        }}
                    >
                        <p
                            style={{
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 600,
                                fontSize: 16,
                                lineHeight: '100%',
                                color: '#222222',
                                margin: 0,
                                marginBottom: 12,
                            }}
                        >
                            Ваш ответ
                        </p>
                        <p
                            style={{
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 400,
                                fontSize: 14,
                                lineHeight: '140%',
                                color: 'rgba(0, 0, 0, 0.48)',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {submission.content_text}
                        </p>
                    </div>
                )}

                {/* Комментарий куратора */}
                {showFeedback && feedback && (
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: 16,
                            padding: 16,
                        }}
                    >
                        <p
                            style={{
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 600,
                                fontSize: 16,
                                lineHeight: '100%',
                                color: '#222222',
                                margin: 0,
                                marginBottom: 12,
                            }}
                        >
                            Комментарий куратора
                        </p>
                        <p
                            style={{
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 400,
                                fontSize: 14,
                                lineHeight: '140%',
                                color: 'rgba(0, 0, 0, 0.48)',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {feedback}
                        </p>
                        {/* Информация о проверке */}
                        {(reviewerName || reviewedAt) && (
                            <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                                {reviewerName && (
                                    <p
                                        style={{
                                            fontFamily: 'Nunito, sans-serif',
                                            fontWeight: 500,
                                            fontSize: 12,
                                            lineHeight: '14px',
                                            color: 'rgba(0, 0, 0, 0.48)',
                                            margin: 0,
                                        }}
                                    >
                                        {reviewerName}
                                    </p>
                                )}
                                {reviewedAt && (
                                    <p
                                        style={{
                                            fontFamily: 'Nunito, sans-serif',
                                            fontWeight: 500,
                                            fontSize: 12,
                                            lineHeight: '14px',
                                            color: 'rgba(0, 0, 0, 0.48)',
                                            margin: 0,
                                        }}
                                    >
                                        {new Date(reviewedAt).toLocaleDateString('ru-RU')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Рендер блока контента


    // Состояния загрузки и ошибок
    const loading = state.loading || state.userDataLoading || guestCheckLoading || (isTelegramApp && supabaseUserLoading);
    const error = state.error || (isTelegramApp && supabaseUserError);

    if (loading) {
        return (
            <Page>
                <LoadingSpinner />
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


    // Вычисляем номер недели из order_num урока (7 дней = 1 неделя)
    const weekNumber = Math.ceil((state.lesson.order_num || 1) / 7);

    return (
        <Page back={true} showTabBar={false}>
            {/* Фиксированный фон на весь экран */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${Background1})`,
                backgroundSize: '120%',
                backgroundPosition: 'top',
                backgroundRepeat: 'no-repeat',
                zIndex: -1,
            }} />
            <div className={'text-black'} style={{ minHeight: '100dvh', paddingBottom: '20px', position: 'relative' }}>
                {/* Обложка урока с бейджами внутри - fullscreen до верха */}
                <div
                    style={{
                        position: 'relative',
                        height: 'calc(193px + env(safe-area-inset-top, 0px))',
                        backgroundImage: `url(${buildFileUrl(state.lesson.cover_image_path) || dayBackground})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '0 0 32px 32px',
                    }}
                >

                    {/* Бейджи внутри картинки */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 14,
                            left: 16,
                            right: 16,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                        }}
                    >
                        {/* Бейдж Неделя */}
                        <div
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.43)',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)',
                                borderRadius: 32,
                                padding: '4px 12px',
                                color: '#fff',
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 600,
                                fontSize: 14,
                                lineHeight: '120%',
                            }}
                        >
                            Неделя {weekNumber}
                        </div>

                        {/* Бейдж День */}
                        <div
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.43)',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)',
                                borderRadius: 32,
                                padding: '4px 12px',
                                color: '#fff',
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 600,
                                fontSize: 14,
                                lineHeight: '120%',
                            }}
                        >
                            День {state.lesson.order_num}
                        </div>

                        {/* Бейдж Дедлайн */}
                        {state.lesson.deadline_at && (
                            <div
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(30px)',
                                    WebkitBackdropFilter: 'blur(30px)',
                                    borderRadius: 32,
                                    padding: '4px 12px',
                                    color: '#000',
                                    fontFamily: 'Nunito, sans-serif',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    lineHeight: '120%',
                                }}
                            >
                                До {formatDeadline(state.lesson.deadline_at)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Прогресс по заданиям урока - используем данные из хука для автообновления */}
                {(assignmentProgress?.total_assignments || 0) > 0 && (
                    <div style={{ padding: '16px', margin: '16px', backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 20 }}>
                        {/* Верхняя часть: Выполнено слева, счётчик справа */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <p
                                style={{
                                    fontFamily: 'Nunito, sans-serif',
                                    fontWeight: 500,
                                    fontSize: 12,
                                    lineHeight: '14px',
                                    color: 'rgba(0, 0, 0, 0.48)',
                                    margin: 0,
                                }}
                            >
                                Выполнено
                            </p>
                            <p
                                style={{
                                    fontFamily: 'Nunito, sans-serif',
                                    fontWeight: 500,
                                    fontSize: 12,
                                    lineHeight: '14px',
                                    color: 'rgba(0, 0, 0, 0.48)',
                                    margin: 0,
                                }}
                            >
                                {assignmentProgress?.submitted_assignments || 0}/{assignmentProgress?.total_assignments || 0}
                            </p>
                        </div>
                        {/* Полосы прогресса */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            {Array.from({ length: assignmentProgress?.total_assignments || 0 }).map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        flex: 1,
                                        height: 6,
                                        borderRadius: 12,
                                        backgroundColor: index < (assignmentProgress?.submitted_assignments || 0) ? 'rgba(0, 0, 0, 0.3)' : '#E6E6E6',
                                        backdropFilter: index < (assignmentProgress?.submitted_assignments || 0) ? 'blur(30px)' : 'none',
                                        WebkitBackdropFilter: index < (assignmentProgress?.submitted_assignments || 0) ? 'blur(30px)' : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {/* Блоки контента - каждый в своей карточке с анимацией */}
                <motion.div
                    style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 16px 16px 16px' }}
                    variants={lessonBlocksVariants}
                    initial="hidden"
                    animate="show"
                >
                    {(() => {
                        // Группируем блоки: блоки без заголовков попадают в предыдущий блок с заголовком
                        const groupedBlocks: Array<{ parent: LessonBlock, children: LessonBlock[] }> = [];
                        let currentGroup: { parent: LessonBlock, children: LessonBlock[] } | null = null;

                        state.lesson.blocks.forEach((block) => {
                            if (block.title && block.title.trim() !== '') {
                                // Блок с заголовком - начинаем новую группу
                                currentGroup = { parent: block, children: [] };
                                groupedBlocks.push(currentGroup);
                            } else if (currentGroup) {
                                // Блок без заголовка - добавляем в текущую группу
                                currentGroup.children.push(block);
                            } else {
                                // Блок без заголовка, но нет предыдущего блока с заголовком
                                // Отображаем его как обычный контент без обертки
                                groupedBlocks.push({ parent: block, children: [] });
                            }
                        });

                        return groupedBlocks.map((group, i) => {
                            if (group.parent.title && group.parent.title.trim() !== '') {
                                // Проверяем, является ли блок заданием и находим соответствующие данные
                                const isAssignmentBlock = group.parent.title.toLowerCase().includes('задание');
                                let assignmentData = undefined;

                                if (isAssignmentBlock && assignmentsWithProgress) {
                                    // Ищем assignment по title блока
                                    assignmentData = assignmentsWithProgress.find(
                                        a => a.title.toLowerCase() === group.parent.title.toLowerCase()
                                    );
                                }

                                // Блок с заголовком - используем BlockItem в отдельной карточке
                                return (
                                    <motion.div
                                        key={group.parent.id}
                                        variants={lessonBlockVariants}
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            borderRadius: 16,
                                            padding: 16,
                                        }}
                                    >
                                        <BlockItem
                                            block={group.parent}
                                            initialState={i === 0}
                                            childBlocks={group.children}
                                            assignmentData={assignmentData}
                                            userId={supabaseUser?.id}
                                            lessonId={lessonId ? parseInt(lessonId) : undefined}
                                        />
                                    </motion.div>
                                );
                            } else {
                                // Блок без заголовка и без группы - отображаем просто контент в карточке
                                return (
                                    <motion.div
                                        key={group.parent.id}
                                        variants={lessonBlockVariants}
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            borderRadius: 16,
                                            padding: 16,
                                        }}
                                    >
                                        <BlockContent block={group.parent} />
                                    </motion.div>
                                );
                            }
                        });
                    })()}
                </motion.div>

                {/* Комментарий куратора (обратная связь по дню) - показывается всегда */}
                <div style={{ padding: '0 16px 20px 16px' }}>
                    <div
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: 16,
                            padding: 16,
                        }}
                    >
                        {/* Заголовок с датой */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <p
                                style={{
                                    fontFamily: 'Nunito, sans-serif',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    lineHeight: '100%',
                                    color: '#222222',
                                    margin: 0,
                                }}
                            >
                                Комментарий куратора
                            </p>
                            {state.lessonFeedback?.created_at && (
                                <p
                                    style={{
                                        fontFamily: 'Nunito, sans-serif',
                                        fontWeight: 400,
                                        fontSize: 14,
                                        lineHeight: '120%',
                                        color: '#ADADAD',
                                        margin: 0,
                                    }}
                                >
                                    {new Date(state.lessonFeedback.created_at).toLocaleDateString('ru-RU')}
                                </p>
                            )}
                        </div>
                        {/* Область с текстом */}
                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 12,
                                padding: 12,
                            }}
                        >
                            <p
                                style={{
                                    fontFamily: 'Nunito, sans-serif',
                                    fontWeight: 400,
                                    fontSize: 14,
                                    lineHeight: '120%',
                                    color: state.lessonFeedback?.feedback_text ? '#222222' : '#ADADAD',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {state.lessonFeedback?.feedback_text || 'Комментарий пока не добавлен'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Техника дня - если есть техника для этого дня в модуле */}
                {techniqueData?.material && (
                    <div style={{ padding: '0 16px 20px 16px' }}>
                        <div
                            onClick={() => navigate(`/techniques/${techniqueData.material.id}`)}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                borderRadius: 16,
                                padding: 16,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            {/* Обложка техники */}
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    backgroundColor: '#E6E6E6',
                                }}
                            >
                                {techniqueData.material.cover_image_path ? (
                                    <img
                                        src={buildFileUrl(techniqueData.material.cover_image_path) || ''}
                                        alt={techniqueData.material.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#E8F4FD',
                                        }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 18V5l12-2v13" />
                                            <circle cx="6" cy="18" r="3" />
                                            <circle cx="18" cy="16" r="3" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Информация о технике */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                    style={{
                                        fontFamily: 'Nunito, sans-serif',
                                        fontWeight: 500,
                                        fontSize: 12,
                                        lineHeight: '14px',
                                        color: 'rgba(0, 0, 0, 0.48)',
                                        margin: 0,
                                        marginBottom: 4,
                                    }}
                                >
                                    Техника дня
                                </p>
                                <p
                                    style={{
                                        fontFamily: 'Nunito, sans-serif',
                                        fontWeight: 600,
                                        fontSize: 16,
                                        lineHeight: '100%',
                                        color: '#222222',
                                        margin: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {techniqueData.material.name}
                                </p>
                                {techniqueData.material.duration_seconds && (
                                    <p
                                        style={{
                                            fontFamily: 'Nunito, sans-serif',
                                            fontWeight: 400,
                                            fontSize: 12,
                                            lineHeight: '14px',
                                            color: 'rgba(0, 0, 0, 0.48)',
                                            margin: 0,
                                            marginTop: 4,
                                        }}
                                    >
                                        {Math.floor(techniqueData.material.duration_seconds / 60)} мин
                                    </p>
                                )}
                            </div>

                            {/* Стрелка */}
                            <div style={{ flexShrink: 0 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Блок завершенного урока без задания */}
                {!hasAssignment && isLessonCompleted && state.progress && (
                    <div className={'p-4 pb-8'}>
                        <div

                            style={{
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
                            <Ripple className="rounded-3xl overflow-hidden">
                                <Button
                                    variant="black"
                                    onClick={() => state.lesson && navigate(`/library/stage/${state.lesson.stage_id}`)}
                                    size="lg"
                                    className={"w-full font-bold leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]"}
                                >
                                    Вернуться ко всем урокам ступени
                                </Button>
                            </Ripple>
                        )}
                    </div>
                )}



                {/* Кнопка завершения урока (если нет задания и урок не завершен) */}
                {!hasAssignment && !isLessonCompleted && state.lesson && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8 z-50">
                        <Button
                            variant="black"
                            onClick={handleCompleteLesson}
                            disabled={!supabaseCompatUser || isCompletingLesson}
                            className={"w-full font-bold leading-5 text-white py-2 px-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]"}
                            size="lg"
                        >
                            {isCompletingLesson ? 'Завершаем...' : '✓ Урок пройден'}
                        </Button>
                    </div>
                )}

                {/* Отступ для safe area снизу */}
                <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
            </div>

            {/* Модалка для гостей */}
            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => {
                    setShowGuestModal(false);
                    // Редирект на страницу модуля при закрытии
                    if (state.lesson?.stage_id) {
                        navigate(`/library/stage/${state.lesson.stage_id}`);
                    } else {
                        navigate('/library');
                    }
                }}
                title="Содержание урока доступно только ученикам"
                description="Зарегистрируйтесь, чтобы получить доступ к материалам и заданиям"
            />
        </Page>
    );
};

export default LessonPage; 