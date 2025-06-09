import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseUser } from './useSupabaseUser';
import { initDataState } from '@telegram-apps/sdk-react';
import { useSignal } from '@telegram-apps/sdk-react';

interface RedeemTokenParams {
    accessToken: string;
    userId: string;
}

const redeemTokenFn = async ({ accessToken, userId }: RedeemTokenParams) => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized");
    }
    const { data, error } = await supabase.rpc('redeem_access_token', {
        token_to_redeem: accessToken,
        user_id_param: userId,
    });

    if (error || (data && data.error)) {
        throw new Error(data?.error || error?.message || 'Unknown error redeeming token');
    }

    return data;
};

export const useRedeemToken = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const initData = useSignal(initDataState);
    const { refetch: refetchUser } = useSupabaseUser(initData);

    return useMutation({
        mutationFn: redeemTokenFn,
        onSuccess: (data, variables) => {
            console.log('✅ Token redeemed successfully!', data);

            // Инвалидируем кэш пользователя и тарифов
            console.log('🔄 Invalidating user and tariff cache...');
            refetchUser();
            queryClient.invalidateQueries({ queryKey: ['active-tariff', variables.userId] });
        },
        onError: (error) => {
            console.error('❌ Error redeeming token:', error.message);
            navigate('/token-error', { state: { error: error.message } });
        },
    });
}; 