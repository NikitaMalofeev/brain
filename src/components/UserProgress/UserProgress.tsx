import React from 'react';
import { Link } from 'react-router-dom';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { getNounPluralForm } from '@/helpers/pluralize';

// The RPC function 'get_library_stages' returns this type.
// We define it here to make this component self-contained with its data requirements.
export type StageProgressData = {
    stage_id: number;
    stage_name: string;
    is_unlocked: boolean;
    completed_lessons: number;
    total_lessons: number;
    overdue_lessons: number;
    unlocked_lessons: number; // НОВОЕ ПОЛЕ: количество неоткрытых уроков
    cover_image_path?: string | null;
};


interface UserProgressProps {
    stages: StageProgressData[];
    className?: string;
}

export function getWordByIndex(index: number): string {
    const words = ["первой", "второй", "третьей", "четвёртой"];
    return words[index - 1] || "";
}

export const UserProgress: React.FC<UserProgressProps> = ({ stages, className }) => {
    if (!stages || stages.length === 0) {
        return null;
    }

    const totalCompletedLessons = stages.reduce((acc, stage) => acc + (stage.completed_lessons || 0), 0);
    const totalLessons = stages.reduce((acc, stage) => acc + (stage.total_lessons || 0), 0);
    const currentStage = [...stages].reverse().find(stage => stage.is_unlocked);

    // If no stage is unlocked yet, show a starting message.
    if (!currentStage) {
        return (
            <div className={`bg-white p-4 flex flex-col gap-2 sticky bottom-0 ${className}`}>
                <p className={'font-bold text-black'}>Прогресс скоро появится</p>
                <p className={'text-sm text-[#8C8C8C]'}>Разблокируйте первую ступень, чтобы начать обучение.</p>
            </div>
        );
    }

    const nextStageIndex = stages.findIndex(s => !s.is_unlocked);

    // Подсчитываем количество НЕоткрытых уроков в открытых ступенях до следующей неоткрытой ступени
    let unlockedLessonsUntilNextStage = 0;
    if (nextStageIndex !== -1) {
        // Если есть неоткрытая ступень, считаем неоткрытые уроки в открытых ступенях до неё
        for (let i = 0; i < nextStageIndex; i++) {
            const stage = stages[i];
            if (stage.is_unlocked) {
                unlockedLessonsUntilNextStage += stage.unlocked_lessons;
            }
        }
    } else {
        // Если все ступени открыты, считаем неоткрытые уроки во всех открытых ступенях
        unlockedLessonsUntilNextStage = stages.reduce((acc, stage) => {
            if (stage.is_unlocked) {
                return acc + stage.unlocked_lessons;
            }
            return acc;
        }, 0);
    }

    const progressPercentage = totalCompletedLessons / totalLessons * 100;

    // Генерируем текст в зависимости от количества неоткрытых уроков
    let progressText = '';
    const word = getNounPluralForm(unlockedLessonsUntilNextStage, 'задание', 'задания', 'заданий');

    if (nextStageIndex !== -1 && unlockedLessonsUntilNextStage > 0) {
        progressText = `Еще ${unlockedLessonsUntilNextStage} ${word} до открытия до ${getWordByIndex(nextStageIndex + 1)} ступени`;
    } else if (nextStageIndex !== -1 && unlockedLessonsUntilNextStage === 0) {
        progressText = `Все задания открыты до следующей ступени!`;
    } else if (unlockedLessonsUntilNextStage > 0) {
        progressText = `Еще ${unlockedLessonsUntilNextStage} ${word} до полного открытия`;
    } else {
        progressText = 'Все задания открыты!';
    }

    const completedLessonsWord = getNounPluralForm(totalCompletedLessons, 'задание', 'задания', 'заданий');

    return (
        <div className={`bg-white p-4 flex flex-col gap-3 sticky bottom-0 ${className}`}>
            <div className={'flex items-center justify-between'}>
                <div className={'flex flex-col'}>
                    <p className={'font-bold text-black'}>Выполнено {totalCompletedLessons} {completedLessonsWord}</p>
                    <p className={'text-sm text-[#8C8C8C]'}>{progressText}</p>
                </div>
                <Ripple className="rounded-full overflow-hidden">
                    <Link to={`/library/stage/${currentStage.stage_id}`}>
                        <img src={'/arrow-icon.svg'} alt={'Перейти к текущей ступени'} className={'w-[36px] h-[36px]'} />
                    </Link>
                </Ripple>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3" style={{
                background: `linear-gradient(90deg, #68B1EB 0%, #D0E4FF ${progressPercentage}%, #D0E4FF ${progressPercentage}%)`
            }}>
            </div>
        </div>
    );
}; 