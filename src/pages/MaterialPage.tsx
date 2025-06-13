import { useParams } from "react-router-dom";
import { Page } from "@/components";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { LessonBlock } from "@/lib/supabase/types.ts";
import { BlockItem } from "@/pages/LibraryPage/LessonPage.tsx";
import VideoPlayer from "@/components/Player/VideoPlayer.tsx";
import { getKinescopeId } from "@/components/LessonContent/VideoBlock.tsx";
import { buildImageUrl, buildFileUrl } from "@/lib/cloudflareR2Service.ts";
import NewPlayer from "@/components/NewPlayer/NewPlayer.tsx";

export const MaterialPage = () => {
    const { id: materialId } = useParams<{ id: string }>();
    const { data, isLoading } = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return undefined

            const { data, error } = await supabase.from('materials')
                .select('*')
                .eq('id', materialId).single()

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || undefined
        },
        queryKey: ['materials', materialId]
    })
    const { data: blocks, isLoading: isLoadingBlocks } = useQuery({
        queryFn: async () => {
            // 1) Формируем запрос, вызываем .select(...).maybeSingle()/.then()/.throwOnError()
            if (!supabase) return undefined

            const { data, error } = await supabase
                .from('material_blocks')
                .select('*')
                .eq('material_id', materialId)
                .order('order_num', { ascending: true });

            if (error) {
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние “isError”
                throw new Error(error.message)
            }
            // data здесь — это массив User[] (или null/[]), в зависимости от схемы
            return data || undefined
        },
        queryKey: ['material_blocks', materialId]
    })
    if (isLoading || isLoadingBlocks) {
        return (
            <Page>
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка контента...</p>
                </div>
            </Page>
        )
    }
    // Проверки на данные и ошибки
    if (!data) {
        return (
            <Page>
                <div className="profile-loading">
                    <p className={'text-black text-center'}>Материал не найден</p>
                </div>
            </Page>
        )
    }

    if (!blocks || blocks.length === 0) {
        return (
            <Page>
                <div className="profile-loading">
                    <p className={'text-black text-center'}>Контент материала не найден</p>
                </div>
            </Page>
        )
    }

    const firstBlock = blocks[0];

    const fullAudioUrl = firstBlock.content_url ? buildFileUrl(firstBlock.content_url) : '';

    return (
        <Page>
            {data.material_type === "video" && (
                <div className={'flex flex-col gap-2 text-black'}>
                    <div className={'h-[300px]'}>
                        <VideoPlayer
                            videoId={getKinescopeId(firstBlock.content_url) || ''}
                        />
                    </div>
                    <div className={'p-4 flex flex-col gap-3'}>
                        <p className={'text-2xl font-bold leading-7'}>{firstBlock.title}</p>
                        <p>{firstBlock.content_text}</p>
                    </div>
                </div>
            )}

            {data.material_type === 'audio' && (
                <div className={'flex flex-col gap-2 text-black'}>
                    <img
                        src={buildImageUrl(data.cover_image_path)}
                        alt={data.name || 'Обложка материала'}
                        className={'h-[300px] rounded-b-3xl object-cover'}
                    />
                    <div className={'p-4 flex flex-col gap-3'}>
                        <NewPlayer
                            audioUrl={fullAudioUrl}
                        />
                        <p className={'text-2xl font-bold leading-7'}>{firstBlock.title}</p>
                        <p>{firstBlock.content_text}</p>
                    </div>
                </div>
            )}

            <div className={'p-4 pb-8'}>
                {blocks.slice(1).map((block: LessonBlock, i) => (
                    <BlockItem
                        key={block.id || i}
                        block={block}
                        initialState={i === 0}
                    />
                ))}
            </div>
        </Page>
    )
}