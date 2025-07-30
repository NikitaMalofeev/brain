import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploader, type FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { supabase } from '@/lib/supabase/client';
import { useCoursesAdmin, useStagesAdmin, useLessonsAdmin, useBlocksAdmin } from '@/lib/supabase/hooks';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';
import { useTariffLimits } from '@/lib/supabase/hooks/useTariffLimits';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { deleteFile } from '@/lib/supabase/supabaseStorageService';
import { PlayerProvider } from '@/contexts/PlayerContext';
import './AdminPage.css';
import { Database } from '../../lib/supabase/types';


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
import TokensManager from './components/TokensManager/TokensManager';
import { BlocksManager as BlocksManagerComponent } from './components/BlocksManager';

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



// Компонент для настройки лимитов тарифов для этапа
interface TariffLimitsSectionProps {
  stageId: number;
}

const TariffLimitsSection: React.FC<TariffLimitsSectionProps> = ({ stageId }) => {
  const { tariffLimits, loading, error, saveTariffLimits, savingLimits, saveLimitsError } = useTariffLimits(stageId);

  // Локальное состояние для редактирования лимитов
  const [localLimits, setLocalLimits] = useState<{ [tariffId: string]: { requiresPrereq: boolean } }>({});

  // Инициализируем локальное состояние при загрузке данных
  useEffect(() => {
    if (tariffLimits.length > 0) {
      const initialLimits: typeof localLimits = {};
      tariffLimits.forEach(tariff => {
        initialLimits[tariff.id] = {
          requiresPrereq: tariff.requires_full_prereq,
        };
      });
      setLocalLimits(initialLimits);
    }
  }, [tariffLimits]);

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
              <th>Требует сдачи ДЗ</th>
            </tr>
          </thead>
          <tbody>
            {tariffLimits.map((tariff) => (
              <tr key={tariff.id}>
                <td>{tariff.name} ({tariff.code})</td>
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

  // Редактируемый курс
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [courseModalOpen, setCourseModalOpen] = useState(false);


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
    setCourseModalOpen(true);
    setUpdateError(null);
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingCourse(null);
    setEditTitle('');
    setEditSubtitle('');
    setCourseModalOpen(false);
    setUpdateError(null);
  };

  const closeCourseModal = () => {
    setCourseModalOpen(false);
    setEditingCourse(null);
    setEditTitle('');
    setEditSubtitle('');
    setUpdateError(null);
  };

  // Сохранение отредактированного курса
  const saveCourse = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editTitle.trim()) {
      setUpdateError('Название курса обязательно');
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      if (editingCourse) {
        // Редактирование существующего курса
        await updateCourse(editingCourse.id, {
          title: editTitle.trim(),
          subtitle: editSubtitle.trim() || undefined,
        });
      } else {
        // Добавление нового курса
        await createCourse({
          title: editTitle.trim(),
          subtitle: editSubtitle.trim() || undefined,
        });
      }

      closeCourseModal();

    } catch (error: any) {
      console.error('Ошибка при сохранении курса:', error);
      setUpdateError(error.message || 'Произошла ошибка при сохранении курса');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header flex-col sm:flex-row">
        <h2 className="text-xl sm:text-2xl">Управление курсами</h2>
        <button
          className="admin-refresh-btn w-full sm:w-auto mt-3 sm:mt-0"
          onClick={refetch}
          disabled={loading}
        >
          Обновить
        </button>
      </div>

      {/* Кнопка добавления курса */}
      <div className="mb-4">
        <button
          className="admin-button"
          onClick={() => {
            setEditingCourse(null);
            setEditTitle('');
            setEditSubtitle('');
            setCourseModalOpen(true);
          }}
        >
          + Добавить курс
        </button>
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
        <div className="admin-table overflow-x-auto">
          {/* Десктопная таблица */}
          <table className="hidden sm:table">
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
                  <td>{course.title}</td>
                  <td>
                    <p className={'line-clamp-3'}>{course.subtitle || '-'}</p>
                 </td>
                  <td>{new Date(course.created_at || '').toLocaleDateString()}</td>
                  <td className="actions-cell">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Мобильные карточки */}
          <div className="sm:hidden space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="mb-3">
                  <h4 className="font-semibold text-lg">{course.title}</h4>
                  {course.subtitle && (
                    <p className="text-gray-600 text-sm mt-1 description-cell">{course.subtitle}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    Создан: {new Date(course.created_at || '').toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className="action-btn edit-btn w-full text-sm justify-center"
                    onClick={() => onCourseSelect(course.id, course.title)}
                  >
                    Управление ступенями
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="action-btn edit-btn flex-1 text-xs justify-center"
                      onClick={() => startEditing(course)}
                    >
                      Изменить
                    </button>
                    <button
                      className="action-btn delete-btn flex-1 text-xs justify-center"
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      disabled={updateLoading}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно редактирования курса */}
      {courseModalOpen && (
        <div className="admin-modal-backdrop" onClick={closeCourseModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={closeCourseModal}>×</button>

            <h3>{editingCourse ? 'Редактировать курс' : 'Добавить курс'}</h3>

            <div className="form-group">
              <label>Название курса:</label>
              <input
                className="admin-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Введите название курса..."
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Подзаголовок (опционально):</label>
              <input
                className="admin-input"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="Введите подзаголовок..."
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="admin-button"
                onClick={saveCourse}
                disabled={updateLoading || !editTitle.trim()}
              >
                {updateLoading ? 'Сохранение...' : (editingCourse ? 'Сохранить' : 'Добавить')}
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={closeCourseModal}
                disabled={updateLoading}
                style={{ background: 'var(--admin-secondary)' }}
              >
                Отмена
              </button>
            </div>

            {updateError && (
              <div className="admin-error" style={{ marginTop: '12px' }}>
                {updateError}
              </div>
            )}
          </div>
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

  // Редактируемая ступень
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrderNum, setEditOrderNum] = useState(1);
  const [editIsUnlocked, setEditIsUnlocked] = useState(false);
  const [editCoverImagePath, setEditCoverImagePath] = useState('');
  const [stageModalOpen, setStageModalOpen] = useState(false);

  // Состояние для загрузки файлов
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Модальное окно для редактирования обложки
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [editingCoverStage, setEditingCoverStage] = useState<any | null>(null);

  // Ref для FileUploader
  const fileUploaderRef = useRef<FileUploaderRef>(null);


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

    const confirmDelete = confirm('Вы уверены, что хотите удалить обложку ступени? Файл будет удален безвозвратно');
    if (!confirmDelete) return;

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      // Удаляем файл из CloudFlare R2
      await deleteFile(editingCoverStage.cover_image_path);

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
    setStageModalOpen(true);
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
    setStageModalOpen(false);
  };

  const closeStageModal = () => {
    setStageModalOpen(false);
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
    if (!editName.trim()) {
      setUpdateError('Название ступени обязательно');
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      if (editingStage) {
        // Редактирование существующей ступени
        await updateStage(editingStage.id, {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          order_num: editOrderNum,
          is_unlocked: editIsUnlocked,
          cover_image_path: editCoverImagePath || undefined,
        });
      } else {
        // Добавление новой ступени
        await createStage({
          course_id: courseId,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          order_num: editOrderNum,
          is_unlocked: editIsUnlocked,
          cover_image_path: editCoverImagePath || undefined,
        });
      }

      closeStageModal();

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
            className="admin-add-btn before:hidden"
            onClick={onBack}
          >
            ← Назад к курсам
          </button>
        </div>
      </div>

      {/* Кнопка добавления ступени */}
      <div className="mb-4">
        <button
          className="admin-button"
          onClick={() => {
            setEditingStage(null);
            setEditName('');
            setEditDescription('');
            setEditOrderNum(stages.length > 0 ? Math.max(...stages.map(s => s.order_num)) + 1 : 1);
            setEditIsUnlocked(false);
            setStageModalOpen(true);
          }}
        >
          + Добавить ступень
        </button>
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
                <Fragment key={stage.id}>
                  <tr>
                  <td className="stage-cover-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {stage.cover_image_path ? (
                        <img
                          src={buildFileUrl(stage.cover_image_path) || ''}
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
                        style={{ fontSize: '12px', padding: '4px 10px', minWidth: 'auto' }}
                      >
                        {stage.cover_image_path ? 'Изменить' : 'Добавить'}
                      </button>
                    </div>
                  </td>
                  <td>{stage.name}</td>
                  <td>
                    <p className={'line-clamp-3'}>{stage.description || '-'}</p>
                  </td>
                  <td>{stage.order_num}</td>
                  <td>
                    <span className={`admin-status ${stage.is_unlocked ? 'admin-yes' : 'admin-no'}`}>
                      {stage.is_unlocked ? 'Да' : 'Нет'}
                    </span>
                  </td>
                  <td className="actions-cell">
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
                  </td>
                </tr>
                </Fragment>
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
                    src={buildFileUrl(editingCoverStage.cover_image_path) || ''}
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
                currentFileUrl={buildFileUrl(editingCoverStage?.cover_image_path) || undefined}
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

      {/* Модальное окно редактирования ступени */}
      {stageModalOpen && (
        <div className="admin-modal-backdrop" onClick={closeStageModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={closeStageModal}>×</button>

            <h3>{editingStage ? 'Редактировать ступень' : 'Добавить ступень'}</h3>

            <div className="form-group">
              <label>Название ступени:</label>
              <input
                className="admin-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Введите название ступени..."
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Описание ступени (опционально):</label>
              <textarea
                className="admin-input"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Введите описание ступени..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Порядковый номер:</label>
                <input
                  className="admin-input"
                  type="number"
                  value={editOrderNum}
                  onChange={(e) => setEditOrderNum(parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={editIsUnlocked}
                    onChange={(e) => setEditIsUnlocked(e.target.checked)}
                  />
                  Разблокирована
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="admin-button"
                onClick={saveStage}
                disabled={updateLoading || !editName.trim()}
              >
                {updateLoading ? 'Сохранение...' : (editingStage ? 'Сохранить' : 'Добавить')}
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={closeStageModal}
                disabled={updateLoading}
                style={{ background: 'var(--admin-secondary)' }}
              >
                Отмена
              </button>
            </div>

            {updateError && (
              <div className="admin-error" style={{ marginTop: '12px' }}>
                {updateError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Секция настройки лимитов для этапов курса */}
      {editingStage && <TariffLimitsSection stageId={editingStage.id} />}
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

type AdminTab = 'students' | 'curators' | 'courses' | 'submissions' | 'materials' | 'tariffs' | 'chats' | 'faq' | 'broadcasts' | 'tokens';

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

  // Устанавливаем класс для body, чтобы применились стили админки
  useEffect(() => {
    document.body.classList.add('admin-mode');

    // Очистка при размонтировании
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, []);

  // Валидация данных из localStorage при загрузке
  useEffect(() => {
    try {
      const authStored = localStorage.getItem('admin_auth');
      const userStored = localStorage.getItem('admin_user');
      const tokenStored = localStorage.getItem('admin_access_token'); // Читаем токен

      if (authStored === 'true' && userStored && tokenStored) {
        const userData = JSON.parse(userStored);

        // Проверяем что данные пользователя валидны
        if (userData && userData.id && userData.role &&
          ['admin', 'curator'].includes(userData.role)) {

          // Восстанавливаем сессию в Supabase client
          if (supabase) { // <--- ВОТ ИСПРАВЛЕНИЕ
            supabase.auth.setSession({
              access_token: tokenStored,
              refresh_token: '',
            });
          } else {
            console.warn('Supabase client не был доступен при восстановлении сессии.');
          }

          // Данные корректны, оставляем авторизацию
          console.log('Сессия восстановлена из localStorage:', userData.role);
        } else {
          // Данные невалидны, очищаем
          localStorage.removeItem('admin_auth');
          localStorage.removeItem('admin_user');
          localStorage.removeItem('admin_access_token'); // Очищаем токен
          setPasswordAuth(false);
          setAdminUser(null);
        }
      }
    } catch (err) {
      console.warn('Ошибка валидации localStorage:', err);
      // При ошибке парсинга очищаем все
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_access_token'); // Очищаем токен
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

      // Проверяем, что бэкенд вернул токен
      if (!userData.access_token) {
        console.error('Токен доступа не был получен от функции авторизации. Убедитесь, что миграция БД применена.');
        setError('Ошибка конфигурации сервера. Не удалось получить токен.');
        return;
      }

      const userInfo = {
        id: userData.user_id,
        role: userData.user_role,
        first_name: userData.first_name,
        last_name: userData.last_name
      };

      const accessToken = userData.access_token;

      // Устанавливаем сессию в Supabase client
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '', // Мы не используем refresh-токены в этой схеме
      });

      // Успешная авторизация - сохраняем в localStorage
      try {
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_user', JSON.stringify(userInfo));
        localStorage.setItem('admin_access_token', accessToken); // Сохраняем токен
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

  const handleLogout = async () => {
    // Завершаем сессию в Supabase, если клиент доступен
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      console.warn('Supabase client не был доступен при выходе из системы.');
    }

    // Очищаем localStorage
    try {
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_access_token'); // Очищаем токен
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
          {/* Курсы - доступно только админам */}
          {adminUser?.role === 'admin' && (
            <button
              className={`admin-tab ${currentTab === 'courses' ? 'active' : ''}`}
              onClick={() => handleTabChange('courses')}
            >
              Курсы
            </button>
          )}

          {/* Ученики - доступно всем */}
          <button
            className={`admin-tab ${currentTab === 'students' ? 'active' : ''}`}
            onClick={() => handleTabChange('students')}
          >
            Ученики
          </button>

          {/* Кураторы - доступно только админам */}
          {adminUser?.role === 'admin' && (
            <button
              className={`admin-tab ${currentTab === 'curators' ? 'active' : ''}`}
              onClick={() => handleTabChange('curators')}
            >
              Кураторы
            </button>
          )}

          {/* Проверка ДЗ - доступно всем */}
          <button
            className={`admin-tab ${currentTab === 'submissions' ? 'active' : ''}`}
            onClick={() => handleTabChange('submissions')}
          >
            Проверка ДЗ
          </button>

          {/* Вкладки только для админов */}
          {adminUser?.role === 'admin' && (
            <>
              <button
                className={`admin-tab ${currentTab === 'materials' ? 'active' : ''}`}
                onClick={() => handleTabChange('materials')}
              >
                Библиотека
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
              <button
                className={`admin-tab ${currentTab === 'tokens' ? 'active' : ''}`}
                onClick={() => handleTabChange('tokens')}
              >
                Доступы
              </button>
            </>
          )}
        </div>

        <div className="admin-main-content">
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
                <BlocksManagerComponent
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
          {currentTab === 'tokens' && <TokensManager />}
        </div>
      </div>
    </PlayerProvider>
  );
};

export default AdminPage;