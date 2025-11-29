import React from 'react';
import { Link } from 'react-router-dom';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { getNounPluralForm } from '@/helpers/pluralize';

// Тип для данных модуля (совместим с StreamModuleAsStage)
export type StageProgressData = {
    stage_id: number;
    stage_name: string;
    is_unlocked: boolean;
    completed_lessons: number;
    total_lessons: number;
    overdue_lessons: number;
    unlocked_lessons: number;
    cover_image_path?: string | null;
    // Поля для модулей
    module_id?: string;
    unlock_day?: number;
    total_assignments?: number;
    completed_assignments?: number;
    overdue_assignments?: number;
};


interface UserProgressProps {
    stages: StageProgressData[];
    className?: string;
    nextLessonId?: number | null; // ID первого урока с невыполненным заданием
}

export function getWordByIndex(index: number): string {
    const words = ["первой", "второй", "третьей", "четвёртой"];
    return words[index - 1] || "";
}

export const UserProgress: React.FC<UserProgressProps> = ({ stages, className, nextLessonId }) => {
    if (!stages || stages.length === 0) {
        return null;
    }

    // Суммируем задания по всем разблокированным модулям
    const unlockedStages = stages.filter(s => s.is_unlocked);
    const totalCompletedAssignments = unlockedStages.reduce((acc, stage) => acc + (stage.completed_assignments || 0), 0);
    const totalAssignments = unlockedStages.reduce((acc, stage) => acc + (stage.total_assignments || 0), 0);

    // Находим текущий (последний разблокированный) модуль
    const currentStage = [...stages].reverse().find(stage => stage.is_unlocked);

    // Если ни один модуль не разблокирован
    if (!currentStage) {
        return (
            <div className={`bg-white p-4 flex flex-col gap-2 sticky bottom-0 ${className}`}>
                <p className={'font-bold text-black'}>Прогресс скоро появится</p>
                <p className={'text-sm text-[#8C8C8C]'}>Разблокируйте первый модуль, чтобы начать обучение.</p>
            </div>
        );
    }

    // Находим следующий нераскрытый модуль
    const nextStage = stages.find(s => !s.is_unlocked);

    // Считаем сколько заданий осталось до открытия следующего модуля
    const remainingAssignments = totalAssignments - totalCompletedAssignments;

    // Генерируем текст прогресса
    let progressText = '';

    if (nextStage) {
        const assignmentsWord = getNounPluralForm(remainingAssignments, 'задание', 'задания', 'заданий');
        progressText = `Ещё ${remainingAssignments} ${assignmentsWord} до открытия «${nextStage.stage_name}»`;
    } else {
        progressText = 'Все модули открыты!';
    }

    const completedWord = getNounPluralForm(totalCompletedAssignments, 'задание', 'задания', 'заданий');
    const progressPercentage = totalAssignments > 0 ? (totalCompletedAssignments / totalAssignments) * 100 : 0;

    return (
        <div className={`bg-[#0000004D] p-4 pb-[16px] flex flex-col gap-3 rounded-3xl ${className}`}>
            <div className={'flex items-center justify-between'}>
                <div className={'flex flex-col gap-1'}>
                    <p className={'text-white'} style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: '16px', lineHeight: '100%' }}>
                        Выполнено {totalCompletedAssignments} {completedWord}
                    </p>
                    <p className={'text-sm text-white/80'}>{progressText}</p>
                </div>
                <Ripple className="rounded-full overflow-hidden flex-shrink-0">
                    <Link
                        to={nextLessonId ? `/library/lesson/${nextLessonId}` : (currentStage.module_id ? `/library/module/${currentStage.module_id}` : `/library/stage/${currentStage.stage_id}`)}
                        className="w-9 h-9 bg-[#FFFFFF33] rounded-full flex items-center justify-center"
                    >
                        <svg width="7" height="14" viewBox="0 0 7 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L6 7L1 13" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </Ripple>
            </div>
            <div className="w-full bg-[#FFFFFF33] rounded-full h-3" style={{
                background: `linear-gradient(90deg, white 0%, white ${progressPercentage}%, #FFFFFF33 ${progressPercentage}%)`
            }}>
            </div>
        </div>
    );
};
