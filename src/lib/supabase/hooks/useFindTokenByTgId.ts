import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

interface FindTokenParams {
    tgId: string;
}

interface FindTokenResponse {
    found: boolean;
    token?: string;
    course_id?: string;
    tariff_id?: string;
    comment?: string;
    created_at?: string;
    message?: string;
    error?: string;
}

const findTokenByTgIdFn = async ({ tgId }: FindTokenParams): Promise<FindTokenResponse> => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized");
    }

    const { data, error } = await supabase.rpc('find_access_token_by_tg_id', {
        p_tg_id: parseInt(tgId, 10)
    });

    if (error) {
        throw new Error(error.message || 'Unknown error finding token');
    }

    return data;
};

export const useFindTokenByTgId = () => {
    return useMutation({
        mutationFn: findTokenByTgIdFn,
        onSuccess: (data) => {
            if (data.found) {
                console.log('✅ Personal token found for user:', data);
            } else {
                console.log('ℹ️ No personal token found for user');
            }
        },
        onError: (error) => {
            console.error('❌ Error finding token by tg_id:', error.message);
        },
    });
}; 