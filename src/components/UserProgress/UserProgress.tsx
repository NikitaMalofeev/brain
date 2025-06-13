import React from 'react';
import { Link } from 'react-router-dom';
import { Ripple } from '@/components/ui/Ripple/Ripple';

// The RPC function 'get_library_stages' returns this type.
// We define it here to make this component self-contained with its data requirements.
export type StageProgressData = {
    stage_id: number;
    stage_name: string;
    is_unlocked: boolean;
    completed_lessons: number;
    total_lessons: number;
    overdue_lessons: number;
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

    const nextStage = stages.findIndex(s => !s.is_unlocked);


    // let progressText: string;
    // const lessonsRemaining = currentStage.total_lessons - currentStage.completed_lessons;
    //
    // if (lessonsRemaining > 0) {
    //     progressText = `Еще ${lessonsRemaining} заданий до следующей ступени`;
    // } else if (nextStage) {
    //     progressText = `Отлично! Следующая ступень "${nextStage.stage_name}" ждет вас.`;
    // } else {
    //     progressText = 'Поздравляем, вы завершили все ступени!';
    // }

    const progressPercentage = totalCompletedLessons / totalLessons * 100;

    return (
        <div className={`bg-white p-4 flex flex-col gap-3 sticky bottom-0 ${className}`}>
            <div className={'flex items-center justify-between'}>
                <div className={'flex flex-col'}>
                    <p className={'font-bold text-black'}>Выполнено {totalCompletedLessons} заданий</p>
                    <p className={'text-sm text-[#8C8C8C]'}>Еще 24 дня до {getWordByIndex(nextStage+1)} ступени</p>
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