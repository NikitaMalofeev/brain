import React from 'react';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import {
  useAssignmentsWithProgress,
  useAssignmentProgress,
  useLessonFeedback,
} from '@/lib/supabase/hooks/useAssignments';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import AssignmentItem from './AssignmentItem';
import { logger } from '@/lib/logger';

interface AssignmentsListProps {
  lessonId: number;
}

/**
 * Компонент списка заданий урока с прогресс-баром
 * Отображает все задания урока, прогресс выполнения и обратную связь куратора
 */
const AssignmentsList: React.FC<AssignmentsListProps> = ({ lessonId }) => {
  const initDataSignal = useSignal(initDataState);
  const { supabaseUser } = useSupabaseUser(initDataSignal);

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useAssignmentsWithProgress(supabaseUser?.id, lessonId);

  const { data: progress } = useAssignmentProgress(supabaseUser?.id, lessonId);
  const { data: feedback } = useLessonFeedback(supabaseUser?.id, lessonId);

  // Логирование для отладки
  React.useEffect(() => {
    logger.debug('AssignmentsList state', {
      lessonId,
      userId: supabaseUser?.id,
      assignmentsCount: assignments?.length,
      progress,
      hasFeedback: !!feedback,
    });
  }, [lessonId, supabaseUser, assignments, progress, feedback]);

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
          <p className="text-sm text-[#666]">Загрузка заданий...</p>
        </div>
      </div>
    );
  }

  if (assignmentsError) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-sm text-red-500">Ошибка загрузки заданий</p>
          <p className="text-xs text-[#666] mt-1">{assignmentsError.message}</p>
        </div>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#666]">Нет заданий для этого урока</p>
      </div>
    );
  }

  const allSubmitted =
    progress?.submitted_assignments === progress?.total_assignments &&
    progress.total_assignments > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Прогресс-бар */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#242424]">Прогресс выполнения</h3>
          <span className="text-sm text-[#666]">
            {progress?.submitted_assignments || 0} из {progress?.total_assignments || 0}
          </span>
        </div>
        <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#B862EA] to-[#8E44AD] h-full rounded-full transition-all duration-300"
            style={{
              width: `${
                progress?.total_assignments
                  ? (progress.submitted_assignments / progress.total_assignments) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        {progress && progress.approved_assignments > 0 && (
          <p className="text-xs text-[#666] mt-2">
            ✅ Принято: {progress.approved_assignments} из {progress.total_assignments}
          </p>
        )}
      </div>

      {/* Список заданий */}
      <div className="flex flex-col gap-3">
        {assignments.map((assignment) => (
          <AssignmentItem
            key={assignment.id}
            assignment={assignment}
            userId={supabaseUser?.id || ''}
            lessonId={lessonId}
          />
        ))}
      </div>

      {/* Плашка "Молодец!" если все сдано */}
      {allSubmitted && !feedback && (
        <div className="bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎉</div>
            <div>
              <h3 className="text-base font-semibold">Молодец!</h3>
              <p className="text-sm opacity-90">Трекер уже проверяет твои ответы</p>
            </div>
          </div>
        </div>
      )}

      {/* Обратная связь от куратора */}
      {feedback && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-[#B862EA]">
          <h3 className="text-sm font-semibold text-[#242424] mb-2">
            Обратная связь от куратора
          </h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-[#666] whitespace-pre-wrap">{feedback.feedback_text}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsList;
