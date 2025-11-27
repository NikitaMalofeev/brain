import React, { useState } from 'react';
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

    // Получаем прогресс по заданиям модуля
    const { data: progressData } = useModuleAssignmentsProgress(supabaseUser?.id, moduleId);
    const totalAssignments = progressData?.totalAssignments || 0;
    const completedAssignments = progressData?.completedAssignments || 0;
    const assignmentsProgressPercent = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    const loading = userLoading || stagesLoading;

    const handleStageClick = (lessonId: number) => {
        if (isGuest) {
            setShowGuestModal(true);
            return;
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

    return (
        <Page showTabBar={false}>
            <div className="text-black min-h-full">
                {/* Шапка как в StagePage */}
                <div className="bg-white p-4 flex flex-col gap-3 pt-24">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <p className="font-bold text-xl">Ступени модуля</p>
                            <p className="text-sm text-[#8C8C8C]">
                                {totalStages} {totalStages === 1 ? 'ступень' : totalStages < 5 ? 'ступени' : 'ступеней'}
                            </p>
                        </div>
                    </div>
                    {/* Прогресс-бар по ступеням */}
                    <div className="flex items-center gap-1 w-full">
                        {stages.map((_, i) => (
                            <div key={i} className="flex-1 h-4 bg-[#68B1EB] rounded-xs" />
                        ))}
                    </div>
                    {/* Прогресс по заданиям модуля */}
                    {totalAssignments > 0 && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Прогресс по заданиям</p>
                                <p className="text-sm text-[#8C8C8C]">{completedAssignments} из {totalAssignments}</p>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                                    style={{ width: `${assignmentsProgressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Список ступеней с фоном как в StagePage */}
                <motion.div
                    className="bg-[url('/bg3.jpg')] min-h-full bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {stages.map((stage, index) => {
                        const lessonsCount = stage.lessons?.length || 0;
                        const firstLesson = stage.lessons?.[0];
                        const coverUrl = buildFileUrl(stage.cover_image_path) || '/test.png';

                        return (
                            <motion.div key={stage.id} variants={itemVariants}>
                                <motion.div
                                    whileTap={{ scale: 0.97 }}
                                    style={{ touchAction: 'manipulation' }}
                                    className="w-full"
                                >
                                    <Ripple className="rounded-3xl overflow-hidden w-full shadow-sm">
                                        <div
                                            onClick={() => firstLesson && handleStageClick(firstLesson.id)}
                                            className="flex flex-col w-full bg-white cursor-pointer"
                                        >
                                            {/* Обложка как в LessonCard */}
                                            <div className="relative w-full">
                                                <img
                                                    src={coverUrl}
                                                    alt={stage.name}
                                                    className="h-[193px] w-full object-cover"
                                                    onError={(e) => { e.currentTarget.src = '/test.png'; }}
                                                />
                                            </div>
                                            {/* Информация как в LessonCard */}
                                            <div className="p-4 flex flex-col gap-2 bg-white">
                                                <p className="font-semibold">{stage.name}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    <p className="rounded-full px-2 py-1 text-white text-xs font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]">
                                                        Ступень {index + 1}
                                                    </p>
                                                    <p className="rounded-full px-2 py-1 text-white text-xs font-medium bg-[linear-gradient(135deg,_rgba(141,197,241)_-48.61%,_#63ABE6_105.56%)]">
                                                        {lessonsCount} {lessonsCount === 1 ? 'урок' : lessonsCount < 5 ? 'урока' : 'уроков'}
                                                    </p>
                                                </div>
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
