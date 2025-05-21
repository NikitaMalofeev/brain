// Компонент страницы "Библиотека"

import React, { useEffect, useState } from 'react';
import StageCard from '../../components/StageCard/StageCard';
import useLibraryStages, { LibraryStageData } from '../../lib/supabase/hooks/useLibraryStages';
import { User } from '@supabase/supabase-js'; // Импортируем тип User
import { useSignal, initDataState } from '@telegram-apps/sdk-react'; // Импортируем для Telegram
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser'; // Импортируем хук для работы с Telegram
import { logger } from '@/lib/logger'; // Логгер для отладки
import { useAppContext } from '@/contexts/AppContext'; // Импортируем контекст приложения
import { Page } from '@/components/Page'; // Импортируем компонент Page

// Расширяем глобальный объект Window, добавляя Telegram
declare global {
    interface Window {
        Telegram?: unknown;
    }
}

const HARDCODED_COURSE_ID = '1d66bf31-dc5b-4291-9581-f7f12cc373b6';

const LibraryPage: React.FC = () => {
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
    const { stages, loading: stagesLoading, error: stagesError } = useLibraryStages(activeUser, HARDCODED_COURSE_ID);

    // Объединяем состояния загрузки
    const loading = stagesLoading || (isTelegramApp && supabaseUserLoading);

    // Объединяем ошибки
    const error = stagesError || (isTelegramApp && supabaseUserError);

    const handleStageClick = (stageId: string) => {
        console.log(`Переход к ступени: ${stageId}`);
        // TODO: Реализовать переход к экрану ступени (stage_content_flow)
        // например, history.push(`/library/stage/${stageId}`);
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
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '20px 0 0 0', flex: 1, backgroundColor: '#F1F1F1', borderRadius: '0 0 24px 24px' }}>
                    <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '24px', textAlign: 'left', marginBottom: '24px', paddingLeft: '12px', color: '#000' }}>Библиотека</h1>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '16px',
                        padding: '0 12px 120px 12px',
                        boxSizing: 'border-box',
                    }}>
                        {stages.map((stage, index) => (
                            <div
                                key={stage.stage_id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: '100%',
                                }}
                            >
                                <StageCard
                                    id={stage.stage_id}
                                    name={stage.stage_name}
                                    isLocked={!stage.is_unlocked}
                                    onClick={handleStageClick}
                                />
                                <p
                                    style={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '12px',
                                        color: '#666',
                                        marginTop: '8px',
                                        marginBottom: '0',
                                        textAlign: 'center',
                                    }}
                                >
                                    {`${index + 1} ступень`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default LibraryPage; 