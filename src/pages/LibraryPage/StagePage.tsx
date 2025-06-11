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
import NativeModal from "@/components/NativeModal.tsx";
import { Ripple } from '@/components/ui/Ripple/Ripple';

const StagePage: React.FC = () => {


    const { id: stageId } = useParams<{ id: string }>();


    const [isOpen, setIsOpen] = useState(false);

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
                <div className="profile-loading">
                    <div className="profile-loading-spinner" aria-hidden="true" />
                    <p>Загрузка прогресса по урокам...</p>
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

    const completedLessons = stageDetails.lessons.filter(lesson => lesson.is_completed).length;
    const totalLessons = stageDetails.lessons.length;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const lessonsRemaining = totalLessons - completedLessons;
    const progressText = lessonsRemaining > 0
        ? `Еще ${lessonsRemaining} заданий до завершения ступени`
        : 'Ступень пройдена!';

    return (
        <Page showTabBar={false}>
            <div className={'text-black'}>
                <div className={'bg-white p-4 flex flex-col gap-3 p-4 pt-12'}>
                    <div className={'flex items-center justify-between'}>
                        <div className={'flex flex-col'}>
                            <p className={'font-bold text-xl'}>{stageDetails.stage_name}</p>
                            <p className={'text-sm text-[#8C8C8C]'}>{progressText}</p>
                        </div>
                        <Ripple className="rounded-full overflow-hidden">
                            <img onClick={() => setIsOpen(true)} src={'/ask-icon.svg'} alt={''} className="cursor-pointer" />
                        </Ripple>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="h-3 rounded-full bg-gradient-to-r from-[#ACD3F3] to-[#91C3EC]"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
                <div className={'bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    {stageDetails.lessons.map((lesson) => (
                        <LessonCard
                            key={lesson.lesson_id}
                            lesson={lesson}
                            onClick={handleLessonClick}
                        />
                    ))}
                </div>
            </div>
            <NativeModal title={stageDetails.stage_name} description={stageDetails.stage_description} isOpen={isOpen} setIsOpen={setIsOpen} />
        </Page>
    );
};

export default StagePage; 