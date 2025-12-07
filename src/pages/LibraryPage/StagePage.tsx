import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { User } from '@supabase/supabase-js';
import { Page } from '@/components/Page';
import LessonCard from '@/components/LessonCard/LessonCard';
import useStageDetails, { StageDetailsData } from '@/lib/supabase/hooks/useStageDetails';
import useLibraryStages, { LibraryStageData } from '@/lib/supabase/hooks/useLibraryStages';
import { useSupabaseUser, useActiveCourse, useUserStreamInfo } from '@/lib/supabase/hooks';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/lib/logger';
import NativeModal from "@/components/NativeModal.tsx";
import GuestBlockedModal from '@/components/GuestBlockedModal';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { getNounPluralForm } from '@/helpers/pluralize';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

const listVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'tween',
            ease: 'easeOut',
            duration: 0.3
        }
    },
};

const StagePage: React.FC = () => {
    const { id: stageId } = useParams<{ id: string }>();

    const [isOpen, setIsOpen] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);

    const navigate = useNavigate();

    // Получаем информацию из глобального контекста
    const { isTelegramApp } = useAppContext();

    // Получаем initData из Telegram SDK если мы в Telegram
    const initDataSignal = useSignal(initDataState);

    // Получаем данные пользователя
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    // Проверяем статус гостя
    const { isGuest } = useGuestStatus(supabaseUser?.id);

    // Создаем Supabase-совместимого User из supabaseUser
    const [supabaseCompatUser, setSupabaseCompatUser] = useState<User | null>(null);

    useEffect(() => {
        if (supabaseUser) {
            // Создаем Supabase User-совместимый объект из supabaseUser
            const compatUser: User = {
                id: supabaseUser.id, // UUID из Supabase
                app_metadata: {},
                user_metadata: {
                    full_name: supabaseUser.first_name,
                },
                aud: '',
                created_at: supabaseUser.created_at || new Date().toISOString(),
            } as User;

            setSupabaseCompatUser(compatUser);
            logger.debug('Created Supabase-compatible user for StagePage', { userId: compatUser.id });
        } else {
            setSupabaseCompatUser(null);
        }
    }, [supabaseUser]);

    // Определяем активного пользователя
    const activeUser = supabaseCompatUser;

    // Используем хук для получения деталей ступени
    const { stageDetails, loading: stageLoading, error: stageError } = useStageDetails(activeUser, stageId || '');

    // Получаем активный курс пользователя
    const { activeCourse } = useActiveCourse(supabaseUser?.id);

    // Получаем информацию о потоке
    const { data: streamInfo } = useUserStreamInfo(supabaseUser?.id);

    // Получаем данные обо всех ступенях для подсчета прогресса до следующей ступени
    const { stages, loading: stagesLoading } = useLibraryStages(
        supabaseUser?.id || null,
        activeCourse?.course_id || null
    );

    // Автоскролл к текущему уроку
    useEffect(() => {
        if (!stageDetails || !stageDetails.lessons || stageDetails.lessons.length === 0) {
            return;
        }

        // Небольшая задержка чтобы дать время для рендера
        const timeoutId = setTimeout(() => {
            // Находим первый разблокированный незавершенный урок
            const currentLesson = stageDetails.lessons.find(
                (lesson) => lesson.is_unlocked && !lesson.is_completed
            );

            if (currentLesson) {
                const element = document.getElementById(`lesson-${currentLesson.lesson_id}`);
                if (element) {
                    logger.debug('Auto-scrolling to current lesson', { lessonId: currentLesson.lesson_id });
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
            } else {
                // Если все уроки завершены или все заблокированы, скроллим в начало
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [stageDetails]);

    // Объединяем состояния загрузки
    const loading = stageLoading || stagesLoading || (isTelegramApp && supabaseUserLoading);

    // Объединяем ошибки
    const error = stageError || (isTelegramApp && supabaseUserError);

    // Проверка жизней пользователя для отображения предупреждения
    const livesRemaining = supabaseUser?.lives_remaining ?? 3;
    const showLivesWarning = livesRemaining === 0;

    // Обработчик клика на урок
    const handleLessonClick = (lessonId: number) => {
        // Если гость - показываем модалку блокировки
        if (isGuest) {
            setShowGuestModal(true);
            return;
        }
        logger.debug('Navigating to lesson', { lessonId });
        navigate(`/library/lesson/${lessonId}`);
    };

    // Обработчик возврата к библиотеке
    const handleBack = () => {
        navigate('/library');
    };

    if (loading) {
        return (
            <Page>
                <LoadingSpinner />
            </Page>
        );
    }

    if (error) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
                    Ошибка загрузки: {error.message}
                </div>
            </Page>
        );
    }

    if (!stageDetails) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    Ступень не найдена
                </div>
            </Page>
        );
    }
    function getNextById(arr: LibraryStageData[], currentId: string | undefined): LibraryStageData | undefined {
        const idx = arr.findIndex(item => item.stage_id === +(currentId || 4));
        return idx !== -1 && idx + 1 < arr.length ? arr[idx + 1] : undefined;
    }
    const nextStage = getNextById(stages, stageId);
    const completedLessons = stageDetails.lessons.filter(lesson => lesson.is_completed).length;
    const unlockedLessons = stageDetails.lessons.filter(lesson => lesson.is_unlocked).length;
    const totalLessons = stageDetails.lessons.length;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const lessonsRemaining = totalLessons - completedLessons;
    const lessonsLocked = totalLessons - unlockedLessons;
    const progressText = lessonsRemaining > 0
        ? `Еще ${lessonsRemaining} заданий до завершения ступени`
        : 'Ступень пройдена!';

    // Прогресс по заданиям модуля
    const totalAssignments = stageDetails.total_stage_assignments || 0;
    const completedAssignments = stageDetails.completed_stage_assignments || 0;
    const assignmentsProgressPercent = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Подсчитываем количество НЕоткрытых уроков в текущей ступени
    const unlockedLessonsInCurrentStage = stageDetails.lessons.filter(lesson => !lesson.is_unlocked).length;

    let nextStageText = '';

    if (unlockedLessonsInCurrentStage > 0) {
        const word = getNounPluralForm(unlockedLessonsInCurrentStage, 'день', 'дня', 'дней');
        if (nextStage) {
            nextStageText = `Еще ${unlockedLessonsInCurrentStage} ${word} до перехода на уровень «${nextStage?.stage_name}»`;
        } else {
            nextStageText = `Еще ${unlockedLessonsInCurrentStage} ${word} до полного открытия ступени`;
        }
    } else {
        // Если все уроки в текущей ступени открыты, проверяем следующую ступень
        const currentStageIndex = stages.findIndex(s => s.stage_id === parseInt(stageId || '0'));
        const nextStageIndex = stages.findIndex(s => !s.is_unlocked);

        if (nextStageIndex !== -1 && nextStageIndex > currentStageIndex) {
            const stageWords = ["первой", "второй", "третьей", "четвёртой", "пятой"];
            const nextStageName = stageWords[nextStageIndex] || `${nextStageIndex + 1}-й`;
            nextStageText = `Все задания до ступени «${nextStage?.stage_name}» открыты`;
        } else {
            nextStageText = 'Все уроки открыты!';
        }
    }

    return (
        <Page showTabBar={false}>
            <div className={'page-bg-container bg-[url("/bg3.jpg")] min-h-full bg-cover bg-top text-black'}>
                {/* Белая карточка с заголовком и прогрессом */}
                <div className={'bg-white rounded-2xl mx-4 mt-4 p-4 flex flex-col gap-3'}>
                    <div className={'flex items-center justify-between'}>
                        <div className={'flex flex-col gap-0.5'}>
                            <div className={'flex items-center gap-2'}>
                                <p className={'font-bold text-xl'}>{stageDetails.stage_name}</p>
                                <Ripple className="rounded-full overflow-hidden">
                                    <img
                                        onClick={() => setIsOpen(true)}
                                        src={'/ask-icon.svg'}
                                        alt={'Информация'}
                                        className="cursor-pointer w-5 h-5"
                                    />
                                </Ripple>
                            </div>
                            <p className={'text-sm text-[#8C8C8C]'}>{nextStageText}</p>
                        </div>
                    </div>
                    {/* Прогресс-бар из сегментов */}
                    <div className={'flex items-center gap-1 w-full'}>
                        {Array.from({ length: totalLessons }).map((_, i) => (
                            <div key={i} className={clsx("flex-1 h-1 rounded-full", {
                                "bg-[#68B1EB]": i < unlockedLessons,
                                "bg-[#E5E5E5]": i >= unlockedLessons
                            })} />
                        ))}
                    </div>
                </div>

                {/* Сетка уроков 2 колонки */}
                <motion.div
                    className={'p-4 grid grid-cols-2 gap-3'}
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {stageDetails.lessons.map((lesson) => (
                        <motion.div
                            key={lesson.lesson_id}
                            id={`lesson-${lesson.lesson_id}`}
                            variants={itemVariants}
                        >
                            <LessonCard
                                lesson={lesson}
                                onClick={handleLessonClick}
                                isGuest={isGuest}
                                stageName={stageDetails.stage_name}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
            <NativeModal title={stageDetails.stage_name} description={stageDetails.stage_description} isOpen={isOpen} setIsOpen={setIsOpen} />
            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                title="Содержание урока доступно только ученикам"
                description="Зарегистрируйтесь, чтобы получить доступ к материалам урока"
            />
        </Page>
    );
};

export default StagePage; 