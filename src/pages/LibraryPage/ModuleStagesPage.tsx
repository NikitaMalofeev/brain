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
 * Хук для получения названия модуля
 */
function useModuleName(moduleId: string | undefined) {
    return useQuery({
        queryKey: ['module-name', moduleId],
        queryFn: async () => {
            if (!moduleId || !supabase) return null;

            const { data } = await supabase
                .from('stream_modules')
                .select('name')
                .eq('id', moduleId)
                .single();

            return data?.name || null;
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
 */
function useModuleAssignmentsProgress(userId: string | undefined, moduleId: string | undefined) {
    return useQuery({
        queryKey: ['module-assignments-progress', userId, moduleId],
        queryFn: async () => {
            if (!userId || !moduleId || !supabase) {
                return { totalAssignments: 0, completedAssignments: 0 };
            }

            // Получаем все lesson_id из ступеней модуля
            const { data: stagesData } = await supabase
                .from('course_stages')
                .select('id')
                .eq('stream_module_id', moduleId);

            if (!stagesData || stagesData.length === 0) {
                return { totalAssignments: 0, completedAssignments: 0 };
            }

            const stageIds = stagesData.map(s => s.id);

            // Получаем все уроки этих ступеней
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('id')
                .in('stage_id', stageIds);

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

    const initDataSignal = useSignal(initDataState);
    const { supabaseUser, loading: userLoading } = useSupabaseUser(initDataSignal);
    const { isGuest } = useGuestStatus(supabaseUser?.id);

    const { data: stages, isLoading: stagesLoading, error: stagesError } = useModuleStages(moduleId || null);

    // Получаем название модуля
    const { data: moduleName } = useModuleName(moduleId);

    // Получаем данные о доступе к модулю
    const { data: accessData, isLoading: accessLoading } = useModuleAccessData(supabaseUser?.id, moduleId);
    const streamStartDate = accessData?.streamStartDate;
    const moduleUnlockOffset = accessData?.moduleUnlockOffset || 0;

    // Получаем прогресс по заданиям модуля
    const { data: progressData } = useModuleAssignmentsProgress(supabaseUser?.id, moduleId);
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

    const loading = userLoading || stagesLoading || accessLoading;

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
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка ступеней...</p>
                </div>
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

    return (
        <Page showTabBar={false}>
            <div className="bg-[url('/bg3.jpg')] min-h-full bg-cover bg-top text-black">
                {/* Белая карточка с заголовком и прогрессом */}
                <div className="bg-white rounded-2xl mx-4 mt-4 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-xl">{displayModuleName}</p>
                        <Ripple className="rounded-full overflow-hidden">
                            <div className="cursor-pointer w-5 h-5 flex items-center justify-center">
                                <span className="text-gray-400 text-sm">ⓘ</span>
                            </div>
                        </Ripple>
                    </div>
                    <p className="text-sm text-[#8C8C8C]">
                        {totalAssignments > 0
                            ? `Прогресс по заданиям: ${completedAssignments} из ${totalAssignments}`
                            : `${totalStages} ${totalStages === 1 ? 'ступень' : totalStages < 5 ? 'ступени' : 'ступеней'}`
                        }
                    </p>
                    {/* Прогресс-бар из сегментов */}
                    <div className="flex items-center gap-1 w-full">
                        {stages.map((_, i) => (
                            <div key={i} className={clsx("flex-1 h-1 rounded-full", {
                                "bg-[#68B1EB]": i < unlockedStages,
                                "bg-[#E5E5E5]": i >= unlockedStages
                            })} />
                        ))}
                    </div>
                </div>

                {/* Сетка ступеней 2 колонки */}
                <motion.div
                    className="p-4 grid grid-cols-2 gap-3"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {stagesWithAccess.map((stage, index) => {
                        const firstLesson = stage.lessons?.[0];
                        const coverUrl = buildFileUrl(stage.cover_image_path) || '/test.png';
                        const isUnlocked = (stage as any).isUnlocked !== false;

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
                                    <Ripple className="rounded-2xl overflow-hidden w-full shadow-sm">
                                        <div
                                            onClick={() => firstLesson && handleStageClick(firstLesson.id, isUnlocked)}
                                            className="flex flex-col w-full bg-white cursor-pointer"
                                        >
                                            {/* Изображение с бейджами */}
                                            <div className="relative w-full aspect-[4/3]">
                                                <img
                                                    src={coverUrl}
                                                    alt={stage.name}
                                                    className={clsx('w-full h-full object-cover', !isUnlocked && 'brightness-75')}
                                                    onError={(e) => { e.currentTarget.src = '/test.png'; }}
                                                />

                                                {/* Бейдж с номером недели - левый верхний угол */}
                                                <div className="absolute top-2 left-2 bg-[#A89080]/90 text-white text-[10px] font-medium px-2 py-1 rounded-md">
                                                    Неделя {weekNumber}
                                                </div>

                                                {/* Бейдж "Не доступно" с замком - для заблокированных */}
                                                {!isUnlocked && (
                                                    <div className="absolute bottom-2 left-2 bg-[#8C8C8C]/90 text-white text-[10px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                                                        <span>Не доступно</span>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                                        </svg>
                                                    </div>
                                                )}
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
        </Page>
    );
};

export default ModuleStagesPage;
