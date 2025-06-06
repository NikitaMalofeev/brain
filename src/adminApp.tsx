import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlayerProvider } from '@/contexts/PlayerContext';
import AdminPage from '@/pages/AdminPage/AdminPage';

// Создаем QueryClient для админки
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 минут
            retry: 2,
        },
        mutations: {
            retry: 1,
        },
    },
});

// Отдельное приложение только для админки, без Telegram SDK
export const AdminApp: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <PlayerProvider>
                    <Routes>
                        {/* Основной роут админки */}
                        <Route path="/admin/*" element={<AdminPage />} />
                        {/* Редирект с корня на админку */}
                        <Route path="/" element={<Navigate to="/admin" replace />} />
                        {/* Catch-all для любых других путей */}
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                </PlayerProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}; 