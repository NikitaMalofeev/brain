import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  initDataState as _initDataState,
  useSignal,
} from '@telegram-apps/sdk-react';
import { Page } from '@/components/Page';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseUser } from '@/lib/supabase/hooks/useSupabaseUser';
import { PlayerProvider } from '@/contexts/PlayerContext';
import './AdminPage.css';
import { uploadFileToR2 } from '@/lib/cloudflareR2Service';
import { MdPlayCircleOutline, MdRefresh, MdLogout } from 'react-icons/md';
import TimeInput, { formatTimeFromSeconds } from '@/components/TimeInput/TimeInput';
import { getKinescopeVideoMetadata } from '@/lib/kinescopeService';

// Типы для вкладок админ-панели
type AdminTab = 'practices' | 'categories' | 'quiz' | 'users';

// Добавляем класс admin-mode к body при монтировании компонента
const addBodyClass = () => {
  document.body.classList.add('admin-mode');
  return () => {
    document.body.classList.remove('admin-mode');
  };
};

const AdminPage: React.FC = () => {
  const initDataState = useSignal(_initDataState);
  const { supabaseUser, loading: userLoading, error: userError } = useSupabaseUser(initDataState);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('practices');
  const [passwordAuth, setPasswordAuth] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [previewPractice, setPreviewPractice] = useState<any | null>(null);
  
  // Добавляем состояние для редактирования практики непосредственно в AdminPage
  const [editPractice, setEditPractice] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [savingPractice, setSavingPractice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Добавляем класс 'admin-mode' к body при монтировании компонента
  useEffect(() => {
    return addBodyClass();
  }, []);

  console.log('AdminPage рендеринг, previewPractice:', previewPractice !== null, 'editPractice:', editPractice !== null);

  // Проверяем права администратора
  useEffect(() => {
    if (!userLoading) {
      if (userError) {
        setError('Ошибка при загрузке данных пользователя');
      } else if (!supabaseUser) {
        setError('Пользователь не найден');
      } else if (!supabaseUser.is_admin && !passwordAuth) {
        // Если у пользователя нет прав админа, перенаправляем на главную
        navigate('/');
      }
    }
  }, [supabaseUser, userLoading, userError, navigate, passwordAuth]);

  // Загрузка категорий и типов контента для селектов
  useEffect(() => {
    if (!passwordAuth && !supabaseUser?.is_admin) return;
    
    const fetchMetadata = async () => {
      if (!supabase) return;
      
      try {
        console.log('Загружаем метаданные (категории и типы контента)...');
        
        const [{ data: cats, error: catError }, { data: types, error: typeError }] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('content_types').select('id, name, slug').order('name')
        ]);
        
        if (catError) {
          console.error('Ошибка при загрузке категорий:', catError);
          throw catError;
        }
        
        if (typeError) {
          console.error('Ошибка при загрузке типов контента:', typeError);
          throw typeError;
        }
        
        console.log('Получено категорий:', cats?.length, 'типов контента:', types?.length);
        console.log('Категории:', cats);
        
        setCategories(cats || []);
        setContentTypes(types || []);
      } catch (error) {
        console.error('Ошибка при загрузке метаданных:', error);
      }
    };
    
    fetchMetadata();
  }, [supabaseUser, passwordAuth]);

  // Обработчик входа по паролю (для дополнительной защиты)
  const checkPassword = () => {
    console.log('checkPassword клик');
    // Захардкоженный пароль для демонстрации
    if (password === 'admin123') {
      setPasswordAuth(true);
      setError(null);
      localStorage.setItem('admin_authenticated', 'true');
    } else {
      setError('Неверный пароль');
    }
  };

  // Проверка аутентификации по паролю при загрузке
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_authenticated') === 'true';
    if (isAuth) {
      setPasswordAuth(true);
    }
  }, []);

  // Обработчик выхода
  const handleLogout = () => {
    console.log('handleLogout клик');
    setPasswordAuth(false);
    localStorage.removeItem('admin_authenticated');
    navigate('/');
  };

  // Обработчик сохранения изменений
  const handleSavePractice = async (form: any) => {
    console.log('handleSavePractice вызван с формой:', form);
    setSavingPractice(true);
    setSaveError(null);
    try {
      if (!supabase) throw new Error('Supabase не инициализирован');
      console.log('Сохраняем изменения практики:', form.title);
      
      const { error } = await supabase
        .from('contents')
        .update(form)
        .eq('id', editPractice.id);
        
      if (error) throw error;
      
      console.log('Практика успешно обновлена');
      // Закрываем модалку редактирования
      setEditPractice(null);
      
      // Данные обновятся автоматически через Realtime подписку,
      // но для уверенности можно явно сбросить чтобы PracticesManager перезапросил данные
      // (это не обязательно, если Realtime работает правильно)
    } catch (e: any) {
      console.error('Ошибка при сохранении практики:', e);
      setSaveError(e.message || 'Ошибка при сохранении');
    } finally {
      setSavingPractice(false);
    }
  };

  // Вспомогательная функция для установки практики для предпросмотра
  const handlePreviewPractice = (practice: any) => {
    console.log('handlePreviewPractice вызван:', practice.title);
    setPreviewPractice(practice);
  };

  // Вспомогательная функция для установки практики для редактирования
  const handleEditPractice = (practice: any) => {
    console.log('handleEditPractice вызван:', practice.title);
    setEditPractice(practice);
  };

  // Если загрузка или нет прав администратора и нет аутентификации по паролю, показываем форму входа
  if (userLoading || (!supabaseUser?.is_admin && !passwordAuth)) {
    return (
      <Page>
        <div className="admin-login">
          <h1>Вход в Панель Администратора</h1>
          {userLoading ? (
            <div className="admin-loading">Проверка прав доступа...</div>
          ) : (
            <>
              {!supabaseUser?.is_admin && (
                <div className="admin-warning">
                  У вас нет прав администратора. Введите дополнительный пароль для входа.
                </div>
              )}
              {error && <div className="admin-error">{error}</div>}
              <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
              />
              <button onClick={checkPassword} className="admin-button">
                Войти
              </button>
            </>
          )}
        </div>
      </Page>
    );
  }

  const handleTabChange = (tab: AdminTab) => {
    console.log('Смена вкладки на:', tab);
    setActiveTab(tab);
  };

  return (
    <PlayerProvider>
      <Page showTabBar={false}>
        <div className="admin-page">
          <div className="admin-header">
            <h1>Панель Администратора</h1>
            <button onClick={handleLogout} className="admin-logout-btn">
              <MdLogout size={18} />
              Выйти
            </button>
          </div>
          
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'practices' ? 'active' : ''}`}
              onClick={() => handleTabChange('practices')}
            >
              Практики
            </button>
            <button
              className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => handleTabChange('categories')}
            >
              Категории
            </button>
            <button
              className={`admin-tab ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => handleTabChange('quiz')}
            >
              Настройки квиза
            </button>
            <button
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              Пользователи
            </button>
          </div>
          
          {/* Контент вкладок */}
          <div className="admin-content">
            {activeTab === 'practices' && <PracticesManager 
              setPreviewPractice={handlePreviewPractice} 
              setEditPractice={handleEditPractice}
              categories={categories} 
            />}
            {activeTab === 'categories' && <CategoriesManager />}
            {activeTab === 'quiz' && <QuizManager />}
            {activeTab === 'users' && <UsersManager />}
          </div>

          {/* Попап предпросмотра видео */}
          {previewPractice && (
            <div 
              className="admin-modal-backdrop" 
              onClick={() => {
                console.log('Закрытие модалки предпросмотра по клику на backdrop');
                setPreviewPractice(null);
              }}
            >
              <div 
                className="admin-modal" 
                onClick={(e) => {
                  console.log('Клик внутри модалки предпросмотра (stopPropagation)');
                  e.stopPropagation();
                }}
              >
                <button 
                  className="admin-modal-close" 
                  onClick={(e) => {
                    console.log('Закрытие модалки предпросмотра по кнопке');
                    e.stopPropagation();
                    setPreviewPractice(null);
                  }}
                >✕</button>
                <h3>{previewPractice.title}</h3>
                
                {/* Отображаем видео из Kinescope - только через iframe для надежности */}
                {previewPractice.kinescope_id ? (
                  <div style={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
                    <iframe 
                      src={`https://kinescope.io/embed/${previewPractice.kinescope_id}`} 
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write;"
                      frameBorder="0"
                      allowFullScreen
                      style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
                    ></iframe>
                  </div>
                ) : (
                  <div style={{ padding: '20px', backgroundColor: 'rgba(30, 30, 46, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
                    ID видео не найден
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Попап редактирования практики перенесен на уровень AdminPage */}
          {editPractice && (
            <EditPracticeModal
              practice={editPractice}
              categories={categories}
              contentTypes={contentTypes}
              onClose={() => {
                console.log('Закрытие модалки редактирования');
                setEditPractice(null);
              }}
              onSave={handleSavePractice}
              saving={savingPractice}
              error={saveError}
            />
          )}
        </div>
      </Page>
    </PlayerProvider>
  );
};

// Компоненты для управления практиками
const PracticesManager: React.FC<{ 
  setPreviewPractice: (practice: any) => void;
  setEditPractice: (practice: any) => void;
  categories: any[];
}> = ({ setPreviewPractice, setEditPractice, categories }) => {
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string | number>('');
  
  console.log('PracticesManager рендеринг');

  // Загрузка практик
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Начинаем загрузку практик...');
        setLoading(true);
        if (!supabase) return;
        
        // Загружаем практики с включением связанных данных
        const { data, error } = await supabase
          .from('contents')
          .select(`
            *,
            content_types (
              name, 
              slug
            ),
            categories (
              name,
              slug
            )
          `)
          .order('title');
        
        if (error) throw error;
        
        console.log('Загружено практик:', data?.length);
        setPractices(data || []);
      } catch (error) {
        console.error('Ошибка при загрузке практик:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Подписка на realtime обновления таблицы contents
    if (supabase) {
      console.log('Подписываемся на обновления таблицы contents');
      const channel = supabase
        .channel('contents_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'contents' },
          (payload) => {
            console.log('Получено realtime событие:', payload.eventType);
            // Перезагружаем данные
            fetchData();
          }
        )
        .subscribe();
        
      // Очистка подписки при размонтировании
      return () => {
        console.log('Отписываемся от realtime обновлений');
        channel.unsubscribe();
      };
    }
  }, []);

  // Обработчики для событий
  const handleEditClick = (e: React.MouseEvent, practice: any) => {
    console.log('Клик по кнопке "Изменить" практику:', practice.title);
    e.stopPropagation();
    setEditPractice(practice);
  };

  const handleVideoPreview = (e: React.MouseEvent, practice: any) => {
    console.log('Клик по иконке предпросмотра видео:', practice.title);
    e.stopPropagation();
    setPreviewPractice(practice);
  };
  
  // Функции для инлайн-редактирования
  const startEditing = (practice: any, field: string) => {
    console.log(`Начинаем редактирование поля ${field} для практики ${practice.title}`);
    setEditingCell({ id: practice.id, field });
    
    // Устанавливаем начальное значение в зависимости от поля
    if (field === 'duration') {
      setEditValue(practice.duration || 0);
    } else if (field === 'title') {
      setEditValue(practice.title || '');
    } else if (field === 'category_id') {
      setEditValue(practice.category_id || '');
    }
  };
  
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };
  
  const saveInlineEdit = async () => {
    if (!editingCell) return;
    
    try {
      console.log(`Сохраняем изменение поля ${editingCell.field} для практики ID: ${editingCell.id}`);
      
      if (!supabase) throw new Error('Supabase не инициализирован');
      
      // Создаем объект для обновления с одним полем
      const updateData: Record<string, any> = {};
      updateData[editingCell.field] = editValue;
      
      // Если это длительность, убедимся, что она числовая
      if (editingCell.field === 'duration') {
        updateData[editingCell.field] = Number(editValue);
      }
      
      const { error } = await supabase
        .from('contents')
        .update(updateData)
        .eq('id', editingCell.id);
        
      if (error) throw error;
      
      console.log('Изменение успешно сохранено');
      
      // Обновляем локальные данные без ожидания realtime события
      setPractices(prev => 
        prev.map(practice => {
          if (practice.id === editingCell.id) {
            // Создаем обновленный объект практики
            const updatedPractice = { ...practice };
            
            // Обновляем поле в зависимости от типа
            if (editingCell.field === 'category_id') {
              updatedPractice.category_id = editValue;
              
              // Также обновляем кэшированное значение категории
              const selectedCategory = categories.find(cat => cat.id === editValue);
              if (selectedCategory) {
                updatedPractice.categories = {
                  name: selectedCategory.name,
                  slug: selectedCategory.slug
                };
              } else {
                updatedPractice.categories = null;
              }
            } else if (editingCell.field === 'duration') {
              updatedPractice[editingCell.field] = Number(editValue);
            } else {
              updatedPractice[editingCell.field] = editValue;
            }
            
            return updatedPractice;
          }
          return practice;
        })
      );
      
      // Добавляем визуальный эффект успешного сохранения
      const cell = document.querySelector(`td[data-id="${editingCell.id}"][data-field="${editingCell.field}"]`);
      if (cell) {
        cell.classList.add('save-flash');
        setTimeout(() => {
          cell.classList.remove('save-flash');
        }, 1000);
      }
    } catch (e: any) {
      console.error('Ошибка при сохранении изменения:', e);
      alert(`Ошибка при сохранении: ${e.message}`);
    } finally {
      cancelEditing();
    }
  };
  
  // Обработчик клавиш для инлайн-редактирования
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Управление практиками</h2>
        <button 
          className="admin-add-btn"
          onClick={() => console.log('Клик по кнопке "Добавить практику"')}
        >
          Добавить практику
        </button>
      </div>
      {loading ? (
        <div className="admin-loading">Загрузка практик...</div>
      ) : (
        <div className="practices-table">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Категория</th>
                <th>Длительность</th>
                <th>Обложка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {practices.length > 0 ? (
                practices.map((practice) => (
                  <tr key={practice.id}>
                    <td 
                      className={`editable-cell ${editingCell?.id === practice.id && editingCell?.field === 'title' ? 'editing' : ''}`}
                      onClick={() => startEditing(practice, 'title')}
                      data-id={practice.id}
                      data-field="title"
                    >
                      {practice.kinescope_id && (
                        <MdPlayCircleOutline
                          size={24}
                          style={{ 
                            cursor: 'pointer', 
                            color: '#1976d2', 
                            marginRight: '8px',
                            verticalAlign: 'middle',
                          }}
                          title="Смотреть видео"
                          onClick={(e) => {
                            e.stopPropagation(); // Предотвращаем открытие редактирования при клике на иконку
                            handleVideoPreview(e, practice);
                          }}
                        />
                      )}
                      {editingCell?.id === practice.id && editingCell?.field === 'title' ? (
                        <input 
                          value={editValue.toString()} 
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveInlineEdit}
                          onKeyDown={handleEditKeyDown}
                          autoFocus
                        />
                      ) : (
                        practice.title
                      )}
                    </td>
                    <td>{practice.content_types?.name || '-'}</td>
                    <td 
                      className={`editable-cell ${editingCell?.id === practice.id && editingCell?.field === 'category_id' ? 'editing' : ''}`}
                      onClick={() => startEditing(practice, 'category_id')}
                      data-id={practice.id}
                      data-field="category_id"
                    >
                      {editingCell?.id === practice.id && editingCell?.field === 'category_id' ? (
                        <select 
                          value={editValue.toString()}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveInlineEdit}
                          onKeyDown={handleEditKeyDown}
                          className="inline-select"
                          autoFocus
                        >
                          <option value="">—</option>
                          {categories && categories.length > 0 ? (
                            categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))
                          ) : (
                            <option disabled>Загрузка категорий...</option>
                          )}
                        </select>
                      ) : (
                        practice.categories?.name || '-'
                      )}
                    </td>
                    <td 
                      style={{ cursor: 'default' }}
                      data-id={practice.id}
                      data-field="duration"
                    >
                      {practice.duration ? formatTimeFromSeconds(practice.duration) : '-'}
                    </td>
                    <td>
                      {practice.thumbnail_url ? (
                        <img src={practice.thumbnail_url} alt="thumbnail" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <span style={{ color: '#aaa' }}>—</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="action-btn edit-btn" 
                        onClick={(e) => handleEditClick(e, practice)}
                        style={{
                          padding: '8px 12px',
                          margin: '2px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Изменить
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => console.log('Клик по кнопке "Удалить" практику:', practice.title)}
                        style={{
                          padding: '8px 12px',
                          margin: '2px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-table">Нет доступных практик</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Модалка для редактирования практики
const EditPracticeModal: React.FC<{
  practice: any;
  categories: any[];
  contentTypes: any[];
  onClose: () => void;
  onSave: (form: any) => void;
  saving: boolean;
  error: string | null;
}> = ({ practice, categories, contentTypes, onClose, onSave, saving, error }) => {
  console.log('EditPracticeModal рендеринг, форма:', practice);
  const [form, setForm] = useState<any>({ ...practice });
  const [thumbPreview, setThumbPreview] = useState<string>(practice.thumbnail_url || '');
  const [audioPreview, setAudioPreview] = useState<string>(practice.audio_file_path || '');
  const [uploading, setUploading] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(false);
  
  // Добавляем debug чтобы видеть данные
  useEffect(() => {
    console.log('Категории в модалке:', categories);
    console.log('Текущая категория практики:', form.category_id);
  }, [categories, form.category_id]);

  // Функция для получения длительности видео из Kinescope API
  const fetchVideoDuration = async () => {
    if (!form.kinescope_id) {
      alert('Для получения длительности необходимо указать Kinescope ID');
      return;
    }
    
    setLoadingDuration(true);
    try {
      const metadata = await getKinescopeVideoMetadata(form.kinescope_id);
      if (metadata && metadata.duration) {
        setForm((f: any) => ({ ...f, duration: metadata.duration }));
        alert(`Длительность успешно получена: ${formatTimeFromSeconds(metadata.duration)}`);
      } else {
        alert('Не удалось получить информацию о длительности видео');
      }
    } catch (error) {
      console.error('Ошибка при получении длительности:', error);
      alert('Произошла ошибка при получении длительности видео');
    } finally {
      setLoadingDuration(false);
    }
  };

  // Обработка выбора файла обложки
  const handleThumbChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleThumbChange вызван');
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      console.log('Начинаем загрузку файла обложки:', file.name);
      const url = await uploadFileToR2(file, 'image');
      console.log('Файл обложки загружен, URL:', url);
      setForm((f: any) => ({ ...f, thumbnail_url: url }));
      setThumbPreview(url);
    } catch (e) {
      console.error('Ошибка загрузки обложки:', e);
      alert('Ошибка загрузки обложки');
    } finally {
      setUploading(false);
    }
  };
  
  // Обработка выбора аудиофайла
  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleAudioChange вызван');
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      console.log('Начинаем загрузку аудиофайла:', file.name);
      const url = await uploadFileToR2(file, 'audio');
      console.log('Аудиофайл загружен, URL:', url);
      setForm((f: any) => ({ ...f, audio_file_path: url }));
      setAudioPreview(url);
    } catch (e) {
      console.error('Ошибка загрузки аудиофайла:', e);
      alert('Ошибка загрузки аудиофайла');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    console.log('Форма отправлена');
    e.preventDefault();
    onSave(form);
  };

  const handleCloseModal = () => {
    console.log('Закрытие модального окна редактирования');
    onClose();
  };

  return (
    <div 
      className="admin-modal-backdrop" 
      onClick={handleCloseModal}
    >
      <div 
        className="admin-modal"
        onClick={(e) => {
          console.log('Клик внутри модалки редактирования (stopPropagation)');
          e.stopPropagation();
        }}
      >
        <h3>Редактировать практику</h3>
        <button 
          className="admin-modal-close" 
          onClick={() => onClose()}
        >✕</button>
        
        <form
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>Название</label>
            <input 
              className="admin-input" 
              value={form.title || ''} 
              onChange={e => {
                console.log('Изменение названия:', e.target.value);
                setForm((f: any) => ({ ...f, title: e.target.value }));
              }} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Подзаголовок</label>
            <input 
              className="admin-input" 
              value={form.subtitle || ''} 
              onChange={e => {
                console.log('Изменение подзаголовка');
                setForm((f: any) => ({ ...f, subtitle: e.target.value }));
              }} 
            />
          </div>
          
          <div className="form-group">
            <label>Описание</label>
            <textarea 
              className="admin-input" 
              value={form.description || ''} 
              onChange={e => {
                console.log('Изменение описания');
                setForm((f: any) => ({ ...f, description: e.target.value }));
              }} 
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Длительность</label>
              <TimeInput 
                totalSeconds={form.duration || 0}
                onChange={(seconds) => {
                  console.log('Изменение длительности:', seconds, 'секунд');
                  setForm((f: any) => ({ ...f, duration: seconds }));
                }}
              />
            </div>
            
            <div className="form-group">
              <label>Порядок отображения</label>
              <input 
                className="admin-input" 
                type="number" 
                value={form.display_order || ''} 
                onChange={e => {
                  console.log('Изменение порядка отображения:', e.target.value);
                  setForm((f: any) => ({ ...f, display_order: Number(e.target.value) }));
                }} 
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Тип контента</label>
              <select 
                className="admin-input" 
                value={form.content_type_id || ''} 
                onChange={e => {
                  console.log('Изменение типа контента:', e.target.value);
                  setForm((f: any) => ({ ...f, content_type_id: e.target.value }));
                }}
              >
                <option value="">—</option>
                {contentTypes.map((ct: any) => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Категория</label>
              <select 
                className="admin-input" 
                value={form.category_id || ''} 
                onChange={e => {
                  console.log('Изменение категории:', e.target.value);
                  setForm((f: any) => ({ ...f, category_id: e.target.value }));
                }}
              >
                <option value="">—</option>
                {categories && categories.length > 0 ? (
                  categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                ) : (
                  <option disabled>Загрузка категорий...</option>
                )}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Kinescope ID</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                className="admin-input" 
                style={{ flex: 1 }}
                value={form.kinescope_id || ''} 
                onChange={e => {
                  console.log('Изменение Kinescope ID:', e.target.value);
                  setForm((f: any) => ({ ...f, kinescope_id: e.target.value }));
                }} 
              />
              <button 
                type="button" 
                className="admin-button" 
                onClick={fetchVideoDuration}
                disabled={loadingDuration || !form.kinescope_id}
                style={{ whiteSpace: 'nowrap' }}
              >
                {loadingDuration ? 'Загрузка...' : 'Получить длительность'}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Обложка</label>
            <input 
              className="admin-input file-input" 
              type="file" 
              accept="image/*" 
              onChange={handleThumbChange} 
              disabled={uploading} 
            />
            {thumbPreview && (
              <div className="preview-container">
                <img src={thumbPreview} alt="preview" className="thumbnail-preview" />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>Аудиофайл</label>
            <input 
              className="admin-input file-input" 
              type="file" 
              accept="audio/*" 
              onChange={handleAudioChange} 
              disabled={uploading} 
            />
            {audioPreview && (
              <div className="preview-container">
                <audio src={audioPreview} controls className="audio-preview" />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>Сложность</label>
            <input 
              className="admin-input" 
              value={form.difficulty_level || ''} 
              onChange={e => {
                console.log('Изменение сложности:', e.target.value);
                setForm((f: any) => ({ ...f, difficulty_level: e.target.value }));
              }} 
            />
          </div>
          
          <div className="form-row checkbox-group">
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={!!form.is_premium} 
                  onChange={e => {
                    console.log('Изменение статуса премиум:', e.target.checked);
                    setForm((f: any) => ({ ...f, is_premium: e.target.checked }));
                  }} 
                />
                Премиум контент
              </label>
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={!!form.is_featured} 
                  onChange={e => {
                    console.log('Изменение статуса рекомендуемое:', e.target.checked);
                    setForm((f: any) => ({ ...f, is_featured: e.target.checked }));
                  }} 
                />
                Рекомендуемое
              </label>
            </div>
          </div>
          
          {error && <div className="admin-error">{error}</div>}
          
          <div className="form-actions">
            <button 
              className="admin-button" 
              type="submit" 
              disabled={saving || uploading}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button 
              className="action-btn delete-btn" 
              type="button" 
              onClick={() => onClose()} 
              disabled={saving || uploading}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Полностью переработанный компонент CategoriesManager, аналогичный UsersManager
const CategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Новая категория
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  
  // Редактируемая категория
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Загрузка категорий
  const fetchCategories = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        console.error('ОШИБКА: Supabase клиент не инициализирован');
        return;
      }
      
      console.log('Попытка загрузки категорий прямым запросом с логами...');
      
      // Попробуем выполнить запрос и посмотреть на данные в консоли
      const response = await supabase
        .from('categories')
        .select('*');
      
      // Логируем весь ответ для диагностики
      console.log('ДИАГНОСТИКА SUPABASE ОТВЕТА:', response);
      
      if (response.error) {
        console.error('ОШИБКА ЗАПРОСА В SUPABASE:', response.error);
        throw response.error;
      }
      
      // Проверяем, есть ли данные вообще
      if (!response.data) {
        console.log('ПУСТОЙ ОТВЕТ ОТ SUPABASE, НЕТ ДАННЫХ');
      } else {
        console.log('ПОЛУЧЕНЫ ДАННЫЕ ОТ SUPABASE:', response.data.length, 'категорий');
        console.log('ДАННЫЕ КАТЕГОРИЙ:', JSON.stringify(response.data, null, 2));
      }
      
      setCategories(response.data || []);
    } catch (error) {
      console.error('КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАГРУЗКЕ КАТЕГОРИЙ:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCategories();
  }, []);

  // Добавление категории
  const handleAddCategory = async () => {
    if (!newName || !newSlug) {
      alert('Введите название и slug для новой категории');
      return;
    }
    
    try {
      setAddLoading(true);
      setUpdateError(null);
      
      if (!supabase) {
        throw new Error('Supabase клиент не доступен');
      }
      
      // Проверка на уникальность slug
      const { data: existingCategory, error: checkError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', newSlug)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingCategory) {
        throw new Error(`Категория с slug "${newSlug}" уже существует`);
      }
      
      // Находим максимальный display_order для новой категории
      const { data: maxOrderData } = await supabase
        .from('categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();
      
      const newOrder = maxOrderData?.display_order ? maxOrderData.display_order + 1 : 1;
      
      // Добавляем новую категорию
      const { error } = await supabase
        .from('categories')
        .insert([{ 
          name: newName,
          slug: newSlug,
          description: newDescription,
          display_order: newOrder
        }]);
        
      if (error) throw error;
      
      // Очищаем форму
      setNewName('');
      setNewSlug('');
      setNewDescription('');
      
      // Перезагружаем список
      fetchCategories();
      
    } catch (error: any) {
      console.error('Ошибка при добавлении категории:', error);
      setUpdateError(error.message || 'Произошла ошибка при добавлении категории');
    } finally {
      setAddLoading(false);
    }
  };
  
  // Удаление категории
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) {
      return;
    }
    
    try {
      setUpdateLoading(true);
      setUpdateError(null);
      
      if (!supabase) {
        throw new Error('Supabase клиент не доступен');
      }
      
      // Проверяем, используется ли эта категория в практиках
      const { data: linkedPractices, error: checkError } = await supabase
        .from('contents')
        .select('id, title')
        .eq('category_id', id);
      
      if (checkError) throw checkError;
      
      if (linkedPractices && linkedPractices.length > 0) {
        const practiceNames = linkedPractices.map(p => p.title).join(', ');
        throw new Error(`Эта категория используется в практиках: ${practiceNames}`);
      }
      
      // Удаляем категорию
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Обновляем список категорий
      fetchCategories();
      
    } catch (error: any) {
      console.error('Ошибка при удалении категории:', error);
      setUpdateError(error.message || 'Произошла ошибка при удалении категории');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Начать редактирование категории
  const startEditing = (category: any) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditDescription(category.description || '');
  };
  
  // Отмена редактирования
  const cancelEditing = () => {
    setEditingCategory(null);
    setEditName('');
    setEditSlug('');
    setEditDescription('');
  };
  
  // Сохранение отредактированной категории
  const saveCategory = async () => {
    if (!editingCategory) return;
    if (!editName || !editSlug) {
      alert('Название и slug обязательны');
      return;
    }
    
    try {
      setUpdateLoading(true);
      setUpdateError(null);
      
      if (!supabase) {
        throw new Error('Supabase клиент не доступен');
      }
      
      // Проверка на уникальность slug, если он изменился
      if (editSlug !== editingCategory.slug) {
        const { data: existingCategory, error: checkError } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', editSlug)
          .neq('id', editingCategory.id)
          .maybeSingle();
        
        if (checkError) throw checkError;
        
        if (existingCategory) {
          throw new Error(`Категория с slug "${editSlug}" уже существует`);
        }
      }
      
      // Обновляем категорию
      const { error } = await supabase
        .from('categories')
        .update({ 
          name: editName,
          slug: editSlug,
          description: editDescription
        })
        .eq('id', editingCategory.id);
        
      if (error) throw error;
      
      // Завершаем редактирование
      cancelEditing();
      
      // Перезагружаем список
      fetchCategories();
      
    } catch (error: any) {
      console.error('Ошибка при обновлении категории:', error);
      setUpdateError(error.message || 'Произошла ошибка при обновлении категории');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Управление категориями</h2>
        <button 
          className="admin-refresh-btn" 
          onClick={fetchCategories} 
          disabled={loading}
        >
          <MdRefresh size={18} />
          Обновить
        </button>
      </div>
      
      {/* Форма добавления категории */}
      <div className="category-add-form">
        <h3>Добавить категорию</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input 
            className="admin-input" 
            placeholder="Название" 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
          />
          <input 
            className="admin-input" 
            placeholder="Slug" 
            value={newSlug} 
            onChange={e => setNewSlug(e.target.value)} 
          />
          <input 
            className="admin-input" 
            placeholder="Описание" 
            value={newDescription} 
            onChange={e => setNewDescription(e.target.value)} 
          />
          <button 
            className="admin-button" 
            onClick={handleAddCategory} 
            disabled={addLoading || !newName || !newSlug}
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
        <div className="admin-loading">Загрузка категорий...</div>
      ) : (
        <div className="categories-table">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Slug</th>
                <th>Описание</th>
                <th>Порядок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {editingCategory?.id === category.id ? (
                        <input 
                          className="admin-input" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          style={{ width: '100%' }}
                        />
                      ) : (
                        category.name
                      )}
                    </td>
                    <td>
                      {editingCategory?.id === category.id ? (
                        <input 
                          className="admin-input" 
                          value={editSlug} 
                          onChange={e => setEditSlug(e.target.value)} 
                          style={{ width: '100%' }}
                        />
                      ) : (
                        category.slug
                      )}
                    </td>
                    <td>
                      {editingCategory?.id === category.id ? (
                        <input 
                          className="admin-input" 
                          value={editDescription} 
                          onChange={e => setEditDescription(e.target.value)} 
                          style={{ width: '100%' }}
                        />
                      ) : (
                        category.description || '-'
                      )}
                    </td>
                    <td>{category.display_order || '-'}</td>
                    <td className="actions-cell">
                      {editingCategory?.id === category.id ? (
                        <>
                          <button 
                            className="action-btn edit-btn" 
                            onClick={saveCategory}
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
                            onClick={() => startEditing(category)}
                            disabled={updateLoading || !!editingCategory}
                          >
                            Изменить
                          </button>
                          <button 
                            className="action-btn delete-btn" 
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={updateLoading || !!editingCategory}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-table">Нет доступных категорий</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Компонент для управления квизом (обновлённый)
const QuizManager: React.FC = () => {
  const [quizSteps, setQuizSteps] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Состояние для добавления шага
  const [stepTitle, setStepTitle] = useState('');
  const [stepType, setStepType] = useState('');
  const [stepOrder, setStepOrder] = useState(0);
  const [addStepLoading, setAddStepLoading] = useState(false);

  // Состояние для редактирования шага
  const [editingStep, setEditingStep] = useState<any | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepType, setEditStepType] = useState('');
  const [editStepOrder, setEditStepOrder] = useState(0);
  
  // Состояние для выбранного шага и опций
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  
  // Состояние для добавления опции
  const [answerLabel, setAnswerLabel] = useState('');
  const [answerValue, setAnswerValue] = useState('');
  const [answerOrder, setAnswerOrder] = useState(0);
  const [addAnswerLoading, setAddAnswerLoading] = useState(false);
  
  // Состояние для редактирования опции
  const [editingAnswer, setEditingAnswer] = useState<any | null>(null);
  const [editAnswerLabel, setEditAnswerLabel] = useState('');
  const [editAnswerValue, setEditAnswerValue] = useState('');
  const [editAnswerOrder, setEditAnswerOrder] = useState(0);

  // Загрузка данных квиза
  const fetchQuizData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      console.log('Загрузка данных квиза...');
      
      // Загружаем шаги
      const { data: steps, error: stepsError } = await supabase
        .from('quiz_steps')
        .select('*')
        .order('order');
        
      if (stepsError) {
        console.error('Ошибка при загрузке шагов квиза:', stepsError);
        throw stepsError;
      }
      
      console.log('Загружено шагов квиза:', steps?.length);
      setQuizSteps(steps || []);
      
      // Загружаем опции ответов
      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .order('order');
        
      if (answersError) {
        console.error('Ошибка при загрузке опций квиза:', answersError);
        throw answersError;
      }
      
      console.log('Загружено опций квиза:', answers?.length);
      setQuizAnswers(answers || []);
      
      // Если есть шаги, автоматически выбираем первый
      if (steps && steps.length > 0 && !selectedStepId) {
        setSelectedStepId(steps[0].id);
      }
      
    } catch (error: any) {
      console.error('Ошибка при загрузке данных квиза:', error);
      setErrorMessage(error.message || 'Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при монтировании
  useEffect(() => {
    fetchQuizData();
  }, []);

  // Добавление шага квиза
  const handleAddStep = async () => {
    if (!stepTitle || !stepType) {
      alert('Введите заголовок и тип шага');
      return;
    }
    
    setAddStepLoading(true);
    setErrorMessage(null);
    
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      const { error } = await supabase
        .from('quiz_steps')
        .insert([{ 
          title: stepTitle, 
          type: stepType, 
          order: stepOrder, 
          is_active: true 
        }]);
        
      if (error) throw error;
      
      // Очищаем форму
      setStepTitle('');
      setStepType('');
      setStepOrder(0);
      
      // Перезагружаем данные
      fetchQuizData();
      
    } catch (error: any) {
      console.error('Ошибка при добавлении шага:', error);
      setErrorMessage(error.message || 'Произошла ошибка при добавлении шага');
    } finally {
      setAddStepLoading(false);
    }
  };

  // Обновление шага
  const handleUpdateStep = async () => {
    if (!editingStep) return;
    if (!editStepTitle || !editStepType) {
      alert('Заголовок и тип шага обязательны');
      return;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      const { error } = await supabase
        .from('quiz_steps')
        .update({ 
          title: editStepTitle, 
          type: editStepType, 
          order: editStepOrder
        })
        .eq('id', editingStep.id);
        
      if (error) throw error;
      
      // Завершаем редактирование
      setEditingStep(null);
      
      // Перезагружаем данные
      fetchQuizData();
      
    } catch (error: any) {
      console.error('Ошибка при обновлении шага:', error);
      setErrorMessage(error.message || 'Произошла ошибка при обновлении шага');
    }
  };

  // Удаление шага
  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот шаг? Все связанные опции также будут удалены.')) {
      return;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      // Сначала удаляем все связанные опции
      const { error: answersError } = await supabase
        .from('quiz_answers')
        .delete()
        .eq('question_id', stepId);
        
      if (answersError) throw answersError;
      
      // Затем удаляем сам шаг
      const { error } = await supabase
        .from('quiz_steps')
        .delete()
        .eq('id', stepId);
        
      if (error) throw error;
      
      // Если удаляемый шаг был выбран, сбрасываем выбор
      if (selectedStepId === stepId) {
        setSelectedStepId(null);
      }
      
      // Перезагружаем данные
      fetchQuizData();
      
    } catch (error: any) {
      console.error('Ошибка при удалении шага:', error);
      setErrorMessage(error.message || 'Произошла ошибка при удалении шага');
    }
  };

  // Добавление опции ответа
  const handleAddAnswer = async () => {
    if (!selectedStepId) {
      alert('Сначала выберите шаг квиза');
      return;
    }
    
    if (!answerLabel || !answerValue) {
      alert('Введите метку и значение опции');
      return;
    }
    
    setAddAnswerLoading(true);
    setErrorMessage(null);
    
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      const { error } = await supabase
        .from('quiz_answers')
        .insert([{ 
          question_id: selectedStepId, 
          label: answerLabel, 
          value: answerValue, 
          order: answerOrder 
        }]);
        
      if (error) throw error;
      
      // Очищаем форму
      setAnswerLabel('');
      setAnswerValue('');
      setAnswerOrder(0);
      
      // Перезагружаем данные
      fetchQuizData();
      
    } catch (error: any) {
      console.error('Ошибка при добавлении опции:', error);
      setErrorMessage(error.message || 'Произошла ошибка при добавлении опции');
    } finally {
      setAddAnswerLoading(false);
    }
  };

  // Обновление опции
  const handleUpdateAnswer = async () => {
    if (!editingAnswer) return;
    if (!editAnswerLabel || !editAnswerValue) {
      alert('Метка и значение опции обязательны');
      return;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      const { error } = await supabase
        .from('quiz_answers')
        .update({ 
          label: editAnswerLabel, 
          value: editAnswerValue, 
          order: editAnswerOrder
        })
        .eq('id', editingAnswer.id);
        
      if (error) throw error;
      
      // Завершаем редактирование
      setEditingAnswer(null);
      
      // Перезагружаем данные
      fetchQuizData();
      
    } catch (error: any) {
      console.error('Ошибка при обновлении опции:', error);
      setErrorMessage(error.message || 'Произошла ошибка при обновлении опции');
    }
  };

  // Удаление опции
  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту опцию?')) {
      return;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }
      
      const { error } = await supabase
        .from('quiz_answers')
        .delete()
        .eq('id', answerId);
        
      if (error) throw error;
      
      // Перезагружаем данные
      fetchQuizData();
      
    } catch (error: any) {
      console.error('Ошибка при удалении опции:', error);
      setErrorMessage(error.message || 'Произошла ошибка при удалении опции');
    }
  };

  // Начать редактирование шага
  const startEditingStep = (step: any) => {
    setEditingStep(step);
    setEditStepTitle(step.title);
    setEditStepType(step.type);
    setEditStepOrder(step.order);
  };

  // Отменить редактирование шага
  const cancelEditingStep = () => {
    setEditingStep(null);
  };

  // Начать редактирование опции
  const startEditingAnswer = (answer: any) => {
    setEditingAnswer(answer);
    setEditAnswerLabel(answer.label);
    setEditAnswerValue(answer.value);
    setEditAnswerOrder(answer.order);
  };

  // Отменить редактирование опции
  const cancelEditingAnswer = () => {
    setEditingAnswer(null);
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Настройки квиза (шаги и опции из Supabase)</h2>
        <button 
          className="admin-refresh-btn" 
          onClick={fetchQuizData} 
          disabled={loading}
        >
          <MdRefresh size={18} />
          Обновить
        </button>
      </div>
      
      {errorMessage && (
        <div className="admin-error admin-update-error">
          {errorMessage}
        </div>
      )}
      
      {loading ? (
        <div className="admin-loading">Загрузка шагов и опций...</div>
      ) : (
        <div className="quiz-manager-container">
          <div className="quiz-manager-columns">
            {/* Левая колонка - шаги квиза */}
            <div className="quiz-steps-column">
              <h3>Шаги квиза</h3>
              
              {/* Таблица шагов */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Порядок</th>
                      <th>Заголовок</th>
                      <th>Тип</th>
                      <th>Активен</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizSteps.length > 0 ? (
                      quizSteps.map((step) => (
                        <tr 
                          key={step.id} 
                          className={`${selectedStepId === step.id ? 'selected-row' : ''} ${editingStep?.id === step.id ? 'editing-row' : ''}`}
                        >
                          <td>
                            {editingStep?.id === step.id ? (
                              <input 
                                type="number"
                                className="admin-input inline-edit"
                                value={editStepOrder}
                                onChange={(e) => setEditStepOrder(Number(e.target.value))}
                                style={{ color: '#333', backgroundColor: '#f0f0f0', width: '60px' }}
                              />
                            ) : (
                              step.order
                            )}
                          </td>
                          <td>
                            {editingStep?.id === step.id ? (
                              <input 
                                className="admin-input inline-edit"
                                value={editStepTitle}
                                onChange={(e) => setEditStepTitle(e.target.value)}
                                style={{ color: '#333', backgroundColor: '#f0f0f0', width: '100%' }}
                              />
                            ) : (
                              step.title
                            )}
                          </td>
                          <td>
                            {editingStep?.id === step.id ? (
                              <input 
                                className="admin-input inline-edit"
                                value={editStepType}
                                onChange={(e) => setEditStepType(e.target.value)}
                                style={{ color: '#333', backgroundColor: '#f0f0f0', width: '100%' }}
                              />
                            ) : (
                              step.type
                            )}
                          </td>
                          <td>{step.is_active ? 'Да' : 'Нет'}</td>
                          <td className="actions-cell">
                            {editingStep?.id === step.id ? (
                              <>
                                <button 
                                  className="action-btn edit-btn"
                                  onClick={handleUpdateStep}
                                >
                                  Сохранить
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={cancelEditingStep}
                                >
                                  Отмена
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="action-btn view-btn"
                                  onClick={() => setSelectedStepId(step.id)}
                                >
                                  Опции
                                </button>
                                <button 
                                  className="action-btn edit-btn"
                                  onClick={() => startEditingStep(step)}
                                  disabled={!!editingStep}
                                >
                                  Изменить
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={() => handleDeleteStep(step.id)}
                                  disabled={!!editingStep}
                                >
                                  Удалить
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-table">Нет доступных шагов</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Форма добавления шага */}
              <div className="admin-form">
                <h4>Добавить шаг</h4>
                <div className="form-row">
                  <input 
                    className="admin-input"
                    placeholder="Заголовок" 
                    value={stepTitle} 
                    onChange={(e) => setStepTitle(e.target.value)}
                    style={{ color: '#333', backgroundColor: '#f0f0f0' }}
                  />
                  <input 
                    className="admin-input"
                    placeholder="Тип (type)" 
                    value={stepType} 
                    onChange={(e) => setStepType(e.target.value)} 
                    style={{ color: '#333', backgroundColor: '#f0f0f0' }}
                  />
                  <input 
                    className="admin-input"
                    type="number" 
                    placeholder="Порядок" 
                    value={stepOrder} 
                    onChange={(e) => setStepOrder(Number(e.target.value))} 
                    style={{ color: '#333', backgroundColor: '#f0f0f0', width: '80px' }}
                  />
                  <button 
                    className="admin-button" 
                    onClick={handleAddStep} 
                    disabled={addStepLoading || !stepTitle || !stepType}
                  >
                    {addStepLoading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Правая колонка - опции выбранного шага */}
            <div className="quiz-answers-column">
              <h3>Опции для шага</h3>
              
              {selectedStepId ? (
                <>
                  {/* Таблица опций */}
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Порядок</th>
                          <th>Метка</th>
                          <th>Значение</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizAnswers.filter(a => a.question_id === selectedStepId).length > 0 ? (
                          quizAnswers
                            .filter(a => a.question_id === selectedStepId)
                            .map((answer) => (
                              <tr 
                                key={answer.id}
                                className={editingAnswer?.id === answer.id ? 'editing-row' : ''}
                              >
                                <td>
                                  {editingAnswer?.id === answer.id ? (
                                    <input 
                                      type="number"
                                      className="admin-input inline-edit"
                                      value={editAnswerOrder}
                                      onChange={(e) => setEditAnswerOrder(Number(e.target.value))}
                                      style={{ color: '#333', backgroundColor: '#f0f0f0', width: '60px' }}
                                    />
                                  ) : (
                                    answer.order
                                  )}
                                </td>
                                <td>
                                  {editingAnswer?.id === answer.id ? (
                                    <input 
                                      className="admin-input inline-edit"
                                      value={editAnswerLabel}
                                      onChange={(e) => setEditAnswerLabel(e.target.value)}
                                      style={{ color: '#333', backgroundColor: '#f0f0f0', width: '100%' }}
                                    />
                                  ) : (
                                    answer.label
                                  )}
                                </td>
                                <td>
                                  {editingAnswer?.id === answer.id ? (
                                    <input 
                                      className="admin-input inline-edit"
                                      value={editAnswerValue}
                                      onChange={(e) => setEditAnswerValue(e.target.value)}
                                      style={{ color: '#333', backgroundColor: '#f0f0f0', width: '100%' }}
                                    />
                                  ) : (
                                    answer.value
                                  )}
                                </td>
                                <td className="actions-cell">
                                  {editingAnswer?.id === answer.id ? (
                                    <>
                                      <button 
                                        className="action-btn edit-btn"
                                        onClick={handleUpdateAnswer}
                                      >
                                        Сохранить
                                      </button>
                                      <button 
                                        className="action-btn delete-btn"
                                        onClick={cancelEditingAnswer}
                                      >
                                        Отмена
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        className="action-btn edit-btn"
                                        onClick={() => startEditingAnswer(answer)}
                                        disabled={!!editingAnswer}
                                      >
                                        Изменить
                                      </button>
                                      <button 
                                        className="action-btn delete-btn"
                                        onClick={() => handleDeleteAnswer(answer.id)}
                                        disabled={!!editingAnswer}
                                      >
                                        Удалить
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="empty-table">Нет опций для этого шага</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Форма добавления опции */}
                  <div className="admin-form">
                    <h4>Добавить опцию</h4>
                    <div className="form-row">
                      <input 
                        className="admin-input"
                        placeholder="Метка" 
                        value={answerLabel} 
                        onChange={(e) => setAnswerLabel(e.target.value)} 
                        style={{ color: '#333', backgroundColor: '#f0f0f0' }}
                      />
                      <input 
                        className="admin-input"
                        placeholder="Значение" 
                        value={answerValue} 
                        onChange={(e) => setAnswerValue(e.target.value)} 
                        style={{ color: '#333', backgroundColor: '#f0f0f0' }}
                      />
                      <input 
                        className="admin-input"
                        type="number" 
                        placeholder="Порядок" 
                        value={answerOrder} 
                        onChange={(e) => setAnswerOrder(Number(e.target.value))} 
                        style={{ color: '#333', backgroundColor: '#f0f0f0', width: '80px' }}
                      />
                      <button 
                        className="admin-button" 
                        onClick={handleAddAnswer} 
                        disabled={addAnswerLoading || !answerLabel || !answerValue}
                      >
                        {addAnswerLoading ? 'Добавление...' : 'Добавить'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-selection-message">
                  Выберите шаг для просмотра и добавления опций
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Добавляем стили для админки */}
      <style>{`
        .quiz-manager-container {
          margin-top: 20px;
        }
        
        .quiz-manager-columns {
          display: flex;
          gap: 30px;
        }
        
        .quiz-steps-column, .quiz-answers-column {
          flex: 1;
        }
        
        .admin-table-container {
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 20px;
          background-color: rgba(40, 40, 55, 0.5);
          border-radius: 8px;
        }
        
        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .admin-table th,
        .admin-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .admin-table th {
          background-color: rgba(30, 30, 46, 0.5);
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .admin-table tbody tr:hover {
          background-color: rgba(50, 50, 70, 0.3);
        }
        
        .selected-row {
          background-color: rgba(25, 118, 210, 0.2) !important;
        }
        
        .editing-row {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }
        
        .admin-form {
          background-color: rgba(40, 40, 55, 0.5);
          padding: 15px;
          border-radius: 8px;
        }
        
        .form-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .admin-input {
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background-color: #f0f0f0 !important;
          color: #333 !important;
        }
        
        .admin-input::placeholder {
          color: #777;
        }
        
        .inline-edit {
          margin: 0;
          padding: 4px 8px;
        }
        
        .empty-selection-message {
          padding: 30px;
          text-align: center;
          background-color: rgba(40, 40, 55, 0.5);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .empty-table {
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
          padding: 20px 0;
        }
        
        .actions-cell {
          white-space: nowrap;
        }
        
        .action-btn {
          padding: 5px 10px;
          margin: 0 3px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          border: none;
        }
        
        .view-btn {
          background-color: rgba(33, 150, 243, 0.7);
          color: white;
        }
        
        .edit-btn {
          background-color: rgba(255, 193, 7, 0.7);
          color: black;
        }
        
        .delete-btn {
          background-color: rgba(244, 67, 54, 0.7);
          color: white;
        }
        
        .admin-button {
          padding: 8px 16px;
          background-color: rgba(63, 81, 181, 0.8);
          color: white;
          border: none;
          border-radius: the 4px;
          cursor: pointer;
        }
        
        .admin-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

// Компонент для управления пользователями
const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Загрузка пользователей
  const fetchUsers = async () => {
    try {
      setLoading(true);
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, []);

  // Обработчик изменения прав администратора
  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdateLoading(true);
      setUpdateError(null);
      
      if (!supabase) {
        throw new Error('Supabase клиент не доступен');
      }
      
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Обновляем локальный массив пользователей
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, is_admin: !currentStatus } 
            : user
        )
      );
    } catch (error: any) {
      console.error('Ошибка при обновлении статуса администратора:', error);
      setUpdateError(error.message || 'Произошла ошибка при обновлении');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Управление пользователями</h2>
        <button 
          className="admin-refresh-btn" 
          onClick={fetchUsers} 
          disabled={loading}
        >
          Обновить
        </button>
      </div>
      
      {updateError && (
        <div className="admin-error admin-update-error">
          {updateError}
        </div>
      )}
      
      {loading ? (
        <div className="admin-loading">Загрузка пользователей...</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>ID в Telegram</th>
                <th>Имя</th>
                <th>Username</th>
                <th>Дата регистрации</th>
                <th>Последний вход</th>
                <th>Админ</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.telegram_id}</td>
                    <td>{`${user.first_name || ''} ${user.last_name || ''}`}</td>
                    <td>{user.username || '-'}</td>
                    <td>{new Date(user.created_at).toLocaleString()}</td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                    <td>
                      <span className={`admin-status ${user.is_admin ? 'admin-yes' : 'admin-no'}`}>
                        {user.is_admin ? 'Да' : 'Нет'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className={`action-btn ${user.is_admin ? 'delete-btn' : 'edit-btn'}`}
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        disabled={updateLoading}
                      >
                        {user.is_admin ? 'Снять права' : 'Сделать админом'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-table">Нет зарегистрированных пользователей</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPage; 