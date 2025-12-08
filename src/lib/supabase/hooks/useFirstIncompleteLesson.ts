import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';

interface FirstIncompleteLessonResult {
    lessonId: number | null;
    lessonName: string | null;
    moduleId: string | null;
    moduleName: string | null;
}

/**
 * Хук для получения первого урока с невыполненным заданием
 * Проходит по модулям и урокам в порядке их открытия
 */
export function useFirstIncompleteLesson(userId: string | undefined) {
    return useQuery({
        queryKey: ['first-incomplete-lesson', userId],
        queryFn: async (): Promise<FirstIncompleteLessonResult> => {
            if (!userId || !supabase) {
                return { lessonId: null, lessonName: null, moduleId: null, moduleName: null };
            }

            // Получаем поток пользователя
            const { data: enrollmentData } = await supabase
                .from('user_stream_enrollments')
                .select('stream_id')
                .eq('user_id', userId)
                .single();

            if (!enrollmentData?.stream_id) {
                return { lessonId: null, lessonName: null, moduleId: null, moduleName: null };
            }

            // Получаем активный тариф пользователя
            const { data: userTariffData } = await supabase
                .from('user_tariffs')
                .select('tariff_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            // Получаем модули из тарифа с unlock_offset отсортированные по порядку
            let moduleIds: string[] = [];

            if (userTariffData?.tariff_id) {
                const { data: tariffModulesData } = await supabase
                    .from('tariff_stream_modules')
                    .select(`
                        stream_module_id,
                        unlock_offset_days,
                        stream_tariffs!inner(stream_id, tariff_id)
                    `)
                    .eq('stream_tariffs.stream_id', enrollmentData.stream_id)
                    .eq('stream_tariffs.tariff_id', userTariffData.tariff_id)
                    .order('unlock_offset_days', { ascending: true });

                moduleIds = tariffModulesData?.map(tm => tm.stream_module_id) || [];
            }

            // Если нет модулей в тарифе, получаем все модули потока
            if (moduleIds.length === 0) {
                const { data: allModulesData } = await supabase
                    .from('stream_modules')
                    .select('id, order_num')
                    .eq('stream_id', enrollmentData.stream_id)
                    .order('order_num', { ascending: true });

                moduleIds = allModulesData?.map(m => m.id) || [];
            }

            if (moduleIds.length === 0) {
                return { lessonId: null, lessonName: null, moduleId: null, moduleName: null };
            }

            // Для каждого модуля получаем ступени и уроки
            for (const moduleId of moduleIds) {
                // Получаем название модуля
                const { data: moduleData } = await supabase
                    .from('stream_modules')
                    .select('name')
                    .eq('id', moduleId)
                    .single();

                // Получаем ступени модуля
                const { data: stagesData } = await supabase
                    .from('course_stages')
                    .select('id, name')
                    .eq('stream_module_id', moduleId)
                    .order('order_num', { ascending: true });

                if (!stagesData || stagesData.length === 0) continue;

                // Для каждой ступени получаем уроки
                for (const stage of stagesData) {
                    const { data: lessonsData } = await supabase
                        .from('lessons')
                        .select('id, name, order_num')
                        .eq('stage_id', stage.id)
                        .order('order_num', { ascending: true });

                    if (!lessonsData || lessonsData.length === 0) continue;

                    // Для каждого урока проверяем задания
                    for (const lesson of lessonsData) {
                        // Получаем задания урока
                        const { data: assignmentsData } = await supabase
                            .from('assignments')
                            .select('id')
                            .eq('lesson_id', lesson.id);

                        if (!assignmentsData || assignmentsData.length === 0) continue;

                        const assignmentIds = assignmentsData.map(a => a.id);

                        // Проверяем выполненные задания (все кроме rejected считаются выполненными)
                        const { data: submissionsData } = await supabase
                            .from('submissions')
                            .select('assignment_id')
                            .eq('user_id', userId)
                            .in('assignment_id', assignmentIds)
                            .neq('status', 'rejected');

                        const completedAssignmentIds = new Set(submissionsData?.map(s => s.assignment_id) || []);

                        // Если есть невыполненное задание в этом уроке
                        const hasIncompleteAssignment = assignmentIds.some(id => !completedAssignmentIds.has(id));

                        if (hasIncompleteAssignment) {
                            return {
                                lessonId: lesson.id,
                                lessonName: lesson.name,
                                moduleId: moduleId,
                                moduleName: moduleData?.name || null,
                            };
                        }
                    }
                }
            }

            // Все задания выполнены
            return { lessonId: null, lessonName: null, moduleId: null, moduleName: null };
        },
        enabled: !!userId,
        staleTime: 10 * 60 * 1000, // 10 минут - прогресс не меняется часто
        gcTime: 30 * 60 * 1000, // 30 минут в кэше
    });
}
