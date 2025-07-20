import { Page } from "@/components";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { buildFileUrl } from "@/lib/supabase/supabaseStorageService";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ripple } from "@/components/ui/Ripple/Ripple";
import { useSupabaseUser } from "@/lib/supabase/hooks/useSupabaseUser";
import { useActiveCourse } from "@/lib/supabase/hooks/useActiveCourse";
import { useSignal, initDataState } from '@telegram-apps/sdk-react';

const tabs = [
    'Все',
    'Аудио',
    'Видео'
]

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

export const CommonPage = () => {
    const [currentTab, setCurrentTab] = useState<number>(0);
    
    // Получаем информацию о пользователе
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser } = useSupabaseUser(initDataSignal);
    const { activeCourse } = useActiveCourse(supabaseUser?.id);
    
    const { data, isLoading } = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return []

            // Если нет активного курса, возвращаем пустой массив
            if (!activeCourse?.course_id) return []
            
            const now = new Date().toISOString();
            
            const { data, error } = await supabase.from('materials')
                .select('*')
                .eq('course_id', activeCourse.course_id)
                .lte('release_date', now) // Только материалы с датой открытия <= текущей
                .order('order_num', { ascending: true })

            if (error) {
                throw new Error(error.message)
            }
            return data || []
        },
        queryKey: ['materials', activeCourse?.course_id],
        enabled: !!activeCourse?.course_id // Запрос выполняется только при наличии активного курса
    })
    if (isLoading) {
        return (
            <Page back={false}>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка материалов...</p>
                </div>
            </Page>
        )
    }
    return (
        <Page back={false}>
            <motion.div
                className={'flex flex-col min-h-[calc(100vh-60px)] text-black pt-24'}
            >
                <motion.div
                    className={'p-4 flex flex-col gap-2'}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                >
                    <h2 className={'font-bold text-xl'}>Библиотека</h2>
                    <div className={'flex items-center gap-1'}>
                        {
                            tabs.map((tab, index) => (
                                <Ripple key={index} className="rounded-full overflow-hidden inline-block">
                                    <motion.div
                                        onClick={() => {
                                            setCurrentTab(index)
                                        }}
                                        className={`transition duration-200 ease-in cursor-pointer text-sm font-semibold rounded-full bg-[linear-gradient(180deg,_#E9E9E9_0%,_#E8E8E8_100%)] py-2 px-4 ${currentTab === index && '!bg-[linear-gradient(109.65deg,_#71B4EA_13.64%,_#3996E2_124.92%)] text-white'}`}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {tab}
                                    </motion.div>
                                </Ripple>
                            ))
                        }
                    </div>
                </motion.div>
                <motion.div
                    className={'bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3 pb-12'}
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    <motion.div
                        className="flex flex-col gap-3"
                        variants={listVariants}
                    >
                        {!activeCourse?.course_id ? (
                            <div className="text-center text-gray-500 mt-8">
                                Нет активного курса
                            </div>
                        ) : data?.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                                Нет доступных материалов
                            </div>
                        ) : data?.filter(el => currentTab === 0 ? true : currentTab === 1 ? el.material_type === "audio" : el.material_type === "video").map((lesson) => (
                            <motion.div
                                key={lesson.id}
                                variants={itemVariants}
                            >
                                {lesson.material_type === 'video' ?
                                    <Ripple className="rounded-3xl overflow-hidden">
                                        <motion.div
                                            whileTap={{ scale: 0.97 }}
                                            style={{ touchAction: 'manipulation' }}
                                            className="w-full"
                                        >
                                            <Link to={`/material/${lesson.id}`} className={'bg-white rounded-3xl flex flex-col block'}>
                                                <img src={buildFileUrl(lesson.cover_image_path) || ''} alt={''} className={'h-[200px] md:h-[300px] rounded-3xl object-cover'} />
                                                <p className={'p-4 font-semibold'}>{lesson.name}</p>
                                            </Link>
                                        </motion.div>
                                    </Ripple> :
                                    <Ripple className="rounded-3xl overflow-hidden">
                                        <motion.div
                                            whileTap={{ scale: 0.97 }}
                                            style={{ touchAction: 'manipulation' }}
                                            className="w-full"
                                        >
                                            <Link to={`/material/${lesson.id}`} className={'bg-white rounded-3xl py-3 px-6 flex items-center gap-4 justify-between block'}>
                                                <div className={'flex flex-col'}>
                                                    <p className={'font-semibold text-lg leading-5'}>{lesson.name}</p>
                                                    {lesson.description &&
                                                        <p className={'text-sm text-[#9F9F9F]'}>{lesson.description}</p>}
                                                </div>
                                                <img src={'/play.svg'} />
                                            </Link>
                                        </motion.div>
                                    </Ripple>
                                }
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.div>
        </Page>
    )
}