// Компонент страницы "Библиотека"

import React, { useEffect, useState } from 'react';
import {Link, useNavigate} from 'react-router-dom';
import StageCard from '../../components/StageCard/StageCard';
import useLibraryStages, { LibraryStageData } from '../../lib/supabase/hooks/useLibraryStages';
import { User } from '@supabase/supabase-js';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { logger } from '@/lib/logger';
import { useAppContext } from '@/contexts/AppContext';
import { Page } from '@/components/Page';
import { COURSE_CONFIG } from '@/lib/config/constants';

// Расширяем глобальный объект Window, добавляя Telegram
declare global {
    interface Window {
        Telegram?: unknown;
    }
}

// ID курса теперь берется из централизованного конфига
const COURSE_ID = COURSE_CONFIG.DEFAULT_COURSE_ID;

const LibraryPage: React.FC = () => {
    const navigate = useNavigate();

    // Получаем информацию из глобального контекста
    const { isTelegramApp } = useAppContext();

    // Получаем initData из Telegram SDK если мы в Telegram
    const initDataSignal = useSignal(initDataState);

    // Всегда используем хук useSupabaseUser, независимо от режима приложения
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    // Для отладки логгируем что получили
    useEffect(() => {
        if (isTelegramApp) {
            logger.debug('Telegram Mode: initDataSignal', { received: !!initDataSignal });
            logger.debug('Telegram Mode: supabaseUser', {
                userLoaded: !!supabaseUser,
                loading: supabaseUserLoading,
                error: supabaseUserError ? supabaseUserError.message : null,
                userData: supabaseUser // Логируем самого пользователя в ТГ режиме
            });
        } else {
            // В режиме разработки (не Telegram) также логируем supabaseUser,
            // который должен быть получен из мокнутого initDataSignal
            logger.debug('Development Mode (Browser): supabaseUser from mocked initData', {
                userLoaded: !!supabaseUser,
                loading: supabaseUserLoading,
                error: supabaseUserError ? supabaseUserError.message : null,
                userData: supabaseUser // Логируем пользователя, полученного из моков
            });
        }
    }, [isTelegramApp, initDataSignal, supabaseUser, supabaseUserLoading, supabaseUserError]);

    // Создаем Supabase-совместимого User из supabaseUser (если есть supabaseUser, независимо от режима)
    const [supabaseCompatUser, setSupabaseCompatUser] = useState<User | null>(null);

    useEffect(() => {
        if (supabaseUser) { // Условие изменено: теперь зависит только от наличия supabaseUser
            // Создаем Supabase User-совместимый объект из supabaseUser
            const compatUser: User = {
                id: supabaseUser.id, // UUID из Supabase
                app_metadata: {}, // Можно добавить нужные метаданные, если они есть в supabaseUser
                user_metadata: { // Можно добавить нужные метаданные
                    full_name: supabaseUser.first_name, // Пример, если first_name есть в SupabaseUser
                    // ... другие поля из supabaseUser.user_metadata при необходимости
                },
                aud: '', // Обычно 'authenticated' для реальных сессий, для мока можно оставить пустым или настроить
                created_at: supabaseUser.created_at || new Date().toISOString(), // Обеспечиваем наличие created_at
            } as User; // Используем as User для гибкости, но следим за полями

            setSupabaseCompatUser(compatUser);
            logger.debug('Created Supabase-compatible user', { userId: compatUser.id, source: isTelegramApp ? 'Telegram' : 'Mocked InitData' });
        } else {
            setSupabaseCompatUser(null); // Если supabaseUser нет, сбрасываем compatUser
        }
    }, [supabaseUser, isTelegramApp]); // isTelegramApp добавлен в зависимости для корректного лога источника

    // Определяем активного пользователя: всегда supabaseCompatUser, если он есть
    const activeUser = supabaseCompatUser;

    // Используем хук для получения ступеней
    const { stages, loading: stagesLoading, error: stagesError } = useLibraryStages(activeUser, COURSE_ID);

    // Объединяем состояния загрузки
    const loading = stagesLoading || (isTelegramApp && supabaseUserLoading);

    // Объединяем ошибки
    const error = stagesError || (isTelegramApp && supabaseUserError);

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
            // TODO: Более умный расчет оставшихся дней, если это необходимо.
            // Пока просто отображаем значение из базы.
            return `Откроется через ${stage.unlock_condition_value_val || 'N'} дней после начала`;
        }
        if (stage.unlock_condition_type_val === 'previous_stage_completed') {
            return 'Пройдите предыдущий этап';
        }
        return 'Этап пока недоступен'; // Общее сообщение
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
            <div className={'fixed z-50 top-6 flex items-center justify-between px-6 w-full'}>
                <img src={supabaseUser?.photo_url || ''} className={'w-8 h-8 rounded-full'}/>
                <div className={'flex items-center gap-2 py-2 px-3 bg-white rounded-full'}>
                    <p className={'text-black font-medium'}>{supabaseUser?.total_points}</p>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M9.87334 10.127L10.0383 10.1845C12.755 11.1195 16.025 10.2253 18.3333 7.91699M9.87334 10.127L9.40834 9.96783C6.87334 9.09449 3.82084 9.92949 1.66667 12.0837M9.87334 10.127L9.81584 9.96199C8.88084 7.24533 9.775 3.97533 12.0833 1.66699M9.87334 10.127L10.0325 10.592C10.9058 13.1262 10.0708 16.1795 7.91667 18.3337M8.33334 12.5003L9.86917 14.102M5.6375 9.86949L6.66667 10.9003M9.87 5.63783L11.6667 7.50033M13.3333 9.16699L14.1017 9.86949M3.33334 10.8337L6.25 13.7503M16.4817 9.07533L13.565 6.15866M7.75417 15.1595L9.07667 16.482M12.1558 4.65616L10.8333 3.33366"
                            stroke="#369EF3" stroke-width="1.25" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
            <div className={'relative min-h-screen overflow-hidden bg-[url("/bg2.jpg")] bg-cover'}>
                <div className={'flex flex-col gap-3 items-center py-6 pt-24'}>
                    {stages.map((stage, i) => (
                        <Link to={`/library/stage/${stage.stage_id}`}
                              className={stage.is_unlocked ? "cursor-pointer transition duration-200 ease-in hover:scale-105" : "pointer-events-none"}>
                            <img src={`/step${stage.stage_id}${stage.stage_id}.png`}
                                 className={`w-[95%] mx-auto ${!stage.is_unlocked && 'mix-blend-luminosity'}`}/>
                        </Link>
                    ))}
                </div>
            </div>
            <div className={'bg-white py-4 px-6 flex flex-col gap-4'}>
                <div className={'flex items-center justify-between'}>
                    <div className={'flex flex-col'}>
                        <p className={'font-bold text-black'}>Выполнено 12 заданий</p>
                        <p className={'text-sm text-[#8C8C8C]'}>Еще 24 задания до третьей ступени</p>
                    </div>
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="36" rx="18" fill="#EAF5FE"/>
                        <rect width="36" height="36" rx="18" fill="url(#paint0_linear_645_2944)"/>
                        <path d="M15.5 12.1667L21.3333 18.0001L15.5 23.8334" stroke="url(#paint1_linear_645_2944)"
                              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs>
                            <linearGradient id="paint0_linear_645_2944" x1="-2" y1="2" x2="36" y2="40"
                                            gradientUnits="userSpaceOnUse">
                                <stop stop-color="#8DC5F1" stop-opacity="0.2"/>
                                <stop offset="1" stop-color="#8DC5F1"/>
                            </linearGradient>
                            <linearGradient id="paint1_linear_645_2944" x1="16.7406" y1="26.4998" x2="26.3868"
                                            y2="-9.50024" gradientUnits="userSpaceOnUse">
                                <stop stop-color="white"/>
                                <stop offset="1" stop-color="white" stop-opacity="0.45"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="h-4 rounded-full bg-gradient-to-r from-[#ACD3F3] to-[#91C3EC] w-1/2"></div>
                </div>
            </div>
        </Page>
    );
};

export default LibraryPage; 