import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useStudentDetails, StudentLessonProgress, StudentMaterialView } from '@/lib/supabase/hooks/useStudentDetails';
import { useStudentActions } from '@/lib/supabase/hooks/useStudentActions';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';
import { useCoursesAdmin } from '@/lib/supabase/hooks/useCoursesAdmin';
import { useCuratorsAdmin } from '@/lib/supabase/hooks/useCuratorsAdmin';
import { validateCuratorPassword, validateLoginFormat } from '@/helpers/validationHelpers';
import { CURATOR_PASSWORD_CONFIG } from '@/lib/config/constants';
import { supabase } from '@/lib/supabase/client';
import { useStreams } from '@/lib/supabase/hooks/useTariffConfiguration';
import {
    useStudentStream,
    useStudentTariff,
    useAssignStudentToStream,
    useAssignStudentTariff,
    useRemoveStudentFromStream,
    useRemoveStudentTariff
} from '@/lib/supabase/hooks/useStudentStreamAndTariff';
import {
    useBundles,
    useUserBundles,
    useAssignBundleToUser,
    useRemoveBundleFromUser
} from '@/lib/supabase/hooks/useBundles';
import {
    useUserSpecialBundleTechniques,
    useMarkSpecialTechniquePaid,
    useUnmarkSpecialTechniquePaid,
    groupTechniquesBySpecialBundle,
} from '@/lib/supabase/hooks/useSpecialBundles';
import {
    useUserPaidTechniques,
    useMarkPaidTechniquePaid,
    useUnmarkPaidTechniquePaid,
} from '@/lib/supabase/hooks/useTechniqueSchedule';

interface StudentCardProps {
    studentId: string;
    onBack: () => void;
    currentUser?: {
        id: string;
        role: string;
    } | null;
}

const StudentCard: React.FC<StudentCardProps> = ({ studentId, onBack, currentUser }) => {
    const { studentDetails, loading, error, loadStudentDetails, assignStudentTariff, assigningTariff } = useStudentDetails();
    const { resetLessonProgress, markMaterialViewed, resetMaterialView, updateStudentPoints, updatePersonalChatLink, assignCourseToStudent, markLessonAsCompleted, markLessonAsIncomplete } = useStudentActions();
    const { tariffs, loading: tariffsLoading } = useTariffsAdmin();
    const { courses, loading: coursesLoading } = useCoursesAdmin();
    const { promoteToCurator, isPromoting } = useCuratorsAdmin();

    // Новая система: потоки и тарифы
    const { data: streams, isLoading: streamsLoading } = useStreams();
    const { data: studentStream } = useStudentStream(studentId);
    const { data: studentTariff } = useStudentTariff(studentId);
    const assignToStreamMutation = useAssignStudentToStream();
    const assignTariffMutation = useAssignStudentTariff();
    const removeFromStreamMutation = useRemoveStudentFromStream();
    const removeTariffMutation = useRemoveStudentTariff();

    // Пакеты
    const { data: bundles, isLoading: bundlesLoading } = useBundles();
    const { data: userBundles } = useUserBundles(studentId);
    const assignBundleMutation = useAssignBundleToUser();
    const removeBundleMutation = useRemoveBundleFromUser();

    // Специальные пакеты
    const { data: userSpecialBundleTechniques } = useUserSpecialBundleTechniques(studentId);
    const markPaidMutation = useMarkSpecialTechniquePaid();
    const unmarkPaidMutation = useUnmarkSpecialTechniquePaid();
    const specialBundleGroups = userSpecialBundleTechniques
        ? groupTechniquesBySpecialBundle(userSpecialBundleTechniques)
        : [];

    // Платные техники (status = 'paid')
    const { data: paidTechniques } = useUserPaidTechniques(studentId);
    const markPaidTechniqueMutation = useMarkPaidTechniquePaid();
    const unmarkPaidTechniqueMutation = useUnmarkPaidTechniquePaid();

    // Cостояние для модального окна назначения куратором
    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [promoteFormData, setPromoteFormData] = useState({
        webLogin: '',
        password: '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    // Состояние для модального окна успешного назначения
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successCredentials, setSuccessCredentials] = useState<{
        login: string;
        password: string;
    } | null>(null);

    // Состояние для выбранного тарифа
    const [selectedTariffId, setSelectedTariffId] = useState<string>('');

    // Состояние для выбранного курса (старая система, оставляем для совместимости)
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // Состояние для выбранного потока (новая система)
    const [selectedStreamId, setSelectedStreamId] = useState<string>('');

    // Состояние для выбранной роли
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [roleLoading, setRoleLoading] = useState<boolean>(false);

    // Локальный стейт для загрузки строк и bulk-операций
    const [rowLoading, setRowLoading] = useState<Record<number, boolean>>({});
    const [bulkLoading, setBulkLoading] = useState<boolean>(false);

    // Состояние для формы добавления/удаления баллов
    const [deltaPoints, setDeltaPoints] = useState<string>('');
    const [pointsLoading, setPointsLoading] = useState<boolean>(false);

    // Состояние для редактирования ссылки на личный чат
    const [personalChatLink, setPersonalChatLink] = useState<string>('');
    const [chatLinkLoading, setChatLinkLoading] = useState<boolean>(false);
    const [isEditingChatLink, setIsEditingChatLink] = useState<boolean>(false);

    // Состояние для выбранных пакетов
    const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);

    useEffect(() => {
        loadStudentDetails(studentId);
    }, [studentId]);

    // Синхронизируем выбранный тариф с данными студента
    useEffect(() => {
        if (studentDetails?.basicInfo.current_tariff_id) {
            setSelectedTariffId(studentDetails.basicInfo.current_tariff_id);
        } else {
            setSelectedTariffId('');
        }
    }, [studentDetails?.basicInfo.current_tariff_id]);

    // Синхронизируем ссылку на личный чат с данными студента
    useEffect(() => {
        if (studentDetails?.basicInfo.personal_chat_link) {
            setPersonalChatLink(studentDetails.basicInfo.personal_chat_link);
        } else {
            setPersonalChatLink('');
        }
    }, [studentDetails?.basicInfo.personal_chat_link]);

    // Синхронизируем выбранную роль с данными студента
    useEffect(() => {
        if (studentDetails?.basicInfo.role) {
            setSelectedRole(studentDetails.basicInfo.role);
        }
    }, [studentDetails?.basicInfo.role]);

    // Синхронизируем выбранный поток с данными студента (новая система)
    useEffect(() => {
        if (studentStream?.stream_id) {
            setSelectedStreamId(studentStream.stream_id);
        } else {
            setSelectedStreamId('');
        }
    }, [studentStream]);

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    };
    const formatDateTime = (dateString?: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('ru-RU', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleUpdatePoints = async () => {
        const input = prompt('Введите новое количество баллов:', studentDetails?.basicInfo.total_points.toString());
        if (input == null) return;
        const value = parseInt(input, 10);
        if (isNaN(value)) {
            alert('Неверное число');
            return;
        }
        await updateStudentPoints(studentId, value);
        await loadStudentDetails(studentId);
    };

    const handleAssignTariff = async () => {
        if (!selectedTariffId) {
            alert('Выберите тариф');
            return;
        }

        try {
            await assignStudentTariff(studentId, selectedTariffId);
            alert('Тариф успешно назначен');
        } catch (error) {
            console.error('Ошибка при назначении тарифа:', error);
            alert('Ошибка при назначении тарифа');
        }
    };

    const handleAssignCourse = async () => {
        if (!selectedCourseId) {
            alert('Выберите курс');
            return;
        }

        try {
            await assignCourseToStudent(studentId, selectedCourseId);
            await loadStudentDetails(studentId);
            alert('Курс успешно назначен');
        } catch (error) {
            console.error('Ошибка при назначении курса:', error);
            alert('Ошибка при назначении курса');
        }
    };

    // Новая система: назначить студента в поток
    const handleAssignStream = async () => {
        if (!selectedStreamId) {
            alert('Выберите поток');
            return;
        }

        try {
            await assignToStreamMutation.mutateAsync({
                userId: studentId,
                streamId: selectedStreamId,
            });
            alert('Поток успешно назначен');
        } catch (error) {
            console.error('Ошибка при назначении потока:', error);
            alert('Ошибка при назначении потока');
        }
    };

    // Новая система: удалить студента из потока
    const handleRemoveStream = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить студента из потока?')) {
            return;
        }

        try {
            await removeFromStreamMutation.mutateAsync(studentId);
            setSelectedStreamId('');
            alert('Студент удален из потока');
        } catch (error) {
            console.error('Ошибка при удалении из потока:', error);
            alert('Ошибка при удалении из потока');
        }
    };

    // Новая система: удалить тариф студента
    const handleRemoveTariff = async () => {
        if (!window.confirm('Вы уверены, что хотите сбросить тариф студента?')) {
            return;
        }

        try {
            await removeTariffMutation.mutateAsync(studentId);
            setSelectedTariffId('');
            await loadStudentDetails(studentId);
            alert('Тариф студента сброшен');
        } catch (error) {
            console.error('Ошибка при сбросе тарифа:', error);
            alert('Ошибка при сбросе тарифа');
        }
    };

    // Назначить пакеты пользователю
    const handleAssignBundles = async () => {
        if (selectedBundleIds.length === 0) {
            alert('Выберите хотя бы один пакет');
            return;
        }

        try {
            // Получаем уже назначенные пакеты
            const currentBundleIds = userBundles?.map(ub => ub.bundle_id) || [];

            // Находим новые пакеты для добавления
            const bundlesToAdd = selectedBundleIds.filter(id => !currentBundleIds.includes(id));

            // Назначаем новые пакеты
            for (const bundleId of bundlesToAdd) {
                await assignBundleMutation.mutateAsync({
                    user_id: studentId,
                    bundle_id: bundleId,
                });
            }

            alert('Пакеты успешно назначены');
            setSelectedBundleIds([]);
        } catch (error) {
            console.error('Ошибка при назначении пакетов:', error);
            alert('Ошибка при назначении пакетов');
        }
    };

    // Удалить пакет у пользователя
    const handleRemoveBundle = async (userBundleId: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот пакет у пользователя?')) {
            return;
        }

        try {
            await removeBundleMutation.mutateAsync(userBundleId);
            alert('Пакет успешно удален');
        } catch (error) {
            console.error('Ошибка при удалении пакета:', error);
            alert('Ошибка при удалении пакета');
        }
    };

    // Функция для добавления баллов
    const handleAddPoints = async () => {
        const points = parseInt(deltaPoints, 10);
        if (isNaN(points) || points <= 0) {
            alert('Введите корректное положительное число');
            return;
        }

        setPointsLoading(true);
        try {
            const newPoints = basicInfo.total_points + points;
            await updateStudentPoints(studentId, newPoints);
            await loadStudentDetails(studentId);
            setDeltaPoints('');
            alert(`Добавлено ${points} баллов. Новый баланс: ${newPoints}`);
        } catch (error) {
            console.error('Ошибка при добавлении баллов:', error);
            alert('Ошибка при добавлении баллов');
        } finally {
            setPointsLoading(false);
        }
    };

    // Функция для удаления баллов
    const handleSubtractPoints = async () => {
        const points = parseInt(deltaPoints, 10);
        if (isNaN(points) || points <= 0) {
            alert('Введите корректное положительное число');
            return;
        }

        setPointsLoading(true);
        try {
            const newPoints = Math.max(0, basicInfo.total_points - points);
            await updateStudentPoints(studentId, newPoints);
            await loadStudentDetails(studentId);
            setDeltaPoints('');
            alert(`Удалено ${points} баллов. Новый баланс: ${newPoints}`);
        } catch (error) {
            console.error('Ошибка при удалении баллов:', error);
            alert('Ошибка при удалении баллов');
        } finally {
            setPointsLoading(false);
        }
    };

    // Функции для работы с личным чатом
    const handleEditChatLink = () => {
        setIsEditingChatLink(true);
    };

    const handleSaveChatLink = async () => {
        setChatLinkLoading(true);
        try {
            const linkToSave = personalChatLink.trim() || null;
            await updatePersonalChatLink(studentId, linkToSave);
            await loadStudentDetails(studentId);
            setIsEditingChatLink(false);
            alert('Ссылка на личный чат обновлена');
        } catch (error) {
            console.error('Ошибка при обновлении ссылки на чат:', error);
            alert('Ошибка при обновлении ссылки на чат');
        } finally {
            setChatLinkLoading(false);
        }
    };

    const handleCancelEditChatLink = () => {
        // Восстанавливаем исходное значение
        setPersonalChatLink(studentDetails?.basicInfo.personal_chat_link || '');
        setIsEditingChatLink(false);
    };

    // Bulk: отметить все уроки как пройденные
    const handleBulkComplete = async () => {
        if (!window.confirm('Отметить все уроки как пройденные?')) return;
        setBulkLoading(true);
        try {
            for (const lesson of studentDetails?.lessonProgress || []) {
                if (!lesson.is_completed) {
                    await markLessonAsCompleted(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert('Все уроки отмечены как пройденные');
        } catch (error) {
            console.error('Ошибка при массовом завершении уроков:', error);
            alert('Ошибка при массовом завершении уроков');
        } finally {
            setBulkLoading(false);
        }
    };

    // Bulk: снять все отметки пройденных уроков
    const handleBulkReset = async () => {
        if (!window.confirm('Снять все отметки пройденных уроков?')) return;
        setBulkLoading(true);
        try {
            for (const lesson of studentDetails?.lessonProgress || []) {
                if (lesson.is_completed) {
                    await markLessonAsIncomplete(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert('Все отметки сняты');
        } catch (error) {
            console.error('Ошибка при массовом снятии отметок уроков:', error);
            alert('Ошибка при массовом снятии отметок уроков');
        } finally {
            setBulkLoading(false);
        }
    };

    // Bulk операции для конкретной ступени
    const handleStageComplete = async (stageName: string, lessons: StudentLessonProgress[]) => {
        if (!window.confirm(`Отметить все уроки ступени "${stageName}" как пройденные?`)) return;
        setBulkLoading(true);
        try {
            for (const lesson of lessons) {
                if (!lesson.is_completed) {
                    await markLessonAsCompleted(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert(`Все уроки ступени "${stageName}" отмечены как пройденные`);
        } catch (error) {
            console.error('Ошибка при завершении уроков ступени:', error);
            alert('Ошибка при завершении уроков ступени');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleStageReset = async (stageName: string, lessons: StudentLessonProgress[]) => {
        if (!window.confirm(`Снять все отметки с уроков ступени "${stageName}"?`)) return;
        setBulkLoading(true);
        try {
            for (const lesson of lessons) {
                if (lesson.is_completed) {
                    await markLessonAsIncomplete(studentId, lesson.lesson_id);
                }
            }
            await loadStudentDetails(studentId);
            alert(`Все отметки с уроков ступени "${stageName}" сняты`);
        } catch (error) {
            console.error('Ошибка при сбросе уроков ступени:', error);
            alert('Ошибка при сбросе уроков ступени');
        } finally {
            setBulkLoading(false);
        }
    };

    const openPromoteModal = () => {
        if (!studentDetails) return;
        setPromoteFormData({
            webLogin: '',
            password: '',
        });
        setFormError(null);
        setIsPromoteModalOpen(true);
    };

    const closePromoteModal = () => {
        setIsPromoteModalOpen(false);
    };

    const handlePromoteFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPromoteFormData({
            ...promoteFormData,
            [e.target.name]: e.target.value,
        });
    };

    const handleChangeRole = async () => {
        if (!selectedRole || selectedRole === basicInfo.role) {
            alert('Выберите новую роль');
            return;
        }

        // Если роль admin - запрещаем изменение
        if (basicInfo.role === 'admin') {
            alert('Нельзя изменить роль администратора');
            return;
        }

        // Если меняем на curator - открываем модалку
        if (selectedRole === 'curator') {
            openPromoteModal();
            return;
        }

        // Для остальных ролей - просто меняем
        if (!window.confirm(`Изменить роль пользователя с "${basicInfo.role}" на "${selectedRole}"?`)) {
            return;
        }

        setRoleLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: selectedRole })
                .eq('id', studentId);

            if (error) throw error;

            alert('Роль успешно изменена');
            await loadStudentDetails(studentId);
        } catch (error: any) {
            console.error('Ошибка при изменении роли:', error);
            alert(`Ошибка: ${error.message || 'Не удалось изменить роль'}`);
        } finally {
            setRoleLoading(false);
        }
    };

    const handlePromoteToCurator = async () => {
        // Валидация логина и пароля
        const loginError = validateLoginFormat(promoteFormData.webLogin);
        if (loginError) {
            setFormError(loginError);
            return;
        }

        const passwordError = validateCuratorPassword(promoteFormData.password);
        if (passwordError) {
            setFormError(passwordError);
            return;
        }

        setFormError(null);

        try {
            if (!currentUser?.id) {
                throw new Error('Не удалось определить ID текущего пользователя');
            }

            await promoteToCurator({
                userId: studentId,
                webLogin: promoteFormData.webLogin,
                password: promoteFormData.password,
                adminId: currentUser.id, // Передаем ID текущего админа
            });

            // Показываем модальное окно с учетными данными вместо alert
            setSuccessCredentials({
                login: promoteFormData.webLogin,
                password: promoteFormData.password,
            });
            setIsPromoteModalOpen(false);
            setIsSuccessModalOpen(true);

            // Обновляем данные студента после назначения куратором
            await loadStudentDetails(studentId);
        } catch (error: any) {
            console.error('Ошибка при назначении куратора:', error);
            alert(`Ошибка: ${error.message || 'Не удалось назначить куратора'}`);
        }
    };

    // Компонент модального окна успешного назначения
    const SuccessModal = () => {
        const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

        const copyToClipboard = async (text: string, type: string) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopyFeedback(`${type} скопирован!`);
                setTimeout(() => setCopyFeedback(null), 2000);
            } catch (error) {
                console.error('Ошибка при копировании:', error);
                setCopyFeedback('Ошибка копирования');
                setTimeout(() => setCopyFeedback(null), 2000);
            }
        };

        const closeSuccessModal = () => {
            setIsSuccessModalOpen(false);
            setSuccessCredentials(null);
            setCopyFeedback(null);
        };

        if (!successCredentials) return null;

        return (
            <div className="admin-modal-backdrop" onClick={closeSuccessModal}>
                <div className="admin-modal" onClick={e => e.stopPropagation()}>
                    <h3>✅ Куратор назначен успешно!</h3>
                    <p>Передайте эти данные новому куратору:</p>

                    <div className="credentials-block">
                        <div className="credential-item">
                            <label>Логин:</label>
                            <code className="credential-value">{successCredentials.login}</code>
                            <button
                                className="admin-button copy-btn"
                                onClick={() => copyToClipboard(successCredentials.login, 'Логин')}
                            >
                                📋 Скопировать
                            </button>
                        </div>

                        <div className="credential-item">
                            <label>Пароль:</label>
                            <code className="credential-value">{successCredentials.password}</code>
                            <button
                                className="admin-button copy-btn"
                                onClick={() => copyToClipboard(successCredentials.password, 'Пароль')}
                            >
                                📋 Скопировать
                            </button>
                        </div>
                    </div>

                    {copyFeedback && (
                        <div className="copy-feedback">
                            {copyFeedback}
                        </div>
                    )}

                    <div className="form-actions">
                        <button className="admin-button" onClick={closeSuccessModal}>
                            Понятно
                        </button>
                    </div>
                </div>
            </div>
        );
    };



    if (loading) return <div className="admin-loading">Загрузка...</div>;
    if (error) return <div className="admin-error">Ошибка: {error.message}</div>;
    if (!studentDetails) return null;

    const { basicInfo, lessonProgress, materialViews, progressStats } = studentDetails;

    // Группировка уроков по стадиям
    const lessonsByStage: Record<string, StudentLessonProgress[]> = {};
    lessonProgress.forEach(l => {
        if (!lessonsByStage[l.stage_name]) lessonsByStage[l.stage_name] = [];
        lessonsByStage[l.stage_name].push(l);
    });

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2>Карточка ученика</h2>
                <button className="admin-button" onClick={onBack}>← Назад</button>
            </div>

            <div className="admin-card">
                <h3>Основная информация</h3>
                <p><strong>ФИО:</strong> {basicInfo.full_name}</p>
                <p><strong>Telegram-ID / Web-login:</strong> {basicInfo.web_login || basicInfo.telegram_id}</p>
                <p><strong>Дата регистрации:</strong> {formatDate(basicInfo.created_at)}</p>
                <p><strong>Последний вход:</strong> {formatDateTime(basicInfo.web_last_login || basicInfo.last_login)}</p>
                <p style={{ paddingTop: '12px' }}>
                    <strong>Баллы:</strong> {basicInfo.total_points}{' '}
                    <button className="action-btn edit-btn" onClick={handleUpdatePoints}>Изменить</button>
                </p>

                {/* Поле для личного чата */}
                <div className="form-group" style={{ paddingTop: '12px' }}>
                    <label style={{ fontSize: '16px', fontWeight: '600' }}>Чат десятки:</label>
                    {!isEditingChatLink ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            {basicInfo.personal_chat_link ? (
                                <a
                                    href={basicInfo.personal_chat_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#0088cc', textDecoration: 'none' }}
                                >
                                    {basicInfo.personal_chat_link}
                                </a>
                            ) : (
                                <span style={{ color: '#999' }}>Не указан</span>
                            )}
                            <button
                                className="action-btn edit-btn"
                                onClick={handleEditChatLink}
                                title="Редактировать ссылку на чат"
                            >
                                Изменить
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginTop: '4px' }}>
                            <input
                                type="url"
                                className="admin-input"
                                style={{ width: '100%', marginBottom: '8px' }}
                                placeholder="https://t.me/username или ссылка на чат"
                                value={personalChatLink}
                                onChange={(e) => setPersonalChatLink(e.target.value)}
                                disabled={chatLinkLoading}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="action-btn edit-btn"
                                    onClick={handleSaveChatLink}
                                    disabled={chatLinkLoading}
                                >
                                    {chatLinkLoading ? 'Сохранение...' : 'Сохранить'}
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={handleCancelEditChatLink}
                                    disabled={chatLinkLoading}
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Форма для добавления/удаления баллов */}
                <div className="form-group" style={{ paddingTop: '12px' }}>
                    <label style={{ fontSize: '16px', fontWeight: '600' }}>Корректировка баллов:</label>
                    <input
                        type="number"
                        className="admin-input"
                        style={{ width: '33%' }}
                        placeholder="Количество баллов"
                        value={deltaPoints}
                        onChange={(e) => setDeltaPoints(e.target.value)}
                        disabled={pointsLoading}
                        min="1"
                    />
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'left' }}>
                        <button
                            className="action-btn edit-btn"
                            style={{
                                position: 'relative'
                            }}
                            onClick={handleAddPoints}
                            disabled={pointsLoading || !deltaPoints}
                            title="Добавить баллы"
                        >
                            <style>{`
                                .action-btn.edit-btn[title="Добавить баллы"]::before {
                                    content: '+' !important;
                                    font-size: 16px !important;
                                }
                            `}</style>
                            {pointsLoading ? '...' : 'Добавить'}
                        </button>
                        <button
                            className="action-btn delete-btn"
                            style={{
                                position: 'relative'
                            }}
                            onClick={handleSubtractPoints}
                            disabled={pointsLoading || !deltaPoints}
                            title="Удалить баллы"
                        >
                            <style>{`
                                .action-btn.delete-btn[title="Удалить баллы"]::before {
                                    content: '−' !important;
                                    font-size: 16px !important;
                                }
                            `}</style>
                            {pointsLoading ? '...' : 'Убрать'}
                        </button>
                    </div>
                </div>
                {/* НОВАЯ СИСТЕМА: Выбор потока */}
                <div className="form-group">
                    <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Поток обучения:</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <select
                                className="admin-input"
                                style={{
                                    fontSize: '14px',
                                    padding: '8px 12px',
                                    height: '36px',
                                    minWidth: '200px'
                                }}
                                value={selectedStreamId}
                                onChange={(e) => setSelectedStreamId(e.target.value)}
                                disabled={streamsLoading || assignToStreamMutation.isPending}
                            >
                                <option value="">-- Выберите поток --</option>
                                {streams?.map(stream => (
                                    <option key={stream.id} value={stream.id}>
                                        {stream.name}
                                    </option>
                                ))}
                            </select>
                            {studentStream?.streams && (
                                <small style={{
                                    display: 'block',
                                    marginTop: '4px',
                                    color: '#666',
                                    fontSize: '12px'
                                }}>
                                    Текущий поток: {(studentStream.streams as any).name}
                                </small>
                            )}
                        </div>
                        <button
                            className="admin-button"
                            style={{
                                fontSize: '14px',
                                padding: '8px 16px',
                                height: '36px',
                                minWidth: '100px',
                                flexShrink: 0
                            }}
                            onClick={handleAssignStream}
                            disabled={assignToStreamMutation.isPending || !selectedStreamId}
                        >
                            {assignToStreamMutation.isPending ? 'Назначение...' : 'Назначить'}
                        </button>
                        {studentStream && (
                            <button
                                className="admin-button"
                                style={{
                                    fontSize: '14px',
                                    padding: '8px 16px',
                                    height: '36px',
                                    minWidth: '100px',
                                    flexShrink: 0,
                                    backgroundColor: '#dc3545'
                                }}
                                onClick={handleRemoveStream}
                                disabled={removeFromStreamMutation.isPending}
                            >
                                {removeFromStreamMutation.isPending ? 'Удаление...' : 'Удалить'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Выбор тарифа пользователя */}
                <div className="form-group">
                    <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Текущий тариф:</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <select
                                className="admin-input"
                                style={{
                                    fontSize: '14px',
                                    padding: '8px 12px',
                                    height: '36px',
                                    minWidth: '200px'
                                }}
                                value={selectedTariffId}
                                onChange={(e) => setSelectedTariffId(e.target.value)}
                                disabled={tariffsLoading || assigningTariff}
                            >
                                <option value="">-- Выберите тариф --</option>
                                {tariffs.map(tariff => (
                                    <option key={tariff.id} value={tariff.id}>
                                        {tariff.name} ({tariff.code})
                                    </option>
                                ))}
                            </select>
                            {basicInfo.current_tariff_name && (
                                <small style={{
                                    display: 'block',
                                    marginTop: '4px',
                                    color: '#666',
                                    fontSize: '12px'
                                }}>
                                    Активный: {basicInfo.current_tariff_name} ({basicInfo.current_tariff_code})
                                </small>
                            )}
                        </div>
                        <button
                            className="admin-button"
                            style={{
                                fontSize: '14px',
                                padding: '8px 16px',
                                height: '36px',
                                minWidth: '100px',
                                flexShrink: 0
                            }}
                            onClick={handleAssignTariff}
                            disabled={assigningTariff || !selectedTariffId}
                        >
                            {assigningTariff ? 'Назначение...' : 'Назначить'}
                        </button>
                        {basicInfo.current_tariff_id && (
                            <button
                                className="admin-button"
                                style={{
                                    fontSize: '14px',
                                    padding: '8px 16px',
                                    height: '36px',
                                    minWidth: '100px',
                                    flexShrink: 0,
                                    backgroundColor: '#dc3545'
                                }}
                                onClick={handleRemoveTariff}
                                disabled={removeTariffMutation.isPending}
                            >
                                {removeTariffMutation.isPending ? 'Сброс...' : 'Сбросить'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Назначение пакетов */}
                <div className="form-group">
                    <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Пакеты материалов:</label>

                    {/* Выбор пакетов для назначения */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%', minWidth: '200px' }}
                                    placeholder="Выберите пакеты для назначения"
                                    value={selectedBundleIds}
                                    onChange={setSelectedBundleIds}
                                    loading={bundlesLoading}
                                    disabled={bundlesLoading || assignBundleMutation.isPending}
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {bundles?.map(bundle => (
                                        <Select.Option key={bundle.id} value={bundle.id}>
                                            {bundle.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                            <button
                                className="admin-button"
                                style={{
                                    fontSize: '14px',
                                    padding: '8px 16px',
                                    height: '36px',
                                    minWidth: '100px',
                                    flexShrink: 0
                                }}
                                onClick={handleAssignBundles}
                                disabled={assignBundleMutation.isPending || selectedBundleIds.length === 0}
                            >
                                {assignBundleMutation.isPending ? 'Назначение...' : 'Назначить'}
                            </button>
                        </div>
                    </div>

                    {/* Список назначенных пакетов */}
                    {userBundles && userBundles.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <small style={{
                                display: 'block',
                                marginBottom: '8px',
                                color: '#666',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                Назначенные пакеты:
                            </small>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {userBundles.map(ub => {
                                    const bundle = bundles?.find(b => b.id === ub.bundle_id);
                                    return (
                                        <div
                                            key={ub.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '4px 12px',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <span>{bundle?.name || 'Неизвестный пакет'}</span>
                                            <button
                                                onClick={() => handleRemoveBundle(ub.id)}
                                                disabled={removeBundleMutation.isPending}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    padding: '0 4px',
                                                    color: '#dc3545',
                                                    fontSize: '16px',
                                                    lineHeight: 1
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Платные техники (status = 'paid') */}
                {paidTechniques && paidTechniques.length > 0 && (
                    <div className="form-group">
                        <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            Платные техники (отдельные):
                        </label>
                        <div
                            style={{
                                padding: '12px',
                                backgroundColor: '#fff7e6',
                                borderRadius: '8px',
                                border: '1px solid #ffd591'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {paidTechniques.map((tech) => (
                                    <div
                                        key={tech.technique_id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            backgroundColor: tech.is_paid ? '#f6ffed' : '#fff',
                                            borderRadius: '6px',
                                            border: `1px solid ${tech.is_paid ? '#b7eb8f' : '#d9d9d9'}`
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '16px' }}>
                                                {tech.is_paid ? '✅' : '💰'}
                                            </span>
                                            <span style={{ fontWeight: '500' }}>
                                                {tech.technique_name}
                                            </span>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={tech.is_paid}
                                                onChange={async (e) => {
                                                    try {
                                                        if (e.target.checked) {
                                                            await markPaidTechniqueMutation.mutateAsync({
                                                                user_id: studentId,
                                                                technique_id: tech.technique_id,
                                                                paid_by: currentUser?.id,
                                                            });
                                                        } else {
                                                            await unmarkPaidTechniqueMutation.mutateAsync({
                                                                user_id: studentId,
                                                                technique_id: tech.technique_id,
                                                            });
                                                        }
                                                    } catch (err: any) {
                                                        alert(err?.message || 'Ошибка');
                                                    }
                                                }}
                                                disabled={markPaidTechniqueMutation.isPending || unmarkPaidTechniqueMutation.isPending}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                fontSize: '12px',
                                                color: tech.is_paid ? '#52c41a' : '#faad14',
                                            }}>
                                                {tech.is_paid ? 'Оплачено' : 'Не оплачено'}
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Специальные пакеты */}
                {specialBundleGroups.length > 0 && (
                    <div className="form-group">
                        <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            Специальные пакеты (с оплатой за каждую технику):
                        </label>
                        {specialBundleGroups.map(group => (
                            <div
                                key={group.bundleId}
                                style={{
                                    marginBottom: '16px',
                                    padding: '12px',
                                    backgroundColor: '#f9f0ff',
                                    borderRadius: '8px',
                                    border: '1px solid #d3adf7'
                                }}
                            >
                                <div style={{
                                    fontWeight: '600',
                                    marginBottom: '12px',
                                    color: '#722ed1',
                                    fontSize: '14px'
                                }}>
                                    🎁 {group.bundleName}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {group.techniques.map((tech, index) => {
                                        const statusIcon = tech.is_available ? '✅' : tech.is_time_unlocked ? '🔓' : '🔒';
                                        const unlockDate = new Date(tech.unlock_date).toLocaleDateString('ru-RU');
                                        const daysUntil = Math.ceil(
                                            (new Date(tech.unlock_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                        );

                                        return (
                                            <div
                                                key={tech.technique_id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    backgroundColor: tech.is_available ? '#f6ffed' : '#fff',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${tech.is_available ? '#b7eb8f' : '#d9d9d9'}`
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '16px' }}>{statusIcon}</span>
                                                    <span style={{ fontWeight: '500' }}>
                                                        #{tech.technique_position} {tech.technique_name}
                                                    </span>
                                                    {index > 0 && (
                                                        <span style={{ fontSize: '11px', color: '#999' }}>
                                                            (через {tech.delay_days} дн. после предыдущей)
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {/* Информация о дате */}
                                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                                        {tech.is_time_unlocked
                                                            ? `Открыта ${unlockDate}`
                                                            : daysUntil > 0
                                                                ? `Через ${daysUntil} дн. (${unlockDate})`
                                                                : `С ${unlockDate}`}
                                                    </span>

                                                    {/* Чекбокс оплаты */}
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={tech.is_paid}
                                                            onChange={async (e) => {
                                                                try {
                                                                    if (e.target.checked) {
                                                                        await markPaidMutation.mutateAsync({
                                                                            user_id: studentId,
                                                                            special_bundle_id: tech.special_bundle_id,
                                                                            technique_position: tech.technique_position,
                                                                            paid_by: currentUser?.id,
                                                                        });
                                                                    } else {
                                                                        await unmarkPaidMutation.mutateAsync({
                                                                            user_id: studentId,
                                                                            special_bundle_id: tech.special_bundle_id,
                                                                            technique_position: tech.technique_position,
                                                                        });
                                                                    }
                                                                } catch (err: any) {
                                                                    alert(err?.message || 'Ошибка');
                                                                }
                                                            }}
                                                            disabled={markPaidMutation.isPending || unmarkPaidMutation.isPending}
                                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                        />
                                                        <span style={{
                                                            fontSize: '12px',
                                                            color: tech.is_paid ? '#52c41a' : '#faad14',
                                                        }}>
                                                            {tech.is_paid ? 'Оплачено' : 'Не оплачено'}
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Выбор роли пользователя */}
                {currentUser?.role === 'admin' && (
                    <div className="form-group">
                        <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Роль пользователя:</label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <select
                                    className="admin-input"
                                    style={{
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        height: '36px',
                                        minWidth: '200px'
                                    }}
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    disabled={roleLoading || basicInfo.role === 'admin'}
                                >
                                    <option value="guest">Гость (guest)</option>
                                    <option value="user">Ученик (user)</option>
                                    <option value="curator">Куратор (curator)</option>
                                    <option value="admin">Администратор (admin)</option>
                                </select>
                                <small style={{
                                    display: 'block',
                                    marginTop: '4px',
                                    color: '#666',
                                    fontSize: '12px'
                                }}>
                                    Текущая роль: <strong>{basicInfo.role}</strong>
                                    {basicInfo.role === 'admin' && ' (нельзя изменить)'}
                                </small>
                            </div>
                            <button
                                className="admin-button"
                                style={{
                                    fontSize: '14px',
                                    padding: '8px 16px',
                                    height: '36px',
                                    minWidth: '100px',
                                    flexShrink: 0
                                }}
                                onClick={handleChangeRole}
                                disabled={roleLoading || basicInfo.role === 'admin' || selectedRole === basicInfo.role}
                            >
                                {roleLoading ? 'Изменение...' : 'Изменить'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="admin-card">
                <h3>Статистика</h3>
                <p>Уроки: {progressStats.completedLessons} из {progressStats.totalLessonsInCourse} ({progressStats.completedLessonsPercent}%)</p>
                <progress value={progressStats.completedLessons} max={progressStats.totalLessonsInCourse || 1} />
            </div>


            {/* {
                Object.entries(lessonsByStage).map(([stageName, lessons]) => (
                    <div key={stageName} className="admin-card">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="mb-0">{stageName}</h4>
                            <div className="flex gap-2">
                                <button
                                    className="admin-button admin-button-sm"
                                    onClick={() => handleStageComplete(stageName, lessons)}
                                    disabled={bulkLoading || loading}
                                >
                                    Завершить все
                                </button>
                                <button
                                    className="admin-button admin-button-sm"
                                    onClick={() => handleStageReset(stageName, lessons)}
                                    disabled={bulkLoading || loading}
                                >
                                    Сбросить все
                                </button>
                            </div>
                        </div>
                        <div className="admin-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Урок</th>
                                        <th>Открыт</th>
                                        <th>Срок сдачи</th>
                                        <th>Завершен</th>
                                        <th>Дата сдачи</th>
                                        <th>Действие</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessons.map(l => (
                                        <tr key={l.lesson_id}>
                                            <td>{l.lesson_name}</td>
                                            <td>{formatDate(l.open_at)}</td>
                                            <td>{formatDate(l.deadline_at)}</td>
                                            <td>
                                                <span className={`admin-status ${l.is_completed ? 'admin-yes' : 'admin-no'}`}>{l.is_completed ? 'Да' : 'Нет'}</span>
                                            </td>
                                            <td>{formatDateTime(l.completed_at)}</td>
                                            <td>
                                                {!l.is_completed ? (
                                                    <button
                                                        className="action-btn edit-btn"
                                                        disabled={loading || bulkLoading || !!rowLoading[l.lesson_id]}
                                                        onClick={async () => {
                                                            setRowLoading(prev => ({ ...prev, [l.lesson_id]: true }));
                                                            try {
                                                                await markLessonAsCompleted(studentId, l.lesson_id);
                                                                await loadStudentDetails(studentId);
                                                            } catch (error) {
                                                                console.error('Ошибка при завершении урока:', error);
                                                                alert('Ошибка при завершении урока');
                                                            } finally {
                                                                setRowLoading(prev => ({ ...prev, [l.lesson_id]: false }));
                                                            }
                                                        }}
                                                    >Завершить</button>
                                                ) : (
                                                    <button
                                                        className="action-btn delete-btn"
                                                        disabled={loading || bulkLoading || !!rowLoading[l.lesson_id]}
                                                        onClick={async () => {
                                                            setRowLoading(prev => ({ ...prev, [l.lesson_id]: true }));
                                                            try {
                                                                await resetLessonProgress(studentId, l.lesson_id);
                                                                await loadStudentDetails(studentId);
                                                                alert('Прогресс урока сброшен');
                                                            } catch (error) {
                                                                console.error('Ошибка при сбросе прогресса:', error);
                                                                alert('Ошибка при сбросе прогресса урока');
                                                            } finally {
                                                                setRowLoading(prev => ({ ...prev, [l.lesson_id]: false }));
                                                            }
                                                        }}
                                                    >Сбросить</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            } */}

            {/* <div className="admin-card">
                <h3>Библиотечные материалы</h3>
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Материал</th>
                                <th>Тип</th>
                                <th>Дата первого просмотра</th>
                                <th>Просмотрено</th>
                                <th>Дата просмотра</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materialViews.map(m => (
                                <tr key={m.material_id}>
                                    <td>{m.material_name}</td>
                                    <td>{m.material_type}</td>
                                    <td>{formatDateTime(m.first_viewed_at)}</td>
                                    <td>
                                        <span className={`admin-status ${m.is_completed ? 'admin-yes' : 'admin-no'}`}>{m.is_completed ? '✓' : '✗'}</span>
                                    </td>
                                    <td>{formatDateTime(m.last_viewed_at)}</td>
                                    <td>
                                        {m.is_completed ? (
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={async () => {
                                                    await resetMaterialView(studentId, m.material_id);
                                                    await loadStudentDetails(studentId);
                                                }}
                                            >Сбросить</button>
                                        ) : (
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={async () => {
                                                    await markMaterialViewed(studentId, m.material_id);
                                                    await loadStudentDetails(studentId);
                                                }}
                                            >Пометить просмотренным</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div> */}
            {isPromoteModalOpen && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal">
                        <h3>Назначение куратора</h3>
                        <p>Пользователь: <strong>{basicInfo.full_name}</strong></p>

                        <div className="form-group">
                            <label>Логин для входа*</label>
                            <input
                                type="text"
                                name="webLogin"
                                className="admin-input"
                                value={promoteFormData.webLogin}
                                onChange={handlePromoteFormChange}
                                placeholder="Только a-z, A-Z, 0-9, _, -"
                                disabled={isPromoting}
                            />
                        </div>

                        <div className="form-group">
                            <label>Пароль (мин. {CURATOR_PASSWORD_CONFIG.MIN_LENGTH} символов)*</label>
                            <input
                                type="password"
                                name="password"
                                className="admin-input"
                                value={promoteFormData.password}
                                onChange={handlePromoteFormChange}
                                placeholder="Придумайте надежный пароль"
                                disabled={isPromoting}
                            />
                        </div>

                        {formError && <p className="admin-error-message">{formError}</p>}

                        <div className="form-actions">
                            <button
                                className="admin-button"
                                onClick={handlePromoteToCurator}
                                disabled={isPromoting}
                            >
                                {isPromoting ? 'Назначение...' : 'Назначить куратором'}
                            </button>
                            <button
                                className="admin-button secondary"
                                onClick={closePromoteModal}
                                disabled={isPromoting}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно успешного назначения куратора */}
            {isSuccessModalOpen && <SuccessModal />}
        </div >
    );
};

export default StudentCard; 