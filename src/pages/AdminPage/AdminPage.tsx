import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  initDataState as _initDataState,
  useSignal,
} from '@telegram-apps/sdk-react';
import { Page } from '@/components/Page';
import { FileUploader, CloudFlareR2Diagnostics } from '@/components';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseUser, useCoursesAdmin, useStagesAdmin, useLessonsAdmin, useBlocksAdmin } from '@/lib/supabase/hooks';
import { FILE_PREFIXES } from '@/lib/cloudflareR2Service';
import { PlayerProvider } from '@/contexts/PlayerContext';
import './AdminPage.css';
import { MdRefresh, MdLogout, MdArrowBack } from 'react-icons/md';
import { Database } from '../../lib/supabase/types';

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
          ↻ Обновить
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
        <div className="courses-table">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Подзаголовок</th>
                <th>Ступеней</th>
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
                  <td>{(course as any).course_stages?.count || 0}</td>
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
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Новая ступень
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOrderNum, setNewOrderNum] = useState(1);
  const [newIsUnlocked, setNewIsUnlocked] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Редактируемая ступень
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrderNum, setEditOrderNum] = useState(1);
  const [editIsUnlocked, setEditIsUnlocked] = useState(false);

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
      });

      // Очищаем форму
      setNewName('');
      setNewDescription('');
      setNewOrderNum(stages.length + 1);
      setNewIsUnlocked(false);

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
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingStage(null);
    setEditName('');
    setEditDescription('');
    setEditOrderNum(1);
    setEditIsUnlocked(false);
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
            ↻ Обновить
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
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
        <div className="stages-table">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th>Порядок</th>
                <th>Уроков</th>
                <th>Разблокирована</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id}>
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
                  <td>{(stage as any).lessons?.count || 0}</td>
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
    </div>
  );
};

const LessonsManager: React.FC<LessonsManagerProps> = ({ courseId, stageId, onBack, onLessonSelect }) => {
  const { lessons, loading, error, refetch, createLesson, updateLesson, deleteLesson } = useLessonsAdmin(stageId);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Новый урок
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOrderNum, setNewOrderNum] = useState(1);
  const [newHasAssignment, setNewHasAssignment] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Редактируемый урок
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrderNum, setEditOrderNum] = useState(1);
  const [editHasAssignment, setEditHasAssignment] = useState(false);

  // Добавление урока
  const handleAddLesson = async () => {
    if (!newName.trim()) {
      alert('Введите название урока');
      return;
    }

    try {
      setAddLoading(true);
      setUpdateError(null);

      await createLesson({
        stage_id: stageId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        order_num: newOrderNum,
        has_assignment: newHasAssignment,
      });

      // Очищаем форму
      setNewName('');
      setNewDescription('');
      setNewOrderNum(lessons.length + 1);
      setNewHasAssignment(false);

    } catch (error: any) {
      console.error('Ошибка при добавлении урока:', error);
      setUpdateError(error.message || 'Произошла ошибка при добавлении урока');
    } finally {
      setAddLoading(false);
    }
  };

  // Удаление урока
  const handleDeleteLesson = async (id: number, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить урок "${name}"? Это также удалит все блоки урока и прогресс пользователей.`)) {
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await deleteLesson(id);

    } catch (error: any) {
      console.error('Ошибка при удалении урока:', error);
      setUpdateError(error.message || 'Произошла ошибка при удалении урока');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Начать редактирование урока
  const startEditing = (lesson: any) => {
    setEditingLesson(lesson);
    setEditName(lesson.name);
    setEditDescription(lesson.description || '');
    setEditOrderNum(lesson.order_num);
    setEditHasAssignment(lesson.has_assignment || false);
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingLesson(null);
    setEditName('');
    setEditDescription('');
    setEditOrderNum(1);
    setEditHasAssignment(false);
  };

  // Сохранение отредактированного урока
  const saveLesson = async () => {
    if (!editingLesson) return;
    if (!editName.trim()) {
      alert('Название урока обязательно');
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      await updateLesson(editingLesson.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        order_num: editOrderNum,
        has_assignment: editHasAssignment,
      });

      cancelEditing();

    } catch (error: any) {
      console.error('Ошибка при сохранении урока:', error);
      setUpdateError(error.message || 'Произошла ошибка при сохранении урока');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Управление уроками</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="admin-refresh-btn"
            onClick={refetch}
            disabled={loading}
          >
            ↻ Обновить
          </button>
          <button
            className="admin-add-btn"
            onClick={onBack}
          >
            ← Назад к ступеням
          </button>
        </div>
      </div>

      {/* Форма добавления урока */}
      <div className="lesson-add-form">
        <h3>Добавить урок</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            className="admin-input"
            placeholder="Название урока"
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
              checked={newHasAssignment}
              onChange={e => setNewHasAssignment(e.target.checked)}
            />
            Есть ДЗ
          </label>
          <button
            className="admin-button"
            onClick={handleAddLesson}
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
        <div className="admin-loading">Загрузка уроков...</div>
      ) : error ? (
        <div className="admin-error">Ошибка: {error.message}</div>
      ) : lessons.length === 0 ? (
        <div className="empty-table">Уроки не найдены</div>
      ) : (
        <div className="lessons-table">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th>Порядок</th>
                <th>Блоков</th>
                <th>Есть ДЗ</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td>
                    {editingLesson?.id === lesson.id ? (
                      <input
                        className="admin-input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      lesson.name
                    )}
                  </td>
                  <td>
                    {editingLesson?.id === lesson.id ? (
                      <input
                        className="admin-input"
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      lesson.description || '-'
                    )}
                  </td>
                  <td>
                    {editingLesson?.id === lesson.id ? (
                      <input
                        className="admin-input"
                        type="number"
                        value={editOrderNum}
                        onChange={e => setEditOrderNum(parseInt(e.target.value) || 1)}
                        style={{ width: '80px' }}
                      />
                    ) : (
                      lesson.order_num
                    )}
                  </td>
                  <td>{(lesson as any).lesson_blocks?.count || 0}</td>
                  <td>
                    {editingLesson?.id === lesson.id ? (
                      <input
                        type="checkbox"
                        checked={editHasAssignment}
                        onChange={e => setEditHasAssignment(e.target.checked)}
                      />
                    ) : (
                      <span className={`admin-status ${lesson.has_assignment ? 'admin-yes' : 'admin-no'}`}>
                        {lesson.has_assignment ? 'Да' : 'Нет'}
                      </span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingLesson?.id === lesson.id ? (
                      <>
                        <button
                          className="action-btn edit-btn"
                          onClick={saveLesson}
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
                          onClick={() => onLessonSelect(lesson.id, lesson.name)}
                          title="Управление блоками"
                        >
                          Блоки
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => startEditing(lesson)}
                          title="Редактировать урок"
                        >
                          Изменить
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteLesson(lesson.id, lesson.name)}
                          disabled={updateLoading}
                          title="Удалить урок"
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
        await createBlock({
          lesson_id: lessonId,
          title: modalData.title || undefined,
          block_type: modalData.block_type,
          content_text: modalData.content_text || undefined,
          content_url: modalData.content_url || undefined,
          order_num: modalData.order_num,
        });
      } else {
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

  // Инлайн-редактирование порядка
  const handleOrderChange = async (blockId: number, newOrder: number) => {
    try {
      await updateBlock(blockId, { order_num: newOrder });
    } catch (error: any) {
      console.error('Ошибка при изменении порядка:', error);
      setUpdateError(error.message || 'Произошла ошибка при изменении порядка');
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
            ↻ Обновить
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
      ) : (
        <div className="practices-table">
          {blocks.length > 0 ? (
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
                  <tr key={block.id}>
                    <td>
                      <input
                        type="number"
                        value={block.order_num}
                        onChange={(e) => handleOrderChange(block.id, parseInt(e.target.value) || 1)}
                        style={{ width: '60px', textAlign: 'center' }}
                        className="admin-input"
                        min="1"
                      />
                    </td>
                    <td>{block.title || <span className="empty-value">Без заголовка</span>}</td>
                    <td>
                      <span className={`admin-status admin-yes`}>
                        {getBlockTypeName(block.block_type)}
                      </span>
                    </td>
                    <td>{renderBlockContent(block)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => openEditModal(block)}
                          disabled={updateLoading}
                        >
                          Редактировать
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteBlock(block.id, block.title)}
                          disabled={updateLoading}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-table">
              Блоки не найдены. Добавьте первый блок урока.
            </div>
          )}
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
                    onUploadComplete={handleFileUploadComplete}
                    onUploadError={handleFileUploadError}
                    acceptedTypes={
                      modalData.block_type === 'audio' ? 'audio/*' :
                        modalData.block_type === 'image' ? 'image/*' :
                          modalData.block_type === 'pdf' ? 'application/pdf' :
                            '*/*'
                    }
                    filePrefix={
                      modalData.block_type === 'audio' ? FILE_PREFIXES.AUDIO :
                        modalData.block_type === 'image' ? FILE_PREFIXES.IMAGE :
                          FILE_PREFIXES.DOCUMENTS
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
type AdminTab = 'users' | 'courses' | 'submissions' | 'gamification' | 'chats' | 'faq' | 'settings' | 'diagnostic';

const AdminPage: React.FC = () => {
  const initDataState = useSignal(_initDataState);
  const { supabaseUser, loading: userLoading, error: userError } = useSupabaseUser(initDataState);
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState<AdminTab>('courses');
  const [navigation, setNavigation] = useState<NavigationState>({ view: 'courses' });
  const [passwordAuth, setPasswordAuth] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading) {
      if (userError) {
        setError('Ошибка при загрузке пользователя: ' + userError.message);
      } else if (!supabaseUser) {
        setError('Пользователь не найден');
      } else if (supabaseUser.role !== 'admin' && supabaseUser.role !== 'curator' && !passwordAuth) {
        navigate('/');
      }
    }
  }, [supabaseUser, userLoading, userError, navigate, passwordAuth]);

  const checkPassword = () => {
    const correctPassword = 'admin123';
    if (password === correctPassword) {
      setPasswordAuth(true);
      setError(null);
    } else {
      setError('Неверный пароль');
    }
  };

  const handleLogout = () => {
    setPasswordAuth(false);
    setPassword('');
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

  if (userLoading || (!['admin', 'curator'].includes(supabaseUser?.role || '') && !passwordAuth)) {
    return (
      <div className="admin-login">
        <h1>Админ-панель</h1>

        {userLoading ? (
          <div className="admin-loading">Загрузка...</div>
        ) : (
          <>
            {!passwordAuth && (
              <div className="admin-warning">
                Доступ ограничен. Введите пароль для входа.
              </div>
            )}

            {error && <div className="admin-error">{error}</div>}

            <input
              type="password"
              className="admin-input"
              placeholder="Пароль администратора"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkPassword()}
            />
            <button className="admin-button" onClick={checkPassword}>
              Войти
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <PlayerProvider>
      <Page showTabBar={false}>
        <div className="admin-page">
          <div className="admin-header">
            <h1>Админ-панель</h1>
            <button className="admin-logout-btn" onClick={handleLogout}>
              Выйти
            </button>
          </div>

          <div className="admin-tabs">
            <button
              className={`admin-tab ${currentTab === 'courses' ? 'active' : ''}`}
              onClick={() => setCurrentTab('courses')}
            >
              Курсы
            </button>
            <button
              className={`admin-tab ${currentTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setCurrentTab('submissions')}
            >
              Проверка ДЗ
            </button>
            <button
              className={`admin-tab ${currentTab === 'gamification' ? 'active' : ''}`}
              onClick={() => setCurrentTab('gamification')}
            >
              Геймификация
            </button>
            <button
              className={`admin-tab ${currentTab === 'chats' ? 'active' : ''}`}
              onClick={() => setCurrentTab('chats')}
            >
              Чаты
            </button>
            <button
              className={`admin-tab ${currentTab === 'faq' ? 'active' : ''}`}
              onClick={() => setCurrentTab('faq')}
            >
              FAQ
            </button>
            <button
              className={`admin-tab ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentTab('settings')}
            >
              Настройки
            </button>
            <button
              className={`admin-tab ${currentTab === 'diagnostic' ? 'active' : ''}`}
              onClick={() => setCurrentTab('diagnostic')}
            >
              🔍 R2 Диагностика
            </button>
          </div>

          {currentTab === 'courses' && navigation.view !== 'courses' && (
            <Breadcrumb
              navigation={navigation}
              onNavigate={setNavigation}
            />
          )}

          <div className="admin-content">
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
            {currentTab === 'submissions' && <div>Проверка домашних заданий</div>}
            {currentTab === 'gamification' && <div>Управление геймификацией</div>}
            {currentTab === 'chats' && <div>Управление чатами</div>}
            {currentTab === 'faq' && <div>Управление FAQ</div>}
            {currentTab === 'settings' && <div>Настройки системы</div>}
            {currentTab === 'diagnostic' && <CloudFlareR2Diagnostics />}
          </div>
        </div>
      </Page>
    </PlayerProvider>
  );
};

export default AdminPage; 