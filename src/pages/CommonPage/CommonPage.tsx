import { Page } from "@/components";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { buildImageUrl } from "@/lib/cloudflareR2Service.ts";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ripple } from "@/components/ui/Ripple/Ripple";

const tabs = [
    'Все',
    'Аудио',
    'Видео'
]

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 20,
            stiffness: 250,
            staggerChildren: 0.06,
            delayChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            type: 'tween',
            ease: 'easeIn',
            duration: 0.15
        }
    },
};

const listVariants = {
    enter: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const itemVariants = {
    initial: { opacity: 0, y: 20 },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 20,
            stiffness: 250
        }
    },
    exit: { opacity: 0, y: -10 },
};

export const CommonPage = () => {
    const [currentTab, setCurrentTab] = useState<number>(0);
    const { data, isLoading } = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return []

            const { data, error } = await supabase.from('materials')
                .select('*')
                .order('order_num', { ascending: true })

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние "isError"
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || []
        },
        queryKey: ['materials']
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
                className={'flex flex-col min-h-[calc(100vh-60px)] text-black pt-12'}
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
            >
                <motion.div
                    className={'p-4 flex flex-col gap-2'}
                    variants={itemVariants}
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
                    className={'bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}
                    variants={listVariants}
                >
                    <motion.div
                        className="flex flex-col gap-3"
                        variants={listVariants}
                    >
                        {data?.filter(el => currentTab === 0 ? true : currentTab === 1 ? el.material_type === "audio" : el.material_type === "video").map((lesson) => (
                            <motion.div
                                key={lesson.id}
                                variants={itemVariants}
                                layout
                            >
                                {lesson.material_type === 'video' ?
                                    <Ripple className="rounded-3xl overflow-hidden">
                                        <motion.div
                                            whileTap={{ scale: 0.97 }}
                                            style={{ touchAction: 'manipulation' }}
                                            className="w-full"
                                        >
                                            <Link to={`/material/${lesson.id}`} className={'bg-white rounded-3xl flex flex-col block'}>
                                                <img src={buildImageUrl(lesson.cover_image_path)} alt={''} className={'h-[200px] md:h-[300px] rounded-3xl object-cover'} />
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