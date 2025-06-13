import { Page } from "@/components";
import { COURSE_CONFIG } from "@/lib/config/constants.ts";
import { useSupabaseUser } from "@/lib/supabase/hooks";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { buildImageUrl } from "@/lib/cloudflareR2Service.ts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { StageProgressData, UserProgress } from "@/components/UserProgress/UserProgress.tsx";
import useLibraryStages from '@/lib/supabase/hooks/useLibraryStages';
import { Ripple } from "@/components/ui/Ripple/Ripple.tsx";
import StageCard from "@/components/StageCard/StageCard.tsx";
import { motion } from "framer-motion";

const COURSE_ID = COURSE_CONFIG.DEFAULT_COURSE_ID;

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

export const MainPage = () => {
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser } = useSupabaseUser(initDataSignal);

    // Используем хук для получения ступеней с поддержкой fallback
    const { stages, loading: isLoading, error: stagesError } = useLibraryStages(
        supabaseUser?.id || null,
        COURSE_ID
    );


    if (!supabaseUser?.id || isLoading) {
        return (
            <Page back={false}>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка ступеней...</p>
                </div>
            </Page>
        );
    }


    if (stages?.length === 0 && !isLoading) {
        return (
            <Page back={false}>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Нет доступных этапов для этого курса.</div>
            </Page>
        );
    }

    return (
        <Page back={false}>
            <div
                className={'bg-[url("/bg3.jpg")] bg-cover bg-bottom p-4 pt-24 rounded-b-3xl flex-1 flex flex-col gap-3'}
            >
                <motion.div
                    className={'flex items-center justify-between w-full'}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                >
                    <Ripple className="rounded-full overflow-hidden">
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            style={{ touchAction: 'manipulation' }}
                        >
                            <Link to={'/profile2'} className={'block'}>
                                <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full border border-white'}
                                    alt={'Профиль'} />
                            </Link>
                        </motion.div>
                    </Ripple>
                    <Ripple className="rounded-full overflow-hidden">
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            style={{ touchAction: 'manipulation' }}
                        >
                            <Link to={'/points'} className={'block flex items-center gap-1 py-[6px] px-2 bg-white'}>
                                <p className={'text-black font-semibold leading-4'}>{supabaseUser?.total_points}</p>
                                <img src={'/eid.svg'} className={'w-5 h-5'} />
                            </Link>
                        </motion.div>
                    </Ripple>
                </motion.div>
                <motion.div
                    className="flex flex-col gap-4"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {stages?.map((stage, i) => (
                        <motion.div
                            key={stage.stage_id}
                            variants={itemVariants}
                        >
                            <StageCard
                                id={stage.stage_id}
                                name={stage.stage_name}
                                isLocked={!stage.is_unlocked}
                                coverImagePath={stage.cover_image_path || undefined}
                                orderNum={i + 1}
                            />
                        </motion.div>
                    ))}
                </motion.div>

            </div>
            <UserProgress stages={stages || []} />
        </Page>
    )
}