import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { useQuery } from '@tanstack/react-query';
import { Page } from '@/components/Page';
import { useSupabaseUser } from '@/lib/supabase/hooks';
import { useModuleStages } from '@/lib/supabase/hooks/useModuleStages';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { clsx } from 'clsx';
import TooltipIcon from '@/shared/assets/icons/tooltip.svg';
import Background1 from '@/shared/assets/images/background1.png';
import LessonDefault from '@/shared/assets/images/lessonDefault.png';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

// Удаляем текст в квадратных скобках из названия
const cleanName = (name: string) => name.replace(/\s*\[.*?\]/g, '').trim();

const listVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: 'tween', ease: 'easeOut', duration: 0.3 }
    },
};

/**
 * Хук для получения данных модуля (название, описание, order_num)
 * Получаем напрямую из stream_modules
 */
function useModuleInfo(moduleId: string | undefined) {
    return useQuery({
        queryKey: ['module-info', moduleId],
        queryFn: async () => {
            if (!moduleId || !supabase) return null;

            // Получаем данные модуля напрямую
            const { data, error } = await supabase
                .from('stream_modules')
                .select('id, name, order_num')
                .eq('id', moduleId)
                .single();

            if (error || !data) return null;

            return {
                name: data.name,
                description: null, // stream_modules не имеет description
                order_num: data.order_num,
            };
        },
        enabled: !!moduleId,
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Хук для получения данных о доступе к модулю (stream_start_date, module_unlock_offset)
 */
function useModuleAccessData(userId: string | undefined, moduleId: string | undefined) {
    return useQuery({
        queryKey: ['module-access-data', userId, moduleId],
        queryFn: async () => {
            if (!userId || !moduleId || !supabase) {
                return { streamStartDate: null, moduleUnlockOffset: 0 };
            }

            // Получаем start_date потока пользователя
            const { data: enrollmentData } = await supabase
                .from('user_stream_enrollments')
                .select('streams(start_date)')
                .eq('user_id', userId)
                .single();

            const streamStartDate = (enrollmentData?.streams as any)?.start_date || null;

            // Получаем unlock_offset_days модуля для тарифа пользователя
            const { data: offsetData } = await supabase
                .from('user_tariffs')
                .select(`
                    tariff_id,
                    user_stream_enrollments!inner(stream_id),
                    stream_tariffs!inner(
                        tariff_stream_modules!inner(
                            unlock_offset_days,
                            stream_module_id
                        )
                    )
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            let moduleUnlockOffset = 0;
            if (offsetData?.stream_tariffs) {
                const tariffs = Array.isArray(offsetData.stream_tariffs)
                    ? offsetData.stream_tariffs
                    : [offsetData.stream_tariffs];
                for (const st of tariffs) {
                    const modules = Array.isArray(st.tariff_stream_modules)
                        ? st.tariff_stream_modules
                        : [st.tariff_stream_modules];
                    const found = modules.find((m: any) => m.stream_module_id === moduleId);
                    if (found) {
                        moduleUnlockOffset = found.unlock_offset_days || 0;
                        break;
                    }
                }
            }

            return { streamStartDate, moduleUnlockOffset };
        },
        enabled: !!userId && !!moduleId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Хук для получения прогресса по заданиям модуля
 * Теперь работает напрямую с уроками через stream_module_id
 */
function useModuleAssignmentsProgress(userId: string | undefined, moduleId: string | undefined) {
    return useQuery({
        queryKey: ['module-assignments-progress', userId, moduleId],
        queryFn: async () => {
            if (!userId || !moduleId || !supabase) {
                return { totalAssignments: 0, completedAssignments: 0 };
            }

            // Получаем все уроки модуля напрямую через stream_module_id
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('id')
                .eq('stream_module_id', moduleId);

            if (!lessonsData || lessonsData.length === 0) {
                return { totalAssignments: 0, completedAssignments: 0 };
            }

            const lessonIds = lessonsData.map(l => l.id);

            // Получаем все задания этих уроков
            const { data: assignmentsData } = await supabase
                .from('assignments')
                .select('id')
                .in('lesson_id', lessonIds);

            const totalAssignments = assignmentsData?.length || 0;

            if (totalAssignments === 0) {
                return { totalAssignments: 0, completedAssignments: 0 };
            }

            const assignmentIds = assignmentsData?.map(a => a.id) || [];

            // Получаем выполненные задания пользователя
            const { data: submissionsData } = await supabase
                .from('submissions')
                .select('id')
                .eq('user_id', userId)
                .in('assignment_id', assignmentIds)
                .eq('status', 'approved');

            const completedAssignments = submissionsData?.length || 0;

            return { totalAssignments, completedAssignments };
        },
        enabled: !!userId && !!moduleId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Страница списка ступеней модуля
 * Стилизована как StagePage (уроки) - белая шапка + фон с карточками
 */
const ModuleStagesPage: React.FC = () => {
    const { moduleId } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);
    const { isGuest } = useGuestStatus(supabaseUser?.id);

    const { data: stages, isLoading: stagesLoading, error: stagesError } = useModuleStages(moduleId || null);

    // Получаем данные модуля (название, описание, order_num)
    const { data: moduleInfo, isLoading: moduleInfoLoading, error: moduleInfoError } = useModuleInfo(moduleId);
    console.log('🔍 [DEBUG] moduleId:', moduleId);
    console.log('🔍 [DEBUG] moduleInfo:', moduleInfo);
    console.log('🔍 [DEBUG] moduleInfoLoading:', moduleInfoLoading);
    console.log('🔍 [DEBUG] moduleInfoError:', moduleInfoError);
    const moduleName = moduleInfo?.name;
    const moduleDescription = moduleInfo?.description;
    const moduleOrderNum = moduleInfo?.order_num || 1;
    // Используем локальную картинку как на MainPage: /step11.png, /step22.png и т.д.
    const moduleCoverUrl = `/step${moduleOrderNum}${moduleOrderNum}.png`;

    // Получаем данные о доступе к модулю
    const { data: accessData, isLoading: accessLoading } = useModuleAccessData(supabaseUser?.id, moduleId);
    const streamStartDate = accessData?.streamStartDate;
    const moduleUnlockOffset = accessData?.moduleUnlockOffset || 0;

    // Получаем прогресс по заданиям модуля
    const { data: progressData, isLoading: progressLoading } = useModuleAssignmentsProgress(supabaseUser?.id, moduleId);
    const totalAssignments = progressData?.totalAssignments || 0;
    const completedAssignments = progressData?.completedAssignments || 0;
    const assignmentsProgressPercent = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Вычисляем доступность каждой ступени на основе open_day_offset
    const stagesWithAccess = useMemo(() => {
        if (!stages || !streamStartDate) return stages || [];

        const now = new Date();
        const startDate = new Date(streamStartDate);

        return stages.map(stage => {
            const firstLesson = stage.lessons?.[0];
            // open_day_offset теперь 1-based: 1 = первый день модуля
            const lessonOpenOffset = firstLesson?.open_day_offset ?? 1;

            // Дата открытия = stream_start_date + module_unlock_offset + (lesson_open_offset - 1)
            // Вычитаем 1 потому что day 1 = первый день (offset 0)
            const openDate = new Date(startDate);
            openDate.setDate(openDate.getDate() + moduleUnlockOffset + (lessonOpenOffset - 1));

            const isUnlocked = now >= openDate;

            return {
                ...stage,
                isUnlocked,
                openDate,
            };
        });
    }, [stages, streamStartDate, moduleUnlockOffset]);

    const loading = userLoading || stagesLoading || accessLoading || moduleInfoLoading;

    const handleStageClick = (lessonId: number, isUnlocked: boolean) => {
        if (isGuest) {
            setShowGuestModal(true);
            return;
        }
        if (!isUnlocked) {
            return; // Не переходим если заблокировано
        }
        navigate(`/library/lesson/${lessonId}`);
    };

    if (loading) {
        return (
            <Page showTabBar={false}>
                <LoadingSpinner />
            </Page>
        );
    }

    if (stagesError) {
        return (
            <Page showTabBar={false}>
                <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
                    Ошибка: {stagesError.message}
                </div>
            </Page>
        );
    }

    if (!stages || stages.length === 0) {
        return (
            <Page showTabBar={false}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                    <p className="text-gray-500 text-center mb-4">В этом модуле пока нет ступеней</p>
                    <button onClick={() => navigate('/')} className="text-blue-600 font-medium">
                        Вернуться назад
                    </button>
                </div>
            </Page>
        );
    }

    const totalStages = stages.length;
    const unlockedStages = stagesWithAccess.filter(s => (s as any).isUnlocked !== false).length;

    // Название модуля из хука или fallback (очищенное от скобок)
    const displayModuleName = cleanName(moduleName || 'Модуль');

    // Прогресс для полосы - синхронизируем с заданиями если они есть
    // Начинаем с 0 пока данные загружаются, чтобы не было анимации назад
    const progressPercent = progressLoading
        ? 0
        : (totalAssignments > 0
            ? assignmentsProgressPercent
            : (totalStages > 0 ? (unlockedStages / totalStages) * 100 : 0));

    return (
        <Page showTabBar={false}>
            <div className="min-h-full text-black pt-4 px-4 pb-4" style={{ backgroundImage: `url(${Background1})`, backgroundSize: '120%', backgroundPosition: 'top', backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat' }}>
                {/* Белая карточка с заголовком и прогрессом */}
                <div
                    className="p-4 flex flex-col"
                    style={{
                        backgroundColor: '#FFFFFFCC',
                        borderRadius: 20,
                    }}
                >
                    {/* Заголовок с иконкой */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <p
                            style={{
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 600,
                                fontSize: 20,
                                lineHeight: '100%',
                                color: '#000',
                                margin: 0,
                            }}
                        >
                            {displayModuleName}
                        </p>
                        <img
                            src={TooltipIcon}
                            alt="info"
                            style={{ width: 16, height: 16, marginLeft: 8, cursor: 'pointer' }}
                            onClick={() => setShowInfoModal(true)}
                        />
                    </div>
                    {/* Описание прогресса */}
                    <p
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '120%',
                            color: '#000',
                            marginBottom: 12,
                        }}
                    >
                        {totalAssignments > 0
                            ? `Прогресс по заданиям: ${completedAssignments} из ${totalAssignments}`
                            : `${totalStages} ${totalStages === 1 ? 'ступень' : totalStages < 5 ? 'ступени' : 'ступеней'}`
                        }
                    </p>
                    {/* Прогресс-бар слитный */}
                    <div
                        style={{
                            width: '100%',
                            height: 6,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${progressPercent}%`,
                                height: '100%',
                                backgroundColor: '#0000004D',
                                borderRadius: 12,
                                transition: 'width 0.3s ease',
                            }}
                        />
                    </div>
                </div>

                {/* Сетка ступеней 2 колонки */}
                <motion.div
                    className="grid grid-cols-2"
                    style={{ gap: 8, marginTop: 16 }}
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {stagesWithAccess.map((stage, index) => {
                        const firstLesson = stage.lessons?.[0];
                        const coverUrl = buildFileUrl(stage.cover_image_path) || LessonDefault;
                        // Для гостей все ступени заблокированы
                        const isUnlocked = isGuest ? false : (stage as any).isUnlocked !== false;

                        // Рассчитываем неделю и день относительно открытия модуля
                        // open_day_offset теперь 1-based: 1 = первый день, 7 = конец первой недели, 8 = начало второй
                        const lessonOpenOffset = firstLesson?.open_day_offset ?? 1;
                        const weekNumber = Math.ceil(lessonOpenOffset / 7);
                        const dayNumber = lessonOpenOffset; // Уже 1-based

                        return (
                            <motion.div key={stage.id} variants={itemVariants}>
                                <motion.div
                                    whileTap={isUnlocked || isGuest ? { scale: 0.97 } : {}}
                                    style={{ touchAction: 'manipulation' }}
                                    className="w-full"
                                >
                                    <Ripple className="rounded-3xl overflow-hidden w-full shadow-sm">
                                        <div
                                            onClick={() => firstLesson && handleStageClick(firstLesson.id, isUnlocked)}
                                            className="flex flex-col w-full bg-white cursor-pointer"
                                        >
                                            {/* Изображение с бейджами */}
                                            <div className="relative w-full" style={{ maxHeight: 140, overflow: 'hidden' }}>
                                                <img
                                                    src={coverUrl}
                                                    alt={stage.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.src = LessonDefault; }}
                                                />
                                                {/* Затемнение для заблокированных */}
                                                {!isUnlocked && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            backgroundColor: '#0000007A',
                                                        }}
                                                    />
                                                )}

                                                {/* Бейджи в одном flex-контейнере */}
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 12,
                                                        left: 12,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 12,
                                                        zIndex: 10,
                                                        isolation: 'isolate',
                                                    }}
                                                >
                                                    {/* Бейдж с номером недели */}
                                                    <div
                                                        style={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                            backdropFilter: 'blur(30px)',
                                                            WebkitBackdropFilter: 'blur(30px)',
                                                            borderRadius: 32,
                                                            padding: '4px 12px',
                                                            color: '#fff',
                                                            fontFamily: 'Nunito, sans-serif',
                                                            fontWeight: 600,
                                                            fontSize: 14,
                                                            lineHeight: '120%',
                                                            width: 'fit-content',
                                                        }}
                                                    >
                                                        Неделя {weekNumber}
                                                    </div>

                                                    {/* Бейдж "Не доступно" с замком - для заблокированных */}
                                                    {!isUnlocked && (
                                                        <div
                                                            style={{
                                                                backgroundColor: '#ADADAD',
                                                                backdropFilter: 'blur(30px)',
                                                                WebkitBackdropFilter: 'blur(30px)',
                                                                borderRadius: 32,
                                                                padding: '4px 8px',
                                                                color: '#fff',
                                                                fontFamily: 'Nunito, sans-serif',
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                                lineHeight: '120%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                width: 'fit-content',
                                                            }}
                                                        >
                                                            <span>Не доступно</span>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* День с открытия модуля снизу */}
                                            <div className="p-3 bg-white">
                                                <p className="font-semibold text-sm text-black truncate">
                                                    День {dayNumber}
                                                </p>
                                            </div>
                                        </div>
                                    </Ripple>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                title="Ступени доступны только ученикам"
                description="Зарегистрируйтесь для доступа"
            />

            {/* Модалка с информацией о модуле */}
            {showInfoModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowInfoModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 24,
                    }}
                >
                    {/* Карточка модалки */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: 20,
                            padding: 16,
                            maxWidth: 300,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        {/* Картинка модуля */}
                        <img
                            src={moduleCoverUrl}
                            alt={displayModuleName}
                            style={{
                                width: '100%',
                                aspectRatio: '16/9',
                                objectFit: 'cover',
                                borderRadius: 12,
                                marginBottom: 16,
                            }}
                            onError={(e) => { e.currentTarget.src = '/test.png'; }}
                        />
                        {/* Название */}
                        <p
                            style={{
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 700,
                                fontSize: 18,
                                color: '#000',
                                textAlign: 'center',
                                margin: 0,
                                marginBottom: 8,
                            }}
                        >
                            {displayModuleName}
                        </p>
                        {/* Описание */}
                        {moduleDescription && (
                            <p
                                style={{
                                    fontFamily: 'Nunito, sans-serif',
                                    fontWeight: 400,
                                    fontSize: 14,
                                    color: '#8C8C8C',
                                    textAlign: 'center',
                                    margin: 0,
                                }}
                            >
                                {moduleDescription}
                            </p>
                        )}
                    </motion.div>

                    {/* Кнопка закрытия */}
                    <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => setShowInfoModal(false)}
                        style={{
                            marginTop: 16,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'linear-gradient(109.65deg, #E1C1F4 13.64%, #B862EA 124.92%)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </motion.button>
                </motion.div>
            )}
        </Page>
    );
};

export default ModuleStagesPage;
