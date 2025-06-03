// Хук для получения данных о ступенях курса для страницы "Библиотека"
import { useState, useEffect } from 'react';
import { supabase } from '../client'; // Предполагается, что у нас есть настроенный Supabase клиент
import { User } from '@supabase/supabase-js';

// Интерфейс для данных ступени, которые мы ожидаем от RPC функции get_library_stages
// Важно, чтобы поля соответствовали тем, что возвращает функция
export interface LibraryStageData {
    stage_id: number; // ИСПРАВЛЕНО: теперь BIGINT из PostgreSQL
    stage_name: string;
    stage_order_num: number;
    stage_description: string | null;
    is_unlocked: boolean; // ИСПРАВЛЕНО: теперь всегда boolean, не null
    total_lessons: number;
    completed_lessons: number;
    unlock_condition_type_val: string | null;
    unlock_condition_value_val: string | null;
    cover_image_path: string | null; // Добавлено для поддержки обложек ступеней
}

interface UseLibraryStagesResult {
    stages: LibraryStageData[];
    loading: boolean;
    error: Error | null;
    refresh: () => void; // Функция для принудительного обновления
}

// TODO: Определить, как получать ID текущего пользователя и ID курса
// Возможно, user будет приходить из контекста аутентификации, а courseId из параметров страницы или глобального состояния
const useLibraryStages = (user: User | null, courseId: string | null): UseLibraryStagesResult => {
    const [stages, setStages] = useState<LibraryStageData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Функция для принудительного обновления данных
    const refresh = () => {
        console.log('🔄 useLibraryStages: Принудительное обновление данных');
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        if (!user || !courseId) {
            setLoading(false);
            // Не делаем запрос, если нет пользователя или ID курса
            // Можно установить stages в [] или оставить как есть, в зависимости от желаемого поведения
            setStages([]);
            return;
        }

        const fetchStages = async () => {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError(new Error('Supabase client is not initialized.'));
                setLoading(false);
                setStages([]);
                return;
            }

            try {
                // Вызываем RPC функцию get_library_stages из Supabase
                const { data, error: rpcError } = await supabase.rpc('get_library_stages', {
                    p_user_id: user.id,
                    p_course_id: courseId,
                });

                if (rpcError) {
                    console.error('Error fetching library stages:', rpcError);
                    throw rpcError;
                }

                setStages(data || []);
            } catch (err) {
                console.error('Supabase RPC call failed:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch library stages'));
            } finally {
                setLoading(false);
            }
        };

        fetchStages();
    }, [user, courseId, refreshTrigger]); // Добавляем refreshTrigger в зависимости

    return { stages, loading, error, refresh };
};

export default useLibraryStages; 