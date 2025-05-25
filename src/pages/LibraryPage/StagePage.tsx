import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { User } from '@supabase/supabase-js';
import { Page } from '@/components/Page';
import LessonCard from '@/components/LessonCard/LessonCard';
import useStageDetails, { StageDetailsData } from '@/lib/supabase/hooks/useStageDetails';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/lib/logger';

const StagePage: React.FC = () => {
    const { id: stageId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Получаем информацию из глобального контекста
    const { isTelegramApp } = useAppContext();

    // Получаем initData из Telegram SDK если мы в Telegram
    const initDataSignal = useSignal(initDataState);

    // Получаем данные пользователя
    const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

    // Создаем Supabase-совместимого User из supabaseUser
    const [supabaseCompatUser, setSupabaseCompatUser] = useState<User | null>(null);

    useEffect(() => {
        if (supabaseUser) {
            // Создаем Supabase User-совместимый объект из supabaseUser
            const compatUser: User = {
                id: supabaseUser.id, // UUID из Supabase
                app_metadata: {},
                user_metadata: {
                    full_name: supabaseUser.first_name,
                },
                aud: '',
                created_at: supabaseUser.created_at || new Date().toISOString(),
            } as User;

            setSupabaseCompatUser(compatUser);
            logger.debug('Created Supabase-compatible user for StagePage', { userId: compatUser.id });
        } else {
            setSupabaseCompatUser(null);
        }
    }, [supabaseUser]);

    // Определяем активного пользователя
    const activeUser = supabaseCompatUser;

    // Используем хук для получения деталей ступени
    const { stageDetails, loading: stageLoading, error: stageError } = useStageDetails(activeUser, stageId || '');

    // Объединяем состояния загрузки
    const loading = stageLoading || (isTelegramApp && supabaseUserLoading);

    // Объединяем ошибки
    const error = stageError || (isTelegramApp && supabaseUserError);

    // Проверка жизней пользователя для отображения предупреждения
    const livesRemaining = supabaseUser?.lives_remaining ?? 3;
    const showLivesWarning = livesRemaining === 0;

    // Обработчик клика на урок
    const handleLessonClick = (lessonId: number) => {
        logger.debug('Navigating to lesson', { lessonId });
        navigate(`/library/lesson/${lessonId}`);
    };

    // Обработчик возврата к библиотеке
    const handleBack = () => {
        navigate('/library');
    };

    if (loading) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    Загрузка ступени...
                </div>
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

    if (!stageDetails) {
        return (
            <Page>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    Ступень не найдена
                </div>
            </Page>
        );
    }

    return (
        <Page>
            <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                backgroundColor: '#F1F1F1',
                minHeight: '100vh',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '375px',
                    margin: '0 auto',
                    padding: '16px',
                    flex: 1,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {/* Заголовок ступени */}
                    <h1 style={{
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: 700,
                        fontSize: '28px',
                        lineHeight: '1.2',
                        textAlign: 'left',
                        marginBottom: '8px',
                        marginTop: '0',
                        color: '#1a1a1a',
                    }}>
                        {stageDetails.stage_name}
                    </h1>

                    {/* Прогресс по ступени */}
                    <div style={{
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: '16px',
                        fontWeight: 400,
                        color: '#4a4a4a',
                        marginBottom: '24px',
                        lineHeight: '1.5',
                    }}>
                        {stageDetails.completed_lessons} из {stageDetails.total_lessons} завершено
                    </div>

                    {/* Предупреждение о жизнях */}
                    {showLivesWarning && (
                        <div style={{
                            backgroundColor: '#fff5f5',
                            border: '1px solid #fed7d7',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                            color: '#c53030',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: '1.5',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                        }}>
                            <span style={{ fontSize: '16px' }}>⚠️</span>
                            <span>У вас осталось 0 жизней! Будьте осторожны с дедлайнами.</span>
                        </div>
                    )}

                    {/* Список уроков */}
                    <div style={{
                        marginBottom: '100px',
                        width: '100%',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}>
                        {stageDetails.lessons.map((lesson) => (
                            <LessonCard
                                key={lesson.lesson_id}
                                lesson={lesson}
                                onClick={handleLessonClick}
                            />
                        ))}
                    </div>

                    {/* Пустое состояние если нет уроков */}
                    {stageDetails.lessons.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            marginTop: '60px',
                            color: '#6d6d6d',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: '16px',
                            fontWeight: 400,
                            lineHeight: '1.5',
                        }}>
                            В этой ступени пока нет уроков
                        </div>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default StagePage; 