import { useEffect, useState } from 'react';
import { supabaseAnonKey } from '@/lib/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const pingUrl = `${SUPABASE_URL}/rest/v1/courses?select=id&limit=1`;

/**
 * Хук для проверки доступности Supabase (через публичную таблицу)
 * Пингуем /rest/v1/courses с anon-key. Network error/timeout = Supabase недоступен.
 * Любой ответ (даже 401/403) = Supabase жив.
 * @param intervalMs - интервал пинга в мс (по умолчанию 10000)
 * @returns { isSupabaseAvailable: boolean }
 */
export function useSupabaseDetector(intervalMs = 10000) {
    const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(true);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        const ping = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000); // 3 сек таймаут
                await fetch(pingUrl, {
                    method: 'GET',
                    headers: { apikey: supabaseAnonKey },
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                // Любой ответ (даже 401/403) — Supabase жив
                setIsSupabaseAvailable(true);
            } catch {
                // Только network error/timeout — считаем падением
                setIsSupabaseAvailable(false);
            }
            timer = setTimeout(ping, intervalMs);
        };
        ping();
        return () => clearTimeout(timer);
    }, [intervalMs]);

    return { isSupabaseAvailable };
} 