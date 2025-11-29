import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';

export interface SearchResult {
    stage_id: number;
    stage_name: string;
    stage_cover_image_path: string | null;
    module_id: string;
    module_name: string;
    module_unlock_day: number;
    unlock_date: string | null; // Дата открытия в формате ISO
    is_unlocked: boolean;
    lesson_id: number;
    matched_in: string[]; // Где найдено совпадение: ['stage_name', 'block: Введение', ...]
}

interface UseGlobalSearchResult {
    results: SearchResult[];
    loading: boolean;
    error: Error | null;
}

/**
 * Хук для глобального поиска по ступеням и блокам
 * Возвращает одну карточку на ступень с информацией где найдено совпадение
 */
export function useGlobalSearch(
    userId: string | undefined,
    query: string,
    minQueryLength: number = 2
): UseGlobalSearchResult {
    const { data, isLoading, error } = useQuery({
        queryKey: ['global-search', userId, query],
        queryFn: async (): Promise<SearchResult[]> => {
            if (!userId || !supabase || !query || query.length < minQueryLength) {
                return [];
            }

            const searchTerm = query.toLowerCase().trim();

            // Получаем поток пользователя
            const { data: enrollmentData } = await supabase
                .from('user_stream_enrollments')
                .select('stream_id')
                .eq('user_id', userId)
                .limit(1)
                .single();

            if (!enrollmentData?.stream_id) {
                return [];
            }

            const streamId = enrollmentData.stream_id;

            // Получаем дату начала потока
            const { data: streamData } = await supabase
                .from('streams')
                .select('start_date')
                .eq('id', streamId)
                .single();

            if (!streamData) {
                return [];
            }

            // Вычисляем текущий день потока
            const streamStartDate = new Date(streamData.start_date);
            const today = new Date();
            // Обнуляем время для корректного сравнения дат
            streamStartDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const currentDay = Math.floor((today.getTime() - streamStartDate.getTime()) / (1000 * 60 * 60 * 24));

            // Получаем активный тариф пользователя
            const { data: userTariffData } = await supabase
                .from('user_tariffs')
                .select('tariff_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .single();

            // Получаем модули из тарифа с unlock_offset
            let moduleUnlockMap = new Map<string, number>();

            if (userTariffData?.tariff_id) {
                const { data: tariffModulesData } = await supabase
                    .from('tariff_stream_modules')
                    .select(`
                        stream_module_id,
                        unlock_offset_days,
                        stream_tariffs!inner(stream_id, tariff_id)
                    `)
                    .eq('stream_tariffs.stream_id', streamId)
                    .eq('stream_tariffs.tariff_id', userTariffData.tariff_id);

                tariffModulesData?.forEach(tm => {
                    moduleUnlockMap.set(tm.stream_module_id, tm.unlock_offset_days || 0);
                });
            }

            // Если нет модулей в тарифе, получаем все модули потока
            if (moduleUnlockMap.size === 0) {
                const { data: allModulesData } = await supabase
                    .from('stream_modules')
                    .select('id')
                    .eq('stream_id', streamId);

                allModulesData?.forEach(m => {
                    moduleUnlockMap.set(m.id, 0); // По умолчанию открыты с 0 дня
                });
            }

            if (moduleUnlockMap.size === 0) {
                return [];
            }

            // Поиск по ступеням и блокам
            const { data: stagesData } = await supabase
                .from('course_stages')
                .select(`
                    id,
                    name,
                    description,
                    cover_image_path,
                    stream_module_id,
                    stream_modules!inner(id, name),
                    lessons(
                        id,
                        name,
                        description,
                        order_num,
                        open_day_offset,
                        lesson_blocks(
                            id,
                            title,
                            block_type,
                            content_text
                        )
                    )
                `)
                .in('stream_module_id', Array.from(moduleUnlockMap.keys()));

            if (!stagesData) {
                return [];
            }

            // Map для сбора результатов по stage_id (одна карточка на ступень)
            const resultsMap = new Map<number, SearchResult>();

            for (const stage of stagesData) {
                const moduleUnlockDay = moduleUnlockMap.get(stage.stream_module_id) || 0;
                const isModuleUnlocked = currentDay >= moduleUnlockDay;
                const moduleName = (stage.stream_modules as any)?.name || 'Неизвестный модуль';

                // Сортируем уроки по order_num чтобы найти первый урок
                const sortedLessons = [...(stage.lessons || [])].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
                const firstLesson = sortedLessons[0];

                // Урок разблокирован если модуль открыт И прошло достаточно дней с учётом open_day_offset урока
                const lessonUnlockDay = moduleUnlockDay + (firstLesson?.open_day_offset || 0);
                const isLessonUnlocked = currentDay >= lessonUnlockDay;

                const matchedIn: string[] = [];

                // Поиск по названию ступени - если найдено тут, показываем только название ступени
                const stageNameMatched = stage.name?.toLowerCase().includes(searchTerm);
                if (stageNameMatched) {
                    matchedIn.push(stage.name);
                }

                // Поиск по описанию ступени
                if (stage.description?.toLowerCase().includes(searchTerm)) {
                    matchedIn.push(`${stage.name} → Описание`);
                }

                // Поиск по урокам и блокам
                for (const lesson of (stage.lessons || [])) {
                    // Поиск по названию урока
                    if (lesson.name?.toLowerCase().includes(searchTerm)) {
                        matchedIn.push(`${stage.name} → ${lesson.name}`);
                    }

                    // Поиск по блокам внутри урока
                    for (const block of (lesson.lesson_blocks || [])) {
                        const titleMatches = block.title?.toLowerCase().includes(searchTerm);
                        const contentMatches = block.content_text?.toLowerCase().includes(searchTerm);

                        if (titleMatches || contentMatches) {
                            // Определяем тип блока для отображения
                            const blockTypeDisplay = block.block_type === 'introduction' ? 'Введение'
                                : block.block_type === 'task' ? 'Задание'
                                : '';
                            const blockTitle = block.title || blockTypeDisplay || 'Блок';
                            const displayText = blockTypeDisplay
                                ? `${stage.name} → ${blockTitle}, ${blockTypeDisplay}`
                                : `${stage.name} → ${blockTitle}`;
                            if (!matchedIn.some(m => m.includes(blockTitle))) {
                                matchedIn.push(displayText);
                            }
                        }
                    }
                }

                // Если есть совпадения - добавляем ступень в результаты
                if (matchedIn.length > 0) {
                    // Вычисляем дату открытия урока
                    let unlockDate: string | null = null;
                    if (!isLessonUnlocked) {
                        const unlockDateObj = new Date(streamStartDate);
                        unlockDateObj.setDate(unlockDateObj.getDate() + lessonUnlockDay);
                        unlockDate = unlockDateObj.toISOString();
                    }

                    resultsMap.set(stage.id, {
                        stage_id: stage.id,
                        stage_name: stage.name,
                        stage_cover_image_path: stage.cover_image_path,
                        module_id: stage.stream_module_id,
                        module_name: moduleName,
                        module_unlock_day: lessonUnlockDay,
                        unlock_date: unlockDate,
                        is_unlocked: isLessonUnlocked,
                        lesson_id: firstLesson?.id || 0,
                        matched_in: matchedIn,
                    });
                }
            }

            // Преобразуем Map в массив и сортируем
            const results = Array.from(resultsMap.values());

            // Сортируем: сначала разблокированные
            results.sort((a, b) => {
                if (a.is_unlocked && !b.is_unlocked) return -1;
                if (!a.is_unlocked && b.is_unlocked) return 1;
                return 0;
            });

            return results.slice(0, 20); // Ограничиваем результаты
        },
        enabled: !!userId && !!query && query.length >= minQueryLength,
        staleTime: 30 * 1000, // 30 секунд
    });

    return {
        results: data || [],
        loading: isLoading,
        error: error as Error | null,
    };
}
