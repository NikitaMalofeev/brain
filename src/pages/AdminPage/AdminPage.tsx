import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploader, CloudFlareR2Diagnostics } from '@/components';
import type { FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { supabase } from '@/lib/supabase/client';
import { useCoursesAdmin, useStagesAdmin, useLessonsAdmin, useBlocksAdmin } from '@/lib/supabase/hooks';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';
import { useTariffLimits } from '@/lib/supabase/hooks/useTariffLimits';
import { FILE_PREFIXES, buildImageUrl, deleteFileFromR2 } from '@/lib/cloudflareR2Service';
import { PlayerProvider } from '@/contexts/PlayerContext';
import './AdminPage.css';
import { MdRefresh, MdLogout, MdArrowBack } from 'react-icons/md';
import { Database } from '../../lib/supabase/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { logger } from '@/lib/logger';

// Импорты для компонентов проверки ДЗ
import SubmissionsManager from './SubmissionsManager';
import SubmissionDetail from './SubmissionDetail';
import { DiagnosticsPage } from '../DiagnosticsPage/DiagnosticsPage';

// Импорты отдельных компонентов админки
import LessonsManager from './components/LessonsManager';
import DraggableBlockRow from './components/DraggableBlockRow';
import DraggableLessonRow from './components/DraggableLessonRow';
import MaterialsManager from './components/MaterialsManager/MaterialsManager';
import StudentsManager from './components/StudentsManager/StudentsManager';
import CuratorsManager from './components/CuratorsManager/CuratorsManager';
import ChatsManager from './components/ChatsManager/ChatsManager';
import FaqManager from './components/FaqManager/FaqManager';
import BroadcastsManager from './components/BroadcastsManager/BroadcastsManager';
import TariffsManager from './components/TariffsManager/TariffsManager';

type SupabaseUser = Database['public']['Tables']['users']['Row'];

// Типы для навигации
interface NavigationState {
  view: 'courses' | 'stages' | 'lessons' | 'blocks';
  courseId?: string;
  courseName?: string;
  stageId?: number;
  stageName?: string;
  lessonId?: number;
  lessonName?: string;
}

// Новое состояние для навигации по сабмитам
interface SubmissionsNavigationState {
  view: 'list' | 'detail';
  selectedSubmissionId?: number;
}

// Типы для блоков
interface BlockModalData {
  id?: number;
  title: string;
  block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
  content_text: string;
  content_url: string;
  order_num: number;
}

// Компоненты менеджеров (пока заглушки)
interface CoursesManagerProps {
  onCourseSelect: (courseId: string, courseName: string) => void;
}

interface StagesManagerProps {
  courseId: string;
  onBack: () => void;
  onStageSelect: (stageId: number, stageName: string) => void;
}

interface LessonsManagerProps {
  courseId: string;
  stageId: number;
  onBack: () => void;
  onLessonSelect: (lessonId: number, lessonName: string) => void;
}

interface BlocksManagerProps {
  courseId: string;
  stageId: number;
  lessonId: number;
  onBack: () => void;
}

// Компонент для настройки лимитов тарифов для этапа
interface TariffLimitsSectionProps {
  stageId: number;
}

const TariffLimitsSection: React.FC<TariffLimitsSectionProps> = ({ stageId }) => {
  const { tariffLimits, loading, error, saveTariffLimits, savingLimits, saveLimitsError } = useTariffLimits(stageId);

  // Локальное состояние для редактирования лимитов
  const [localLimits, setLocalLimits] = useState<{ [tariffId: string]: { maxDays?: number | null; requiresPrereq: boolean } }>({});

  // Инициализируем локальное состояние при загрузке данных
  useEffect(() => {
    if (tariffLimits.length > 0) {
      const initialLimits: typeof localLimits = {};
      tariffLimits.forEach(tariff => {
        initialLimits[tariff.id] = {
          maxDays: tariff.max_days_access,
          requiresPrereq: tariff.requires_full_prereq,
        };
      });
      setLocalLimits(initialLimits);
    }
  }, [tariffLimits]);

  // Обработчик изменения максимального количества дней
  const handleMaxDaysChange = (tariffId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setLocalLimits(prev => ({
      ...prev,
      [tariffId]: {
        ...prev[tariffId],
        maxDays: isNaN(numValue as any) ? null : numValue,
      }
    }));
  };

  // Обработчик изменения требования сдачи ДЗ
  const handleRequiresPrereqChange = (tariffId: string, checked: boolean) => {
    setLocalLimits(prev => ({
      ...prev,
      [tariffId]: {
        ...prev[tariffId],
        requiresPrereq: checked,
      }
    }));
  };

  // Обработчик сохранения настроек
  const handleSaveLimits = async () => {
    try {
      const limitsArray = Object.entries(localLimits).map(([tariffId, limit]) => ({
        tariffId,
        maxDaysAccess: limit.maxDays,
        requiresFullPrereq: limit.requiresPrereq,
      }));

      await saveTariffLimits(limitsArray);
      alert('Настройки лимитов тарифов сохранены');
    } catch (error) {
      console.error('Ошибка при сохранении лимитов:', error);
      alert('Ошибка при сохранении настроек');
    }
  };

  if (loading) {
    return (
      <div className="admin-card">
        <h3>Доступ по тарифам</h3>
        <div className="admin-loading">Загрузка лимитов тарифов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <h3>Доступ по тарифам</h3>
        <div className="admin-error">Ошибка: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <h3>Доступ по тарифам</h3>
      {saveLimitsError && (
        <div className="admin-error" style={{ marginBottom: '12px' }}>
          Ошибка сохранения: {saveLimitsError.message}
        </div>
      )}
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Тариф</th>
              <th>Макс. дней/уроков</th>
              <th>Требует сдачи ДЗ</th>
            </tr>
          </thead>
          <tbody>
            {tariffLimits.map((tariff) => (
              <tr key={tariff.id}>
                <td>{tariff.name} ({tariff.code})</td>
                <td>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="0 - полный доступ"
                    value={localLimits[tariff.id]?.maxDays || ''}
                    onChange={(e) => handleMaxDaysChange(tariff.id, e.target.value)}
                    disabled={savingLimits}
                    min="0"
                  />
                  <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>
                    0 или пусто = полный доступ
                  </small>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={localLimits[tariff.id]?.requiresPrereq || false}
                    onChange={(e) => handleRequiresPrereqChange(tariff.id, e.target.checked)}
                    disabled={savingLimits}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-actions">
        <button
          className="admin-button"
          onClick={handleSaveLimits}
          disabled={savingLimits}
        >
          {savingLimits ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
};

// Компонент для управления курсами
const CoursesManager: React.FC<CoursesManagerProps> = ({ onCourseSelect }) => {
  const { courses, loading, error, refetch, createCourse, updateCourse, deleteCourse } = useCoursesAdmin();
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Новый курс
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Редактируемый курс
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');

  // Добавление курса
  const handleAddCourse = async () => {
    if (!newTitle.trim()) {
      alert('Введите название курса');
      return;
    }

    try {
      setAddLoading(true);
      setUpdateError(null);

      await createCourse({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || undefined,
      });

      // Очищаем форму
      setNewTitle('');
      setNewSubtitle('');

    } catch (error: any) {
      console.error('Ошибка при добавлении курса:', error);
      setUpdateError(error.message || 'Произошла ошибка при добавлении курса');
    } finally {
      setAddLoading(false);
    }
  };

  // Удаление курса
  const handleDeleteCourse = async (id: string, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить курс "${title}"?`)) {
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await deleteCourse(id);

    } catch (error: any) {
      console.error('Ошибка при удалении курса:', error);
      setUpdateError(error.message || 'Произошла ошибка при удалении курса');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Начать редактирование курса
  const startEditing = (course: any) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditSubtitle(course.subtitle || '');
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingCourse(null);
    setEditTitle('');
    setEditSubtitle('');
  };

  // Сохранение отредактированного курса
  const saveCourse = async () => {
    if (!editingCourse) return;
    if (!editTitle.trim()) {
      alert('Название курса обязательно');
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await updateCourse(editingCourse.id, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || undefined,
      });

      cancelEditing();

    } catch (error: any) {
      console.error('Ошибка при сохранении курса:', error);
      setUpdateError(error.message || 'Произошла ошибка при сохранении курса');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Управление курсами</h2>
        <button
          className="admin-refresh-btn"
          onClick={refetch}
          disabled={loading}
        >
          Обновить
        </button>
      </div>

      {/* Форма добавления курса */}
      <div className="course-add-form">
        <h3>Добавить курс</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            className="admin-input"
            placeholder="Название курса"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{ flex: 2 }}
          />
          <input
            className="admin-input"
            placeholder="Подзаголовок (опционально)"
            value={newSubtitle}
            onChange={e => setNewSubtitle(e.target.value)}
            style={{ flex: 3 }}
          />
          <button
            className="admin-button"
            onClick={handleAddCourse}
            disabled={addLoading || !newTitle.trim()}
          >
            {addLoading ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </div>

      {updateError && (
        <div className="admin-error admin-update-error">
          {updateError}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Загрузка курсов...</div>
      ) : error ? (
        <div className="admin-error">Ошибка: {error.message}</div>
      ) : courses.length === 0 ? (
        <div className="empty-table">Курсы не найдены</div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Подзаголовок</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    {editingCourse?.id === course.id ? (
                      <input
                        className="admin-input"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      course.title
                    )}
                  </td>
                  <td>
                    {editingCourse?.id === course.id ? (
                      <input
                        className="admin-input"
                        value={editSubtitle}
                        onChange={e => setEditSubtitle(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      course.subtitle || '-'
                    )}
                  </td>
                  <td>{new Date(course.created_at || '').toLocaleDateString()}</td>
                  <td className="actions-cell">
                    {editingCourse?.id === course.id ? (
                      <>
                        <button
                          className="action-btn edit-btn"
                          onClick={saveCourse}
                          disabled={updateLoading}
                        >
                          Сохранить
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={cancelEditing}
                          disabled={updateLoading}
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => onCourseSelect(course.id, course.title)}
                          title="Управление ступенями"
                        >
                          Ступени
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => startEditing(course)}
                          title="Редактировать курс"
                        >
                          Изменить
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          disabled={updateLoading}
                          title="Удалить курс"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StagesManager: React.FC<StagesManagerProps> = ({ courseId, onBack, onStageSelect }) => {
  const { stages, loading, error, refetch, createStage, updateStage, deleteStage } = useStagesAdmin(courseId);
  const { tariffs } = useTariffsAdmin();
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Новая ступень
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOrderNum, setNewOrderNum] = useState(1);
  const [newIsUnlocked, setNewIsUnlocked] = useState(false);
  const [newCoverImagePath, setNewCoverImagePath] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Редактируемая ступень
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrderNum, setEditOrderNum] = useState(1);
  const [editIsUnlocked, setEditIsUnlocked] = useState(false);
  const [editCoverImagePath, setEditCoverImagePath] = useState('');

  // Состояние для загрузки файлов
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Модальное окно для редактирования обложки
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [editingCoverStage, setEditingCoverStage] = useState<any | null>(null);

  // Ref для FileUploader
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // Автоматически обновляем newOrderNum при изменении списка ступеней
  useEffect(() => {
    if (stages.length > 0) {
      const maxOrderNum = Math.max(...stages.map(stage => stage.order_num));
      setNewOrderNum(maxOrderNum + 1);
    } else {
      setNewOrderNum(1);
    }
  }, [stages]);

  // Обработчики для загрузки файлов
  const handleFileUploadComplete = (filePath: string, fileUrl: string) => {
    if (editingStage) {
      setEditCoverImagePath(filePath);
    } else if (editingCoverStage) {
      setEditingCoverStage((prev: any) => ({ ...prev, cover_image_path: filePath }));
    } else {
      setNewCoverImagePath(filePath);
    }
    setUploadError(null);
  };

  const handleFileUploadError = (error: string) => {
    setUploadError(error);
  };

  const handleFileSelected = (file: File | null) => {
    // Пока что ничего не делаем - файл будет загружен при сохранении
    console.log('Файл выбран для ступени:', file?.name);
  };

  // Открыть модал для редактирования обложки
  const openCoverModal = (stage: any) => {
    setEditingCoverStage({ ...stage });
    setUploadError(null);
    setIsCoverModalOpen(true);
  };

  // Закрыть модал обложки
  const closeCoverModal = () => {
    setIsCoverModalOpen(false);
    setEditingCoverStage(null);
    setUploadError(null);
  };

  // Сохранить обложку ступени
  const saveStageCover = async () => {
    if (!editingCoverStage) return;

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      let coverImagePath = editingCoverStage.cover_image_path;

      // Если выбран новый файл, загружаем его в R2
      if (fileUploaderRef.current?.hasSelectedFile()) {
        const uploadResult = await fileUploaderRef.current.uploadFile();
        if (uploadResult) {
          coverImagePath = uploadResult.filePath;
        }
      }

      await updateStage(editingCoverStage.id, {
        cover_image_path: coverImagePath || '',
      });

      closeCoverModal();

    } catch (error: any) {
      console.error('Ошибка при сохранении обложки ступени:', error);
      setUpdateError(error.message || 'Произошла ошибка при сохранении обложки');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Удалить обложку ступени
  const deleteStageCover = async () => {
    if (!editingCoverStage || !editingCoverStage.cover_image_path) return;

    const confirmDelete = confirm('Вы уверены, что хотите удалить обложку ступени? Файл будет удален из CloudFlare R2.');
    if (!confirmDelete) return;

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      // Удаляем файл из CloudFlare R2
      await deleteFileFromR2(editingCoverStage.cover_image_path);

      // Обновляем запись в БД - используем null вместо undefined
      await updateStage(editingCoverStage.id, {
        cover_image_path: null as any
      });

      // Принудительно обновляем данные
      await refetch();

      closeCoverModal();

    } catch (error: any) {
      console.error('❌ Ошибка при удалении обложки ступени:', error);
      setUpdateError(error.message || 'Произошла ошибка при удалении обложки');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Добавление ступени
  const handleAddStage = async () => {
    if (!newName.trim()) {
      alert('Введите название ступени');
      return;
    }

    try {
      setAddLoading(true);
      setUpdateError(null);

      await createStage({
        course_id: courseId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        order_num: newOrderNum,
        is_unlocked: newIsUnlocked,
        cover_image_path: newCoverImagePath || undefined,
      });

      // Очищаем форму
      setNewName('');
      setNewDescription('');
      setNewIsUnlocked(false);
      setNewCoverImagePath('');

    } catch (error: any) {
      console.error('Ошибка при добавлении ступени:', error);
      setUpdateError(error.message || 'Произошла ошибка при добавлении ступени');
    } finally {
      setAddLoading(false);
    }
  };

  // Удаление ступени
  const handleDeleteStage = async (id: number, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить ступень "${name}"?`)) {
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await deleteStage(id);

    } catch (error: any) {
      console.error('Ошибка при удалении ступени:', error);
      setUpdateError(error.message || 'Произошла ошибка при удалении ступени');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Начать редактирование ступени
  const startEditing = (stage: any) => {
    setEditingStage(stage);
    setEditName(stage.name);
    setEditDescription(stage.description || '');
    setEditOrderNum(stage.order_num);
    setEditIsUnlocked(stage.is_unlocked || false);
    setEditCoverImagePath(stage.cover_image_path || '');
    setUploadError(null);
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingStage(null);
    setEditName('');
    setEditDescription('');
    setEditOrderNum(1);
    setEditIsUnlocked(false);
    setEditCoverImagePath('');
    setUploadError(null);
  };

  // Сохранение отредактированной ступени
  const saveStage = async () => {
    if (!editingStage) return;
    if (!editName.trim()) {
      alert('Название ступени обязательно');
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await updateStage(editingStage.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        order_num: editOrderNum,
        is_unlocked: editIsUnlocked,
        cover_image_path: editCoverImagePath || undefined,
      });

      // Очищаем форму редактирования
      cancelEditing();

    } catch (error: any) {
      console.error('Ошибка при сохранении ступени:', error);
      setUpdateError(error.message || 'Произошла ошибка при сохранении ступени');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Управление ступенями</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="admin-refresh-btn"
            onClick={refetch}
            disabled={loading}
          >
            Обновить
          </button>
          <button
            className="admin-add-btn"
            onClick={onBack}
          >
            ← Назад к курсам
          </button>
        </div>
      </div>

      {/* Форма добавления ступени */}
      <div className="stage-add-form">
        <h3>Добавить ступень</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            className="admin-input"
            placeholder="Название ступени"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: '2 1 200px' }}
          />
          <input
            className="admin-input"
            placeholder="Описание (опционально)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            style={{ flex: '3 1 300px' }}
          />
          <input
            className="admin-input"
            type="number"
            placeholder="Порядок"
            value={newOrderNum}
            onChange={e => setNewOrderNum(parseInt(e.target.value) || 1)}
            style={{ flex: '0 0 80px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 0 120px' }}>
            <input
              type="checkbox"
              checked={newIsUnlocked}
              onChange={e => setNewIsUnlocked(e.target.checked)}
            />
            Разблокирована
          </label>
          <button
            className="admin-button"
            onClick={handleAddStage}
            disabled={addLoading || !newName.trim()}
            style={{ flex: '0 0 120px' }}
          >
            {addLoading ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </div>

      {updateError && (
        <div className="admin-error admin-update-error">
          {updateError}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Загрузка ступеней...</div>
      ) : error ? (
        <div className="admin-error">Ошибка: {error.message}</div>
      ) : stages.length === 0 ? (
        <div className="empty-table">Ступени не найдены</div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Обложка</th>
                <th>Название</th>
                <th>Описание</th>
                <th>Порядок</th>
                <th>Разблокирована</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {stage.cover_image_path ? (
                        <img
                          src={buildImageUrl(stage.cover_image_path)}
                          alt="Обложка ступени"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            console.warn('Ошибка загрузки обложки ступени:', stage.cover_image_path);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#999'
                        }}>
                          📷
                        </div>
                      )}
                      <button
                        className="action-btn edit-btn"
                        onClick={() => openCoverModal(stage)}
                        title="Редактировать обложку"
                        style={{ fontSize: '12px' }}
                      >
                        {stage.cover_image_path ? 'Изменить' : 'Добавить'}
                      </button>
                    </div>
                  </td>
                  <td>
                    {editingStage?.id === stage.id ? (
                      <input
                        className="admin-input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      stage.name
                    )}
                  </td>
                  <td>
                    {editingStage?.id === stage.id ? (
                      <input
                        className="admin-input"
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      stage.description || '-'
                    )}
                  </td>
                  <td>
                    {editingStage?.id === stage.id ? (
                      <input
                        className="admin-input"
                        type="number"
                        value={editOrderNum}
                        onChange={e => setEditOrderNum(parseInt(e.target.value) || 1)}
                        style={{ width: '80px' }}
                      />
                    ) : (
                      stage.order_num
                    )}
                  </td>
                  <td>
                    {editingStage?.id === stage.id ? (
                      <input
                        type="checkbox"
                        checked={editIsUnlocked}
                        onChange={e => setEditIsUnlocked(e.target.checked)}
                      />
                    ) : (
                      <span className={`admin-status ${stage.is_unlocked ? 'admin-yes' : 'admin-no'}`}>
                        {stage.is_unlocked ? 'Да' : 'Нет'}
                      </span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingStage?.id === stage.id ? (
                      <>
                        <button
                          className="action-btn edit-btn"
                          onClick={saveStage}
                          disabled={updateLoading}
                        >
                          Сохранить
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={cancelEditing}
                          disabled={updateLoading}
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => onStageSelect(stage.id, stage.name)}
                          title="Управление уроками"
                        >
                          Уроки
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => startEditing(stage)}
                          title="Редактировать ступень"
                        >
                          Изменить
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteStage(stage.id, stage.name)}
                          disabled={updateLoading}
                          title="Удалить ступень"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно для редактирования обложки ступени */}
      {isCoverModalOpen && editingCoverStage && (
        <div className="admin-modal-backdrop" onClick={closeCoverModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={closeCoverModal}>×</button>

            <h3>Обложка ступени: {editingCoverStage.name}</h3>

            <div className="form-group">
              <label>Текущая обложка:</label>
              {editingCoverStage.cover_image_path ? (
                <div style={{ marginBottom: '16px' }}>
                  <img
                    src={buildImageUrl(editingCoverStage.cover_image_path)}
                    alt="Текущая обложка ступени"
                    style={{
                      width: '200px',
                      height: '120px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #e0e0e0'
                    }}
                    onError={(e) => {
                      console.warn('Ошибка загрузки обложки ступени:', editingCoverStage.cover_image_path);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    {editingCoverStage.cover_image_path}
                  </div>
                </div>
              ) : (
                <div style={{
                  width: '200px',
                  height: '120px',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: '#999',
                  border: '2px dashed #ddd'
                }}>
                  Обложка не установлена
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Загрузить новую обложку:</label>
              {uploadError && (
                <div className="admin-error" style={{ marginBottom: '12px' }}>
                  {uploadError}
                </div>
              )}
              <FileUploader
                ref={fileUploaderRef}
                onFileSelected={handleFileSelected}
                onUploadError={handleFileUploadError}
                acceptedTypes={
                  editingCoverStage.cover_image_path ? 'image/*' : 'image/*'
                }
                filePrefix="images/"
                currentFileUrl={editingCoverStage?.cover_image_path ? buildImageUrl(editingCoverStage.cover_image_path) : undefined}
                disabled={updateLoading}
                showDeleteButton={true}
              />
              <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                💡 Поддерживаются форматы: JPG, PNG, WEBP. Рекомендуемый размер: 380x190px<br />
                📐 Соотношение 2:1 оптимально для карточек в приложении
              </small>
            </div>

            <div className="form-actions">
              <button
                className="admin-button"
                onClick={saveStageCover}
                disabled={updateLoading}
              >
                {updateLoading ? 'Сохранение...' : 'Сохранить обложку'}
              </button>
              {editingCoverStage?.cover_image_path && (
                <button
                  className="admin-button"
                  onClick={deleteStageCover}
                  disabled={updateLoading}
                  style={{ background: 'var(--admin-warning)' }}
                >
                  Удалить обложку
                </button>
              )}
              <button
                className="admin-button"
                onClick={closeCoverModal}
                disabled={updateLoading}
                style={{ background: 'var(--admin-danger)' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Секция настройки лимитов для этапов курса */}
      {editingStage && <TariffLimitsSection stageId={editingStage.id} />}
    </div>
  );
};

// Компонент для управления блоками урока
const BlocksManager: React.FC<BlocksManagerProps> = ({ courseId, stageId, lessonId, onBack }) => {
  const { blocks, loading, error, refetch, createBlock, updateBlock, deleteBlock } = useBlocksAdmin(lessonId);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Модальное окно
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<BlockModalData>({
    title: '',
    block_type: 'text',
    content_text: '',
    content_url: '',
    order_num: 1,
  });
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  // Редактирование блока
  const [editingBlock, setEditingBlock] = useState<any | null>(null);

  // Состояние для загрузки файлов
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Состояние для локального редактирования порядка
  const [localOrderValues, setLocalOrderValues] = useState<{ [key: number]: number }>({});
  const [orderUpdateTimeouts, setOrderUpdateTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});

  // Обработчики для загрузки файлов
  const handleFileUploadComplete = (filePath: string, fileUrl: string) => {
    setModalData(prev => ({ ...prev, content_url: fileUrl }));
    setUploadError(null);
  };

  const handleFileUploadError = (error: string) => {
    setUploadError(error);
  };

  // Открыть модал для добавления
  const openAddModal = () => {
    const nextOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order_num)) + 1 : 1;
    setModalData({
      title: '',
      block_type: 'text',
      content_text: '',
      content_url: '',
      order_num: nextOrder,
    });
    setModalMode('add');
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Открыть модал для редактирования
  const openEditModal = (block: any) => {
    setModalData({
      id: block.id,
      title: block.title || '',
      block_type: block.block_type,
      content_text: block.content_text || '',
      content_url: block.content_url || '',
      order_num: block.order_num,
    });
    setModalMode('edit');
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Закрыть модал
  const closeModal = () => {
    setIsModalOpen(false);
    setUploadError(null);
    setModalData({
      title: '',
      block_type: 'text',
      content_text: '',
      content_url: '',
      order_num: 1,
    });
  };

  // Сохранить блок
  const saveBlock = async () => {
    try {
      setUpdateLoading(true);
      setUpdateError(null);

      // Валидация: блок должен иметь хотя бы текст или URL (для не-text типов)
      const hasText = modalData.content_text && modalData.content_text.trim();
      const hasUrl = modalData.content_url && modalData.content_url.trim();

      if (modalData.block_type === 'text') {
        if (!hasText) {
          alert('Для текстового блока необходимо заполнить содержимое');
          return;
        }
      } else {
        if (!hasText && !hasUrl) {
          alert(`Для блока типа "${getBlockTypeName(modalData.block_type)}" необходимо заполнить URL или описание`);
          return;
        }
      }

      if (modalMode === 'add') {
        // Просто создаем новый блок без проверки конфликтов
        await createBlock({
          lesson_id: lessonId,
          title: modalData.title || undefined,
          block_type: modalData.block_type,
          content_text: modalData.content_text || undefined,
          content_url: modalData.content_url || undefined,
          order_num: modalData.order_num,
        });
      } else {
        // Просто обновляем блок без проверки конфликтов
        await updateBlock(modalData.id!, {
          title: modalData.title || undefined,
          block_type: modalData.block_type,
          content_text: modalData.content_text || undefined,
          content_url: modalData.content_url || undefined,
          order_num: modalData.order_num,
        });
      }

      closeModal();
    } catch (error: any) {
      console.error('Ошибка при сохранении блока:', error);
      setUpdateError(error.message || 'Произошла ошибка при сохранении блока');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Удаление блока
  const handleDeleteBlock = async (id: number, title?: string) => {
    const blockName = title || 'Безымянный блок';
    if (!confirm(`Вы уверены, что хотите удалить блок "${blockName}"?`)) {
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await deleteBlock(id);
    } catch (error: any) {
      console.error('Ошибка при удалении блока:', error);
      setUpdateError(error.message || 'Произошла ошибка при удалении блока');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Инлайн-редактирование порядка с debounce
  const handleOrderInputChange = (blockId: number, newOrder: number) => {
    // Обновляем локальное значение немедленно
    setLocalOrderValues(prev => ({ ...prev, [blockId]: newOrder }));

    // Очищаем предыдущий таймер если есть
    if (orderUpdateTimeouts[blockId]) {
      clearTimeout(orderUpdateTimeouts[blockId]);
    }

    // Устанавливаем новый таймер для отложенного обновления
    const timeoutId = setTimeout(() => {
      handleOrderChange(blockId, newOrder);
    }, 1000); // 1 секунда задержки

    setOrderUpdateTimeouts(prev => ({ ...prev, [blockId]: timeoutId }));
  };

  const handleOrderChange = async (blockId: number, newOrder: number) => {
    try {
      // Просто обновляем порядок без проверки конфликтов
      await updateBlock(blockId, { order_num: newOrder });

      // Очищаем локальное значение после успешного обновления
      setLocalOrderValues(prev => {
        const newValues = { ...prev };
        delete newValues[blockId];
        return newValues;
      });
    } catch (error: any) {
      console.error('Ошибка при изменении порядка:', error);
      setUpdateError(error.message || 'Произошла ошибка при изменении порядка');

      // Возвращаем локальное значение к исходному
      setLocalOrderValues(prev => {
        const newValues = { ...prev };
        delete newValues[blockId];
        return newValues;
      });
    }
  };

  // Обработка drag & drop перестановки блоков
  const handleBlockReorder = async (draggedBlockId: number, targetBlockId: number) => {
    try {
      setUpdateLoading(true);
      setUpdateError(null);

      // Находим блоки в текущем массиве
      const draggedBlock = blocks.find(b => b.id === draggedBlockId);
      const targetBlock = blocks.find(b => b.id === targetBlockId);

      if (!draggedBlock || !targetBlock) {
        throw new Error('Блоки не найдены');
      }

      // Создаем копию массива блоков для расчета новых позиций
      const sortedBlocks = [...blocks].sort((a, b) => a.order_num - b.order_num);
      const draggedIndex = sortedBlocks.findIndex(b => b.id === draggedBlockId);
      const targetIndex = sortedBlocks.findIndex(b => b.id === targetBlockId);

      if (draggedIndex === -1 || targetIndex === -1) {
        throw new Error('Индексы блоков не найдены');
      }

      // Перемещаем элемент в новую позицию
      const reorderedBlocks = [...sortedBlocks];
      const [movedBlock] = reorderedBlocks.splice(draggedIndex, 1);
      reorderedBlocks.splice(targetIndex, 0, movedBlock);

      // Обновляем order_num для всех затронутых блоков
      const updates = [];
      for (let i = 0; i < reorderedBlocks.length; i++) {
        const newOrderNum = i + 1;
        if (reorderedBlocks[i].order_num !== newOrderNum) {
          updates.push(updateBlock(reorderedBlocks[i].id, { order_num: newOrderNum }));
        }
      }

      // Выполняем все обновления
      await Promise.all(updates);

      // Перезагружаем данные для отображения обновленного порядка
      await refetch();

    } catch (error: any) {
      console.error('Ошибка при перестановке блоков:', error);
      setUpdateError(error.message || 'Произошла ошибка при перестановке блоков');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Получение названия типа блока для отображения
  const getBlockTypeName = (type: string) => {
    const types: Record<string, string> = {
      text: 'Текст',
      video: 'Видео',
      audio: 'Аудио',
      image: 'Изображение',
      pdf: 'PDF',
    };
    return types[type] || type;
  };

  // Рендер контента блока
  const renderBlockContent = (block: any) => {
    const hasText = block.content_text && block.content_text.trim();
    const hasUrl = block.content_url && block.content_url.trim();

    switch (block.block_type) {
      case 'text':
        return (
          <div className="block-content-preview">
            {hasText ?
              (block.content_text.substring(0, 100) + (block.content_text.length > 100 ? '...' : ''))
              : <span className="empty-value">Нет текста</span>
            }
          </div>
        );
      case 'video':
        return (
          <div className="block-content-preview">
            {hasUrl && <div>🎥 {block.content_url.substring(0, 40)}...</div>}
            {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
            {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
          </div>
        );
      case 'audio':
        return (
          <div className="block-content-preview">
            {hasUrl && <div>🔊 {block.content_url.substring(0, 40)}...</div>}
            {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
            {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
          </div>
        );
      case 'image':
        return (
          <div className="block-content-preview">
            {hasUrl && <div>🖼️ {block.content_url.substring(0, 40)}...</div>}
            {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
            {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
          </div>
        );
      case 'pdf':
        return (
          <div className="block-content-preview">
            {hasUrl && <div>📄 {block.content_url.substring(0, 40)}...</div>}
            {hasText && <div>📝 {block.content_text.substring(0, 60)}...</div>}
            {!hasUrl && !hasText && <span className="empty-value">Нет контента</span>}
          </div>
        );
      default:
        return <span className="empty-value">Неизвестный тип</span>;
    }
  };

  const handleFileSelected = (file: File | null) => {
    // Пока что ничего не делаем - файл будет загружен при сохранении
    console.log('Файл выбран для ступени:', file?.name);
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Блоки урока</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="admin-refresh-btn"
            onClick={refetch}
            disabled={loading}
          >
            Обновить
          </button>
          <button
            className="admin-add-btn"
            onClick={openAddModal}
            disabled={loading}
          >
            + Добавить блок
          </button>
          <button
            className="admin-button"
            onClick={onBack}
            style={{ background: 'var(--admin-secondary)' }}
          >
            ← Назад к урокам
          </button>
        </div>
      </div>

      {updateError && (
        <div className="admin-error admin-update-error">
          {updateError}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Загрузка блоков...</div>
      ) : error ? (
        <div className="admin-error">Ошибка: {error.message}</div>
      ) : blocks.length === 0 ? (
        <div className="empty-table">
          Блоки не найдены. Добавьте первый блок урока.
        </div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Порядок</th>
                <th>Заголовок</th>
                <th>Тип</th>
                <th>Контент/URL</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <DraggableBlockRow
                  key={block.id}
                  block={block}
                  localOrderValues={localOrderValues}
                  onOrderInputChange={handleOrderInputChange}
                  getBlockTypeName={getBlockTypeName}
                  renderBlockContent={renderBlockContent}
                  onEdit={openEditModal}
                  onDelete={handleDeleteBlock}
                  onReorder={handleBlockReorder}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно редактирования блока */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={closeModal}>×</button>

            <h3>{modalMode === 'add' ? 'Добавить блок' : 'Редактировать блок'}</h3>

            <div className="form-group">
              <label>Заголовок блока (опционально):</label>
              <input
                className="admin-input"
                value={modalData.title}
                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                placeholder="Заголовок блока..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Тип блока:</label>
                <select
                  className="admin-input"
                  value={modalData.block_type}
                  onChange={(e) => setModalData({ ...modalData, block_type: e.target.value as any })}
                >
                  <option value="text">📝 Текст</option>
                  <option value="video">🎥 Видео</option>
                  <option value="audio">🔊 Аудио</option>
                  <option value="image">🖼️ Изображение</option>
                  <option value="pdf">📄 PDF</option>
                </select>
              </div>
              <div className="form-group">
                <label>Порядковый номер:</label>
                <input
                  className="admin-input"
                  type="number"
                  value={modalData.order_num}
                  onChange={(e) => setModalData({ ...modalData, order_num: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>

            {/* Контент в зависимости от типа блока */}
            {modalData.block_type === 'text' ? (
              // Для текстового блока - только текст
              <div className="form-group">
                <label>Текстовое содержимое:</label>
                <textarea
                  className="admin-input"
                  value={modalData.content_text}
                  onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                  rows={6}
                  placeholder="Введите текстовое содержимое блока..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            ) : modalData.block_type === 'video' ? (
              // Для видео - только URL (Kinescope)
              <>
                <div className="form-group">
                  <label>URL видео (Kinescope и др.):</label>
                  <input
                    className="admin-input"
                    value={modalData.content_url}
                    onChange={(e) => setModalData({ ...modalData, content_url: e.target.value })}
                    placeholder="https://..."
                  />
                  <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                    💡 Вставьте ссылку на видео Kinescope
                  </small>
                </div>

                <div className="form-group">
                  <label>Описание видео (опционально):</label>
                  <textarea
                    className="admin-input"
                    value={modalData.content_text}
                    onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                    rows={3}
                    placeholder="Введите описание к видео..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </>
            ) : (
              // Для файлов (audio, image, pdf) - FileUploader + текст
              <>
                <div className="form-group">
                  <label>
                    Загрузка файла ({getBlockTypeName(modalData.block_type).toLowerCase()}):
                  </label>
                  {uploadError && (
                    <div className="admin-error" style={{ marginBottom: '12px' }}>
                      {uploadError}
                    </div>
                  )}
                  <FileUploader
                    onFileSelected={handleFileSelected}
                    onUploadComplete={handleFileUploadComplete}
                    onUploadError={handleFileUploadError}
                    acceptedTypes={
                      modalData.block_type === 'audio' ? 'audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/m4a,audio/ogg,audio/aac,audio/flac' :
                        modalData.block_type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml' :
                          modalData.block_type === 'pdf' ? 'application/pdf' : '*/*'
                    }
                    filePrefix={
                      modalData.block_type === 'audio' ? 'audio/' :
                        modalData.block_type === 'image' ? 'images/' :
                          modalData.block_type === 'pdf' ? 'documents/' : 'documents/'
                    }
                    currentFileUrl={modalData.content_url}
                    disabled={updateLoading}
                  />
                  <small style={{ color: 'var(--admin-text-secondary)', marginTop: '8px', display: 'block' }}>
                    💡 Или вставьте готовый URL файла:
                  </small>
                  <input
                    className="admin-input"
                    style={{ marginTop: '8px' }}
                    value={modalData.content_url}
                    onChange={(e) => setModalData({ ...modalData, content_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label>
                    {modalData.block_type === 'image' ? 'Подпись к изображению' : 'Описание'} (опционально):
                  </label>
                  <textarea
                    className="admin-input"
                    value={modalData.content_text}
                    onChange={(e) => setModalData({ ...modalData, content_text: e.target.value })}
                    rows={3}
                    placeholder={`Введите ${modalData.block_type === 'image' ? 'подпись к изображению' : 'описание'}...`}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </>
            )}

            <div className="form-actions">
              <button
                className="admin-button"
                onClick={saveBlock}
                disabled={updateLoading || !modalData.block_type ||
                  (modalData.block_type === 'text' ? !modalData.content_text.trim() :
                    !modalData.content_text.trim() && !modalData.content_url.trim())}
              >
                {updateLoading ? 'Сохранение...' : (modalMode === 'add' ? 'Добавить' : 'Сохранить')}
              </button>
              <button
                className="admin-button"
                onClick={closeModal}
                disabled={updateLoading}
                style={{ background: 'var(--admin-danger)' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Breadcrumb компонент
interface BreadcrumbProps {
  navigation: NavigationState;
  onNavigate: (newState: NavigationState) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ navigation, onNavigate }) => {
  const breadcrumbs = [];

  breadcrumbs.push({
    label: 'Курсы',
    onClick: () => onNavigate({ view: 'courses' })
  });

  if (navigation.courseId) {
    breadcrumbs.push({
      label: navigation.courseName || 'Курс',
      onClick: () => onNavigate({
        view: 'stages',
        courseId: navigation.courseId,
        courseName: navigation.courseName
      })
    });
  }

  if (navigation.stageId) {
    breadcrumbs.push({
      label: navigation.stageName || 'Ступень',
      onClick: () => onNavigate({
        view: 'lessons',
        courseId: navigation.courseId,
        courseName: navigation.courseName,
        stageId: navigation.stageId,
        stageName: navigation.stageName
      })
    });
  }

  if (navigation.lessonId) {
    breadcrumbs.push({
      label: navigation.lessonName || 'Урок',
      onClick: () => onNavigate({
        view: 'lessons',
        courseId: navigation.courseId,
        courseName: navigation.courseName,
        stageId: navigation.stageId,
        stageName: navigation.stageName
      })
    });
  }

  if (navigation.view === 'blocks') {
    breadcrumbs.push({
      label: 'Блоки',
      onClick: () => { }
    });
  }

  return (
    <div className="admin-breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && ' > '}
          <button
            className="breadcrumb-link"
            onClick={crumb.onClick}
            disabled={index === breadcrumbs.length - 1}
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

// Основные вкладки админки (без "Ступени")
type AdminTab = 'students' | 'curators' | 'courses' | 'submissions' | 'materials' | 'tariffs' | 'chats' | 'faq' | 'broadcasts';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState<AdminTab>('courses');
  const [navigation, setNavigation] = useState<NavigationState>({ view: 'courses' });
  const [submissionsNavigation, setSubmissionsNavigation] = useState<SubmissionsNavigationState>({ view: 'list' });

  // Инициализируем состояние авторизации из localStorage
  const [passwordAuth, setPasswordAuth] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('admin_auth');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Инициализируем админского пользователя из localStorage
  const [adminUser, setAdminUser] = useState<{
    id: string;
    role: string;
    first_name?: string;
    last_name?: string;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Состояние для веб-авторизации
  const [login, setLogin] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Устанавливаем стили для админки независимо от Telegram
  useEffect(() => {
    // Устанавливаем стили body для админки
    document.body.style.background = 'linear-gradient(135deg, #1e1e2e 0%, #313244 50%, #181825 100%)';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    document.body.className = 'admin-mode';

    // Очистка при размонтировании
    return () => {
      document.body.style.background = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.fontFamily = '';
      document.body.className = '';
    };
  }, []);

  // Валидация данных из localStorage при загрузке
  useEffect(() => {
    try {
      const authStored = localStorage.getItem('admin_auth');
      const userStored = localStorage.getItem('admin_user');

      if (authStored === 'true' && userStored) {
        const userData = JSON.parse(userStored);

        // Проверяем что данные пользователя валидны
        if (userData && userData.id && userData.role &&
          ['admin', 'curator'].includes(userData.role)) {
          // Данные корректны, оставляем авторизацию
          console.log('Сессия восстановлена из localStorage:', userData.role);
        } else {
          // Данные невалидны, очищаем
          localStorage.removeItem('admin_auth');
          localStorage.removeItem('admin_user');
          setPasswordAuth(false);
          setAdminUser(null);
        }
      }
    } catch (err) {
      console.warn('Ошибка валидации localStorage:', err);
      // При ошибке парсинга очищаем все
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_user');
      setPasswordAuth(false);
      setAdminUser(null);
    }
  }, []);

  // Веб-авторизация через базу данных
  const authenticateUser = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }

    try {
      setAuthLoading(true);
      setError(null);

      if (!supabase) {
        setError('Supabase не инициализирован');
        return;
      }

      // Вызываем функцию авторизации в базе данных
      const { data, error } = await supabase
        .rpc('authenticate_web_user', {
          login_param: login.trim(),
          password_param: password.trim()
        });

      if (error) {
        console.error('Ошибка авторизации:', error);
        setError('Ошибка подключения к базе данных');
        return;
      }

      if (!data || data.length === 0 || !data[0].is_authenticated) {
        setError('Неверный логин или пароль');
        return;
      }

      const userData = data[0];

      const userInfo = {
        id: userData.user_id,
        role: userData.user_role,
        first_name: userData.first_name,
        last_name: userData.last_name
      };

      // Успешная авторизация - сохраняем в localStorage
      try {
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_user', JSON.stringify(userInfo));
      } catch (err) {
        console.warn('Ошибка сохранения в localStorage:', err);
      }

      setPasswordAuth(true);
      setAdminUser(userInfo);

      // Очищаем поля
      setLogin('');
      setPassword('');

    } catch (err) {
      console.error('Неожиданная ошибка авторизации:', err);
      setError('Произошла неожиданная ошибка');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    // Очищаем localStorage
    try {
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_user');
    } catch (err) {
      console.warn('Ошибка очистки localStorage:', err);
    }

    setPasswordAuth(false);
    setLogin('');
    setPassword('');
    setAdminUser(null);
    navigate('/');
  };

  const handleCourseSelect = (courseId: string, courseName: string) => {
    setNavigation({ view: 'stages', courseId, courseName });
  };

  const handleStageSelect = (stageId: number, stageName: string) => {
    setNavigation({
      ...navigation,
      view: 'lessons',
      stageId,
      stageName
    });
  };

  const handleLessonSelect = (lessonId: number, lessonName: string) => {
    setNavigation({
      ...navigation,
      view: 'blocks',
      lessonId,
      lessonName
    });
  };

  const handleNavigationBack = () => {
    switch (navigation.view) {
      case 'blocks':
        setNavigation({
          view: 'lessons',
          courseId: navigation.courseId,
          courseName: navigation.courseName,
          stageId: navigation.stageId,
          stageName: navigation.stageName
        });
        break;
      case 'lessons':
        setNavigation({
          view: 'stages',
          courseId: navigation.courseId,
          courseName: navigation.courseName
        });
        break;
      case 'stages':
        setNavigation({ view: 'courses' });
        break;
    }
  };

  // Обработчики для сабмитов
  const handleSubmissionSelect = (submissionId: number) => {
    setSubmissionsNavigation({
      view: 'detail',
      selectedSubmissionId: submissionId
    });
  };

  const handleSubmissionsBack = () => {
    setSubmissionsNavigation({ view: 'list' });
  };

  const handleSubmissionUpdated = () => {
    // Можно добавить дополнительную логику при обновлении сабмита
    console.log('Сабмит обновлен');
  };

  const handleTabChange = (newTab: AdminTab) => {
    const contentElement = document.querySelector('.admin-content');
    if (contentElement) {
      // Добавляем класс для анимации
      contentElement.classList.add('tab-switching');

      // Убираем класс после завершения анимации
      setTimeout(() => {
        contentElement.classList.remove('tab-switching');
      }, 200);
    }

    setCurrentTab(newTab);

    // Сбрасываем навигацию курсов при переходе на другие табы
    if (newTab !== 'courses') {
      setNavigation({ view: 'courses' });
    }

    // Сбрасываем навигацию сабмитов при переходе на другие табы
    if (newTab !== 'submissions') {
      setSubmissionsNavigation({ view: 'list' });
    }
  };

  // Для куратора сразу переключаемся на вкладку "Проверка ДЗ"
  useEffect(() => {
    if (adminUser?.role === 'curator') {
      setCurrentTab('submissions');
    }
  }, [adminUser]);

  // Если пользователь не авторизован - показываем форму входа
  if (!passwordAuth) {
    return (
      <div className="admin-login">
        <h1>Админ-панель</h1>

        <div className="admin-warning">
          Доступ ограничен. Введите логин и пароль для входа.
        </div>

        {error && <div className="admin-error">{error}</div>}

        <input
          type="text"
          className="admin-input"
          placeholder="Логин"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && authenticateUser()}
          disabled={authLoading}
        />
        <input
          type="password"
          className="admin-input"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && authenticateUser()}
          disabled={authLoading}
        />
        <button
          className="admin-button"
          onClick={authenticateUser}
          disabled={authLoading}
        >
          {authLoading ? 'Проверка...' : 'Войти'}
        </button>
      </div>
    );
  }

  return (
    <PlayerProvider>
      <div className="admin-page">
        <div className="admin-header">
          <h1>Админ-панель</h1>
          <div className="admin-header-right">
            <div className="admin-user-info-header">
              <span className="admin-user-name-header">
                {adminUser?.last_name} {adminUser?.first_name}
              </span>
              <span className="admin-user-role-header">
                Роль: {adminUser?.role}
              </span>
            </div>
            <button className="admin-logout-btn" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>

        <div className="admin-tabs">
          {adminUser?.role === 'curator' ? (
            <>
              <button
                className={`admin-tab ${currentTab === 'submissions' ? 'active' : ''}`}
                onClick={() => handleTabChange('submissions')}
              >
                Проверка ДЗ
              </button>
              <button
                className={`admin-tab ${currentTab === 'students' ? 'active' : ''}`}
                onClick={() => handleTabChange('students')}
              >
                Ученики
              </button>
            </>
          ) : (
            <>
              <button
                className={`admin-tab ${currentTab === 'courses' ? 'active' : ''}`}
                onClick={() => handleTabChange('courses')}
              >
                Курсы
              </button>
              <button
                className={`admin-tab ${currentTab === 'students' ? 'active' : ''}`}
                onClick={() => handleTabChange('students')}
              >
                Ученики
              </button>
              <button
                className={`admin-tab ${currentTab === 'curators' ? 'active' : ''}`}
                onClick={() => handleTabChange('curators')}
              >
                Кураторы
              </button>
              <button
                className={`admin-tab ${currentTab === 'submissions' ? 'active' : ''}`}
                onClick={() => handleTabChange('submissions')}
              >
                Проверка ДЗ
              </button>
              <button
                className={`admin-tab ${currentTab === 'materials' ? 'active' : ''}`}
                onClick={() => handleTabChange('materials')}
              >
                Материалы
              </button>
              <button
                className={`admin-tab ${currentTab === 'tariffs' ? 'active' : ''}`}
                onClick={() => handleTabChange('tariffs')}
              >
                Тарифы
              </button>
              <button
                className={`admin-tab ${currentTab === 'chats' ? 'active' : ''}`}
                onClick={() => handleTabChange('chats')}
              >
                Чаты
              </button>
              <button
                className={`admin-tab ${currentTab === 'faq' ? 'active' : ''}`}
                onClick={() => handleTabChange('faq')}
              >
                FAQ
              </button>
              <button
                className={`admin-tab ${currentTab === 'broadcasts' ? 'active' : ''}`}
                onClick={() => handleTabChange('broadcasts')}
              >
                Эфиры
              </button>
            </>
          )}
        </div>

        {currentTab === 'courses' && navigation.view !== 'courses' && (
          <Breadcrumb
            navigation={navigation}
            onNavigate={setNavigation}
          />
        )}

        <div className="admin-content">
          {currentTab === 'tariffs' && <TariffsManager />}
          {currentTab === 'students' && <StudentsManager currentUser={adminUser} />}
          {currentTab === 'curators' && <CuratorsManager />}
          {currentTab === 'courses' && (
            <>
              {navigation.view === 'courses' && (
                <CoursesManager onCourseSelect={handleCourseSelect} />
              )}

              {navigation.view === 'stages' && navigation.courseId && (
                <StagesManager
                  courseId={navigation.courseId}
                  onBack={handleNavigationBack}
                  onStageSelect={handleStageSelect}
                />
              )}

              {navigation.view === 'lessons' && navigation.stageId && (
                <LessonsManager
                  courseId={navigation.courseId!}
                  stageId={navigation.stageId}
                  onBack={handleNavigationBack}
                  onLessonSelect={handleLessonSelect}
                />
              )}

              {navigation.view === 'blocks' && navigation.lessonId && (
                <BlocksManager
                  courseId={navigation.courseId!}
                  stageId={navigation.stageId!}
                  lessonId={navigation.lessonId}
                  onBack={handleNavigationBack}
                />
              )}
            </>
          )}
          {currentTab === 'submissions' && (
            <>
              {submissionsNavigation.view === 'list' && (
                <SubmissionsManager
                  onSubmissionSelect={handleSubmissionSelect}
                  currentUser={adminUser}
                />
              )}

              {submissionsNavigation.view === 'detail' && submissionsNavigation.selectedSubmissionId && (
                <SubmissionDetail
                  submissionId={submissionsNavigation.selectedSubmissionId}
                  onBack={handleSubmissionsBack}
                  onSubmissionUpdated={handleSubmissionUpdated}
                  currentUser={adminUser}
                />
              )}
            </>
          )}
          {currentTab === 'materials' && <MaterialsManager />}
          {currentTab === 'chats' && <ChatsManager />}
          {currentTab === 'faq' && <FaqManager />}
          {currentTab === 'broadcasts' && <BroadcastsManager />}
        </div>
      </div>
    </PlayerProvider>
  );
};

export default AdminPage;