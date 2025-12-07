import { useParams } from "react-router-dom";
import { Page } from "@/components/Page";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client.ts";
import { LessonBlock } from "@/lib/supabase/types.ts";
import VideoPlayer from "@/components/Player/VideoPlayer.tsx";
import { getKinescopeId } from "@/components/LessonContent/VideoBlock.tsx";
import { buildFileUrl } from "@/lib/supabase/supabaseStorageService";
import NewPlayer from "@/components/NewPlayer/NewPlayer.tsx";
import { MaterialBlock } from "@/components/LessonContent";
import LoadingSpinner from "@/components/LoadingSpinner/LoadingSpinner";

const BlockRenderer = ({ block }: { block: LessonBlock }) => {
    switch (block.block_type) {
        case 'text':
            return (
                <div className="text-black flex flex-col gap-2">
                    <h3 className="text-xl font-bold">{block.title}</h3>
                    <div className="flex flex-col gap-2 leading-relaxed">
                        {block.content_text?.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>
            );
        case 'image':
            return (
                <div className="text-black flex flex-col gap-2">
                    <h3 className="text-xl font-bold">{block.title}</h3>
                    {block.content_url && (
                        <img
                            src={buildFileUrl(block.content_url) || ''}
                            alt={block.title || 'Изображение к материалу'}
                            className="w-full rounded-2xl object-cover"
                        />
                    )}
                    {block.content_text && (
                        <p className="mt-2 leading-relaxed">{block.content_text}</p>
                    )}
                </div>
            );

        case 'material':
            return <MaterialBlock block={block} />;

        default:
            return (
                <div className="text-black flex flex-col gap-2">
                    <h3 className="text-xl font-bold">{block.title}</h3>
                    {block.content_text && <p className="leading-relaxed">{block.content_text}</p>}
                </div>
            );
    }
};

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
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние "isError"
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
                // выбрасываем ошибку, чтобы React-Query перевёл загрузку в состояние "isError"
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
                <LoadingSpinner />
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

    const mainBlock = blocks.find(b => b.block_type === data.material_type);
    const otherBlocks = blocks.filter(b => b.id !== mainBlock?.id);

    const mainContentUrl = mainBlock?.content_url ? buildFileUrl(mainBlock.content_url) : null;

    return (
        <Page>
            {data.material_type === "video" && mainBlock && (
                <div className={'flex flex-col gap-2 text-black'}>
                    <div className={'h-[300px] page-bg-container'}>
                        <VideoPlayer
                            videoId={getKinescopeId(mainBlock.content_url) || ''}
                        />
                    </div>
                    <div className={'p-4 flex flex-col gap-3'}>
                        <p className={'text-2xl font-bold leading-7'}>{mainBlock.title}</p>
                        <p>{mainBlock.content_text}</p>
                    </div>
                </div>
            )}

            {data.material_type === 'audio' && mainBlock && (
                <div className={'flex flex-col gap-2 text-black page-bg-container'}>
                    <img
                        src={buildFileUrl(data.cover_image_path) || ''}
                        alt={data.name || 'Обложка материала'}
                        className={'h-[300px] rounded-b-3xl object-cover'}
                    />
                    <div className={'p-4 flex flex-col gap-3'}>
                        {mainContentUrl && <NewPlayer
                            audioUrl={mainContentUrl}
                            waveformData={mainBlock?.meta_json?.audio_data}
                        />}
                        <p className={'text-2xl font-bold leading-7'}>{mainBlock.title}</p>
                        <p>{mainBlock.content_text}</p>
                    </div>
                </div>
            )}

            <div className={'p-4 pb-8 flex flex-col gap-8'}>
                {otherBlocks.map((block: LessonBlock) => (
                    <BlockRenderer key={block.id} block={block} />
                ))}
            </div>
        </Page>
    )
}