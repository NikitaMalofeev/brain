import React, { useState, useRef, useEffect } from 'react';
import { uploadFileToR2 } from '@/lib/cloudflareR2Service';
import { supabase } from '@/lib/supabase/client';
import { LessonBlock, Submission } from '@/lib/supabase/types';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea'; // Заменено на обычный textarea
// import { cn } from '@/lib/utils'; // Больше не нужен
import { useNavigate } from 'react-router-dom';

interface FixedSubmissionFormProps {
    lessonId: number;
    stageId?: number;
    user: User | null;
    existingSubmission?: Submission | null;
    onSubmissionUpdate: (submission: Submission) => void;
}

const FixedSubmissionForm: React.FC<FixedSubmissionFormProps> = ({
    lessonId,
    stageId,
    user,
    existingSubmission,
    onSubmissionUpdate,
}) => {
    const [submissionText, setSubmissionText] = useState(existingSubmission?.content_text || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>(
        existingSubmission?.file_url ? [existingSubmission.file_url] : []
    );
    const [isUploading, setIsUploading] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSubmitted = !!existingSubmission;
    const navigate = useNavigate();

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
            } else {
                // Для пустого поля или одной строки - фиксированная минимальная высота
                textArea.style.height = `${MIN_HEIGHT}px`;
                textArea.style.overflowY = 'hidden';
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
                return await uploadFileToR2(file);
            });

            const newFileUrls = await Promise.all(uploadPromises);
            setUploadedFiles(prev => [...prev, ...newFileUrls]);
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
            alert('Ошибка загрузки файлов. Попробуйте еще раз.');
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
            const submissionData = {
                user_id: user.id,
                lesson_id: lessonId,
                content_text: submissionText.trim(),
                file_url: uploadedFiles.length > 0 ? uploadedFiles[0] : null,
                status: 'submitted' as const,
                submitted_at: new Date().toISOString(),
                points_awarded: 0,
            };

            const { data, error } = await supabase
                .from('submissions')
                .insert(submissionData)
                .select()
                .single();

            if (error) {
                throw new Error(`Ошибка отправки задания: ${error.message}`);
            }

            onSubmissionUpdate(data);
            alert('Задание успешно сдано!');

        } catch (error) {
            console.error('Failed to submit assignment:', error);
            alert('Ошибка отправки задания. Попробуйте еще раз.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Удаление файла
    const handleRemoveFile = (fileUrl: string) => {
        setUploadedFiles(prev => prev.filter(url => url !== fileUrl));
    };

    // Если задание уже сдано - показываем статус, текст, файл и кнопку
    if (isSubmitted && existingSubmission) {
        const submittedFileName = existingSubmission.file_url
            ? existingSubmission.file_url.substring(existingSubmission.file_url.lastIndexOf('/') + 1)
            : null;

        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-[375px] mx-auto text-left">
                    <p className="text-center font-mono text-base font-medium text-foreground mb-3">
                        ✅ Задание сдано на проверку
                    </p>
                    {existingSubmission.content_text && (
                        <div className="mb-2">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Ваш ответ:</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">
                                {existingSubmission.content_text}
                            </p>
                        </div>
                    )}
                    {existingSubmission.file_url && submittedFileName && (
                        <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Прикрепленный файл:</p>
                            <a
                                href={existingSubmission.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all"
                            >
                                📄 {decodeURIComponent(submittedFileName)}
                            </a>
                        </div>
                    )}
                    {typeof stageId === 'number' && (
                        <Button
                            onClick={() => navigate(`/library/stage/${stageId}`)}
                            className="w-full mt-2 bg-black hover:bg-gray-800 text-white font-mono"
                        >
                            Вернуться ко всем урокам ступени
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
            {/* Прикрепленные файлы */}
            {uploadedFiles.length > 0 && (
                <div className="px-4 pt-3">
                    <div className="flex gap-2 flex-wrap">
                        {uploadedFiles.map((fileUrl, index) => (
                            <div
                                key={index}
                                className="flex items-center px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-600"
                            >
                                📄 Файл {index + 1}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFile(fileUrl)}
                                    className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                                >
                                    ✕
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Основная форма ввода - ВЫРАВНИВАНИЕ ПО НИЗУ */}
            <div className="flex items-end gap-2 p-3">
                {/* Контейнер для поля ввода и кнопки скрепки - ВЫРАВНИВАНИЕ ПО НИЗУ */}
                <div className="flex-1 flex items-center gap-2 bg-neutral-100 rounded-[24px] border border-gray-200" style={{ padding: '6px 12px', minHeight: '40px' }}>
                    <textarea
                        ref={textareaRef}
                        placeholder="Домашнее задание"
                        value={submissionText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSubmissionText(e.target.value)}
                        className="flex-1 resize-none border-none bg-transparent text-sm text-black font-medium focus:outline-none placeholder:text-[#8D8D8D]"
                        style={{
                            fontFamily: 'Montserrat, sans-serif',
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
                </div>

                {/* Кнопка отправки */}
                <Button
                    onClick={handleSubmit}
                    disabled={!submissionText.trim() || isSubmitting || !user}
                    className={`rounded-full flex items-center justify-center ${submissionText.trim() && !isSubmitting && user
                        ? "bg-black hover:bg-gray-800 text-white"
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