// Компонент страницы "Библиотека"

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StageCard from '../../components/StageCard/StageCard';
import useLibraryStages, { LibraryStageData } from '../../lib/supabase/hooks/useLibraryStages';
import { User } from '@supabase/supabase-js';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useActiveCourse } from '@/lib/supabase/hooks/useActiveCourse';
import { logger } from '@/lib/logger';
import { useAppContext } from '@/contexts/AppContext';
import { Page } from '@/components/Page';

// Расширяем глобальный объект Window, добавляя Telegram
declare global {
    interface Window {
        Telegram?: unknown;
    }
}

const LibraryPage: React.FC = () => {
    const navigate = useNavigate();

    // Получаем информацию из глобального контекста
    const { isTelegramApp } = useAppContext();

    // Получаем initData из Telegram SDK если мы в Telegram
    const initDataSignal = useSignal(initDataState);

    // Всегда используем хук useSupabaseUser, независимо от режима приложения
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    // Получаем активный курс пользователя
    const { activeCourse, loading: courseLoading, error: courseError } = useActiveCourse(supabaseUser?.id);

    // Логируем для отладки
    useEffect(() => {
        logger.debug('LibraryPage User State:', {
            userLoaded: !!supabaseUser,
            loading: supabaseUserLoading,
            error: supabaseUserError ? supabaseUserError.message : null,
            activeCourse: activeCourse?.course_id,
        });
    }, [supabaseUser, supabaseUserLoading, supabaseUserError, activeCourse]);

    // ID пользователя берем НАПРЯМУЮ из хука useSupabaseUser
    const activeUserId = supabaseUser?.id || null;

    // Используем хук для получения ступеней, передавая ID активного курса
    const { stages, loading: stagesLoading, error: stagesError } = useLibraryStages(activeUserId, activeCourse?.course_id || null);

    // Объединяем состояния загрузки
    const loading = supabaseUserLoading || courseLoading || stagesLoading;

    // Объединяем ошибки
    const error = supabaseUserError || courseError || stagesError;

    const handleStageClick = (stageId: number) => {
        logger.debug('Navigating to stage', { stageId });
        navigate(`/library/stage/${stageId}`);
    };

    // Функция для формирования текста прогресса
    const getProgressText = (stage: LibraryStageData): string => {
        if (!stage.is_unlocked) return '';
        return `${stage.completed_lessons} из ${stage.total_lessons} материалов пройдено`;
    };

    // Функция для формирования причины блокировки
    const getLockReason = (stage: LibraryStageData): string | undefined => {
        if (stage.is_unlocked) return undefined;
        if (stage.unlock_condition_type_val === 'days_after_start') {
            return `Откроется через ${stage.unlock_condition_value_val || 'N'} дней после начала`;
        }
        if (stage.unlock_condition_type_val === 'previous_stage_completed') {
            return 'Пройдите предыдущий этап';
        }
        return 'Этап пока недоступен';
    };

    if (loading) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка ступеней...</div>
            </Page>
        );
    }

    if (error) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
                    Ошибка загрузки: {error.message}
                </div>
            </Page>
        );
    }

    if (stages.length === 0 && !loading) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Нет доступных этапов для этого курса.</div>
            </Page>
        );
    }

    return (
        <Page>
            <div className={'fixed z-50 top-6 flex items-center justify-between px-6 w-full pt-16'}>
                <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full'} />
                <div className={'flex items-center gap-2 py-2 px-3 bg-white rounded-full'}>
                    <p className={'text-black font-medium'}>{supabaseUser?.total_points}</p>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M9.87334 10.127L10.0383 10.1845C12.755 11.1195 16.025 10.2253 18.3333 7.91699M9.87334 10.127L9.40834 9.96783C6.87334 9.09449 3.82084 9.92949 1.66667 12.0837M9.87334 10.127L9.81584 9.96199C8.88084 7.24533 9.775 3.97533 12.0833 1.66699M9.87334 10.127L10.0325 10.592C10.9058 13.1262 10.0708 16.1795 7.91667 18.3337M8.33334 12.5003L9.86917 14.102M5.6375 9.86949L6.66667 10.9003M9.87 5.63783L11.6667 7.50033M13.3333 9.16699L14.1017 9.86949M3.33334 10.8337L6.25 13.7503M16.4817 9.07533L13.565 6.15866M7.75417 15.1595L9.07667 16.482M12.1558 4.65616L10.8333 3.33366"
                            stroke="#369EF3" stroke-width="1.25" stroke-linecap="round" />
                    </svg>
                </div>
            </div>
            <div className={'relative min-h-screen overflow-hidden'}>
                {/* Фоновое изображение с blur */}
                <div
                    className={'absolute inset-0 bg-[url("/bg2.jpg")] bg-cover'}
                    style={{ filter: 'blur(12px)', transform: 'scale(1.05)' }}
                />
                {/* Контент поверх фона без blur */}
                <div className={'relative z-10 flex flex-col gap-3 items-center py-6 pt-4'}>
                    {stages.map((stage, i) => (
                        <div key={stage.stage_id} className={`w-[95%] ${stage.is_unlocked ? "cursor-pointer transition duration-200 ease-in hover:scale-105" : "pointer-events-none"}`}>
                            <StageCard
                                id={stage.stage_id}
                                name={stage.stage_name}
                                isLocked={!stage.is_unlocked}
                                coverImagePath={stage.cover_image_path || undefined}
                                orderNum={i + 1}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </Page>
    );
};

export default LibraryPage; 