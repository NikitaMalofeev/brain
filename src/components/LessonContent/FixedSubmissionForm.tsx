import React, { useState, useRef, useEffect } from 'react';
import { uploadFileToR2, buildFileUrl } from '@/lib/cloudflareR2Service';
import { supabase } from '@/lib/supabase/client';
import { LessonBlock, Submission } from '@/lib/supabase/types';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea'; // Заменено на обычный textarea
// import { cn } from '@/lib/utils'; // Больше не нужен
import { useNavigate } from 'react-router-dom';
import { Ripple } from '../ui/Ripple/Ripple';

interface FixedSubmissionFormProps {
    lessonId: number;
    stageId?: number;
    user: User | null;
    existingSubmission?: Submission | null;
    onSubmissionUpdate: (submission: Submission) => void;
    isRetryMode?: boolean; // Новый проп для режима пересдачи
    lessonDeadline?: string; // Дедлайн урока для проверки опоздания
}

const FixedSubmissionForm: React.FC<FixedSubmissionFormProps> = ({
    lessonId,
    stageId,
    user,
    existingSubmission,
    onSubmissionUpdate,
    isRetryMode,
    lessonDeadline,
}) => {
    const [submissionText, setSubmissionText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [textareaHeight, setTextareaHeight] = useState(28); // Отслеживаем высоту textarea

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSubmitted = !!existingSubmission;
    const navigate = useNavigate();

    // Обновляем состояние формы при изменении existingSubmission или isRetryMode
    useEffect(() => {
        if (isRetryMode && existingSubmission) {
            // При активации режима пересдачи - предзаполняем форму
            setSubmissionText(existingSubmission.content_text || '');
            setUploadedFiles(existingSubmission.file_url ? [existingSubmission.file_url] : []);
        } else if (!existingSubmission) {
            // При отсутствии submission - очищаем форму
            setSubmissionText('');
            setUploadedFiles([]);
        }
        // При наличии submission но без isRetryMode - форма остается пустой
    }, [existingSubmission, isRetryMode]);

    // Определяем выравнивание иконки: по центру для минимальной высоты, внизу для расширенной
    const isTextareaExpanded = textareaHeight > 28;
    const iconAlignment = isTextareaExpanded ? 'items-end' : 'items-center';

    // Автоматическое изменение высоты textarea
    useEffect(() => {
        const textArea = textareaRef.current;
        if (textArea) {
            // Минимальная высота 28px для одной строки
            const MIN_HEIGHT = 28;
            // Максимальная высота поля ввода - 30% от высоты окна
            const maxInputHeight = Math.round(window.innerHeight * 0.30);

            // Сбрасываем высоту для корректного расчета scrollHeight
            textArea.style.height = `${MIN_HEIGHT}px`;
            const scrollHeight = textArea.scrollHeight;

            // Если контент больше минимальной высоты, увеличиваем
            if (scrollHeight > MIN_HEIGHT) {
                const newHeight = Math.min(scrollHeight, maxInputHeight);
                textArea.style.height = `${newHeight}px`;
                textArea.style.overflowY = newHeight >= maxInputHeight ? 'auto' : 'hidden';
                setTextareaHeight(newHeight); // Обновляем состояние высоты
            } else {
                // Для пустого поля или одной строки - фиксированная минимальная высота
                textArea.style.height = `${MIN_HEIGHT}px`;
                textArea.style.overflowY = 'hidden';
                setTextareaHeight(MIN_HEIGHT); // Обновляем состояние высоты
            }
        }
    }, [submissionText]);

    // Обработка загрузки файлов
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                // Загружаем файл в R2 и получаем file path
                const filePath = await uploadFileToR2(file);
                // Проверяем, что filePath существует и является строкой
                if (!filePath || typeof filePath !== 'string') {
                    // Если filePath невалиден, кидаем ошибку, чтобы она была поймана ниже
                    throw new Error('File path is invalid after upload.');
                }
                // Преобразуем file path в публичный URL
                const fileUrl = buildFileUrl(filePath);
                return fileUrl;
            });

            const newFileUrls = await Promise.all(uploadPromises);
            setUploadedFiles(prev => [...prev, ...newFileUrls]);
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error); // Теперь здесь будет более детальная ошибка
            // TODO: Добавить нормальное уведомление об ошибке вместо alert
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Обработка отправки задания
    const handleSubmit = async () => {
        if (!user || !submissionText.trim() || isSubmitting || !supabase) return;

        setIsSubmitting(true);

        try {
            // Всегда используем статус 'submitted', опоздание определяется динамически
            const submissionData = {
                user_id: user.id,
                lesson_id: lessonId,
                content_text: submissionText.trim(),
                file_url: uploadedFiles.length > 0 ? uploadedFiles[0] : null,
                status: 'submitted' as const,
                submitted_at: new Date().toISOString(),
                points_awarded: 0,
            };

            let data;

            if (existingSubmission) {
                // Пересдача - обновляем существующую запись
                const { data: updateData, error } = await supabase
                    .from('submissions')
                    .update({
                        content_text: submissionData.content_text,
                        file_url: submissionData.file_url,
                        status: submissionData.status,
                        submitted_at: submissionData.submitted_at,
                        // НЕ обновляем first_submitted_at - оставляем оригинальное время первой сдачи
                        points_awarded: 0,
                        // Сбрасываем данные проверки
                        reviewed_at: null,
                        reviewed_by_curator_id: null,
                        feedback_text: null,
                    })
                    .eq('id', existingSubmission.id)
                    .select(`
                        *,
                        reviewer:users!submissions_reviewed_by_curator_id_fkey(
                            first_name, 
                            last_name
                        )
                    `)
                    .single();

                if (error) {
                    throw new Error(`Ошибка обновления задания: ${error.message}`);
                }

                data = updateData;
            } else {
                // Первая сдача - создаем новую запись
                const firstSubmissionData = {
                    ...submissionData,
                    first_submitted_at: submissionData.submitted_at, // Устанавливаем время первой сдачи
                };

                const { data: insertData, error } = await supabase
                    .from('submissions')
                    .insert(firstSubmissionData)
                    .select(`
                        *,
                        reviewer:users!submissions_reviewed_by_curator_id_fkey(
                            first_name, 
                            last_name
                        )
                    `)
                    .single();

                if (error) {
                    throw new Error(`Ошибка отправки задания: ${error.message}`);
                }

                data = insertData;
            }

            onSubmissionUpdate(data);
            // Убираем alert - пользователь увидит результат визуально (форма исчезнет, появится блок сданного задания)

        } catch (error) {
            console.error('Failed to submit assignment:', error);
            // TODO: Добавить нормальное уведомление об ошибке вместо alert
        } finally {
            setIsSubmitting(false);
        }
    };

    // Удаление файла
    const handleRemoveFile = (fileUrl: string) => {
        setUploadedFiles(prev => prev.filter(url => url !== fileUrl));
    };

    // Если задание уже сдано - ничего не рендерим (отображение перенесено в LessonPage)
    // Исключение: показываем форму для rejected заданий в режиме пересдачи
    if (existingSubmission && !isRetryMode) {
        const status = existingSubmission.status;
        // Не показываем форму для любых статусов, если не активирован режим пересдачи
        return null;
    }

    return (
        <div className="max-w-[600px] mx-auto fixed bottom-0 left-0 right-0 z-50 bg-[#E9E9E9] border-t border-gray-200 shadow-lg">
            {/* Прикрепленные файлы */}
            {uploadedFiles.length > 0 && (
                <div className="px-4 pt-3">
                    <div className="flex gap-2 flex-wrap">
                        {uploadedFiles.map((fileUrl, index) => {
                            // Используем getFileTypeInfo локально, т.к. он не был нужен в LessonPage
                            const fileName = decodeURIComponent(fileUrl.substring(fileUrl.lastIndexOf('/') + 1));
                            const extension = fileName.split('.').pop()?.toLowerCase() || '';
                            const fileIcon =
                                (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) ? '🖼️' :
                                    (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) ? '🎵' :
                                        (extension === 'pdf') ? '📄' :
                                            (['doc', 'docx'].includes(extension)) ? '📝' : '📎';

                            return (
                                <div
                                    key={index}
                                    className="flex items-center px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-600"
                                >
                                    <span className="mr-2">{fileIcon}</span>
                                    <span className="max-w-[120px] truncate">{fileName}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveFile(fileUrl)}
                                        className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Основная форма ввода - ВЫРАВНИВАНИЕ ПО НИЗУ */}
            <div className="flex items-end gap-2 p-4">
                {/* Контейнер для поля ввода и кнопки скрепки - ДИНАМИЧЕСКОЕ ВЫРАВНИВАНИЕ */}
                <div className={`flex-1 flex ${iconAlignment} gap-2 bg-white rounded-[24px] border border-gray-200`} style={{ padding: '6px 12px', minHeight: '40px' }}>
                    <textarea
                        ref={textareaRef}
                        placeholder="Домашнее задание"
                        value={submissionText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSubmissionText(e.target.value)}
                        className="flex-1 resize-none border-none bg-transparent text-sm text-black font-medium focus:outline-none placeholder:text-[#8D8D8D]"
                        style={{
                            fontSize: '14px',
                            lineHeight: '20px',
                            padding: '4px 8px 4px 0px', // py-1 эквивалент (4px top/bottom, 0px left, 8px right)
                            overflowY: 'hidden',
                            width: '100%',
                            boxSizing: 'border-box',
                            minHeight: 'auto',
                            height: 'auto',
                        }}
                    />

                    {/* Кнопка прикрепления файла */}
                    <Ripple className="rounded-full overflow-hidden flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-4 w-4 p-0 text-gray-500 hover:text-black"
                        >
                            {isUploading ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="15.708" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
                                </svg>
                            )}
                        </Button>
                    </Ripple>
                </div>

                {/* Кнопка отправки */}
                <Ripple className="rounded-full overflow-hidden flex items-center justify-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={!submissionText.trim() || isSubmitting || !user}
                        className={`rounded-full flex items-center justify-center ${submissionText.trim() && !isSubmitting && user
                            ? "bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)] hover:bg-gray-800 text-white"
                            : "bg-gray-300 cursor-not-allowed hover:bg-gray-300 text-gray-500"
                            }`}
                        style={{ padding: '0px', width: '40px', height: '40px' }}
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-current"
                        >
                            <path d="m5 12 7-7 7 7" />
                            <path d="m12 19 0-14" />
                        </svg>
                    </Button>
                </Ripple>
            </div>

            {/* Скрытый input для файлов */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
            />
        </div>
    );
};

export default FixedSubmissionForm; 