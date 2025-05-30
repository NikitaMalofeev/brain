import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerProvider } from '@/contexts/PlayerContext';
import AdminPage from '@/pages/AdminPage/AdminPage';

// Отдельное приложение только для админки, без Telegram SDK
export const AdminApp: React.FC = () => {
    return (
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
    );
}; 