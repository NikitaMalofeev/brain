import React, { useState, useEffect, useCallback } from 'react';
import { AssignmentWithProgress } from '@/lib/supabase/types';
import {
  useSaveAssignmentDraft,
  useSubmitAssignment,
} from '@/lib/supabase/hooks/useAssignments';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Check, Clock, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface AssignmentItemProps {
  assignment: AssignmentWithProgress;
  userId: string;
  lessonId: number;
}

/**
 * Компонент отдельного задания с автосохранением черновика
 * Позволяет сдавать задания по отдельности, с автосохранением текста
 */
const AssignmentItem: React.FC<AssignmentItemProps> = ({ assignment, userId, lessonId }) => {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(assignment.draft?.draft_text || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const saveDraftMutation = useSaveAssignmentDraft();
  const submitMutation = useSubmitAssignment();

  // Автосохранение с debounce 1 секунда
  const debouncedSave = useCallback(
    (value: string) => {
      // Очистить предыдущий таймаут
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }

      // Установить новый таймаут
      const timeoutId = setTimeout(() => {
        if (value.trim()) {
          setIsSaving(true);
          saveDraftMutation.mutate(
            {
              userId,
              assignmentId: assignment.id,
              draftText: value,
            },
            {
              onSuccess: () => {
                setIsSaving(false);
                logger.debug('Draft saved', { assignmentId: assignment.id });
              },
              onError: (error) => {
                setIsSaving(false);
                logger.error('Error saving draft', { assignmentId: assignment.id, error });
              },
            }
          );
        }
      }, 1000);

      setSaveTimeoutId(timeoutId);
    },
    [userId, assignment.id, saveDraftMutation, saveTimeoutId]
  );

  const handleTextChange = (value: string) => {
    setText(value);
    debouncedSave(value);
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      alert('Пожалуйста, введите ответ перед сдачей');
      return;
    }

    submitMutation.mutate(
      {
        userId,
        assignmentId: assignment.id,
        lessonId,
        submissionText: text,
      },
      {
        onSuccess: () => {
          logger.debug('Assignment submitted', { assignmentId: assignment.id });
          setText(''); // Очистить поле после сдачи
        },
        onError: (error) => {
          logger.error('Error submitting assignment', { assignmentId: assignment.id, error });
          alert('Ошибка при сдаче задания. Попробуйте еще раз.');
        },
      }
    );
  };

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
    };
  }, [saveTimeoutId]);

  const renderStatus = () => {
    const submission = assignment.submission;

    if (!submission) {
      return null;
    }

    if (submission.status === 'approved') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Задание принято!</p>
            {submission.points_awarded > 0 && (
              <p className="text-xs text-green-600">+{submission.points_awarded} баллов</p>
            )}
          </div>
        </div>
      );
    }

    if (submission.status === 'pending_review') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Clock className="w-4 h-4 text-yellow-600" />
          <p className="text-sm font-medium text-yellow-800">На проверке</p>
        </div>
      );
    }

    if (submission.status === 'rejected') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-4 h-4 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Требует доработки</p>
            {submission.feedback_text && (
              <p className="text-xs text-red-600 mt-1">{submission.feedback_text}</p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const canEdit = !assignment.submission || assignment.submission.status === 'rejected';

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Заголовок задания (кликабельный для раскрытия) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
              assignment.is_completed
                ? 'bg-green-500 text-white'
                : assignment.is_submitted
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-600'
            )}
          >
            {assignment.is_completed ? '✓' : assignment.order_num}
          </div>
          <h3 className="text-sm font-semibold text-[#242424] text-left">{assignment.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {renderStatus()}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-[#666]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#666]" />
          )}
        </div>
      </button>

      {/* Контент задания (раскрывается) */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Описание задания */}
          {assignment.description && (
            <div className="mt-3 mb-4">
              <p className="text-sm text-[#666] whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}

          {/* Обратная связь по заданию (если отклонено) */}
          {assignment.submission?.status === 'rejected' && assignment.submission.feedback_text && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-xs font-semibold text-red-800 mb-1">
                Обратная связь куратора:
              </h4>
              <p className="text-sm text-red-700 whitespace-pre-wrap">
                {assignment.submission.feedback_text}
              </p>
            </div>
          )}

          {/* Поле ввода (если можно редактировать) */}
          {canEdit && (
            <div className="mt-3">
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Ваш ответ..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#B862EA] focus:border-transparent text-sm"
              />

              {/* Индикатор сохранения */}
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-[#999]">
                  {isSaving ? (
                    <span className="flex items-center gap-1">
                      <div className="inline-block w-3 h-3 border-2 border-[#B862EA] border-t-transparent rounded-full animate-spin"></div>
                      Сохранение...
                    </span>
                  ) : text.trim() ? (
                    <span className="text-green-600">✓ Черновик сохранен</span>
                  ) : (
                    <span>Введите ответ</span>
                  )}
                </div>

                {/* Кнопка "Сдать задание" */}
                <Button
                  onClick={handleSubmit}
                  disabled={!text.trim() || submitMutation.isPending}
                  className="px-6 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? 'Отправка...' : 'Сдать задание'}
                </Button>
              </div>
            </div>
          )}

          {/* Отображение сданного ответа (если уже сдано и принято) */}
          {assignment.submission?.status === 'approved' && assignment.submission.content_text && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Ваш ответ:</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {assignment.submission.content_text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignmentItem;
