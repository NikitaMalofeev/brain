// Типы данных для таблицы users в Supabase
export interface SupabaseUser {
  id: string; // uuid, primary key
  telegram_id: number; // bigint, unique
  first_name?: string | null; // text, nullable
  last_name?: string | null; // text, nullable
  username?: string | null; // text, nullable
  photo_url?: string | null; // text, nullable
  auth_date?: number | null; // bigint, nullable (Unix timestamp from Telegram)
  hash?: string | null; // text, nullable (hash from Telegram for validation)
  created_at?: string | null; // timestamptz, default now()
  updated_at?: string | null; // timestamptz, default now()
  last_login?: string | null; // timestamptz, default now()
  role?: 'user' | 'curator' | 'admin' | 'guest'; // enum user_role, default 'user' - роль пользователя
  access_till?: string | null; // timestamptz, nullable - дата окончания доступа
  total_points?: number | null; // integer, default 0 - общее количество очков пользователя
  lives_remaining?: number | null; // integer, default 3 - количество оставшихся жизней
  onboarding_completed?: boolean | null; // boolean, default false - завершен ли онбординг
}

// Тип для данных пользователя из Telegram initData (только нужные поля)
export interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// Тип для таблицы webhook_logs
export interface WebhookLog {
  id: string; // uuid, primary key
  endpoint: string; // text, not null - эндпоинт вебхука
  request_method: string; // text, not null - HTTP метод запроса
  request_headers?: Record<string, any> | null; // jsonb, nullable - заголовки запроса
  request_body?: Record<string, any> | null; // jsonb, nullable - тело запроса
  response_status?: number | null; // integer, nullable - статус код ответа
  response_body?: string | null; // text, nullable - тело ответа
  created_at: string; // timestamptz, not null, default now() - дата создания записи
}

// Supabase Database Types для Brain Programming
// Автоматически обновлено для новой блочной структуры уроков

// Базовые типы для общих полей
export interface TimestampFields {
  created_at?: string;
  updated_at?: string;
}

// Пользователи из Telegram
export interface User extends TimestampFields {
  id: string; // UUID
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
  last_login?: string;
  total_points: number;
  lives_remaining: number;
}

// Курсы
export interface Course extends TimestampFields {
  id: string; // UUID
  title: string;
  subtitle?: string;
}

// Этапы курса
export interface CourseStage extends TimestampFields {
  id: number;
  course_id: string; // FK к Course
  stream_module_id?: string; // FK к stream_modules (новая архитектура)
  name: string;
  description?: string;
  order_num: number;
  unlock_condition_type?: string;
  unlock_condition_value?: string;
  is_unlocked?: boolean; // Разблокирована ли ступень
  cover_image_path?: string; // Путь к файлу обложки ступени в CloudFlare R2
}

// Уроки (упрощенные, без полей сдачи)
export interface Lesson extends TimestampFields {
  id: number;
  stage_id?: number | null; // FK к CourseStage (DEPRECATED - будет удалено)
  stream_module_id?: string | null; // FK к StreamModule (новая архитектура - прямая связь)
  stream_id?: string; // FK к Stream (для копирования)
  name: string;
  description?: string;
  order_num: number;
  cover_image_path?: string; // Путь к файлу обложки (консистентно со ступенями)
  has_assignment?: boolean; // Есть ли домашнее задание
  estimated_duration_minutes?: number;
  open_at?: string; // Дата и время открытия урока
  deadline_at?: string; // Дедлайн сдачи задания
  open_day_offset?: number | null; // Смещение в днях от открытия модуля
  deadline_day_offset?: number | null; // Смещение дедлайна в днях от открытия модуля
}

// Возможные типы блоков урока
export type BlockType =
  | 'text'      // Текстовый блок
  | 'video'     // Видео (Kinescope)
  | 'audio'     // Аудио (CloudFlare R2)
  | 'image'     // Изображение
  | 'pdf'       // PDF файл
  | 'material'; // Ссылка на материал из библиотеки

// Структура для данных аудио волны
export interface AudioWaveformData {
  peaks: number[]; // Массив пиков волны (0-1)
  duration: number; // Длительность в секундах
  sampleRate?: number; // Частота дискретизации
}

// Структура для audio_data в meta_json
export interface AudioMetadata {
  audio_data?: AudioWaveformData;
  // Другие метаданные аудио при необходимости
}

export interface LessonBlock extends TimestampFields {
  id: number;
  lesson_id: number; // FK к Lesson
  order_num: number;
  title?: string; // Заголовок блока, например "Задание 1"
  block_type: BlockType;
  content_text?: string; // Для text-блоков и assignment_instruction
  content_url?: string; // Для файлов/медиа
  material_id?: string; // Для material-блоков - ссылка на материал
  technique_id?: string; // ID техники привязанной к блоку (показывается при совпадении дней)
  meta_json?: Record<string, any> & AudioMetadata; // Дополнительные поля с типизацией для аудио
}

// Задания внутри урока (новая система)
export interface Assignment extends TimestampFields {
  id: number;
  lesson_id: number; // FK к Lesson
  order_num: number;
  title: string;
  description?: string;
}

// Черновики заданий с автосохранением
export interface AssignmentDraft {
  id: string; // UUID
  user_id: string; // FK к User
  assignment_id: number; // FK к Assignment
  draft_text?: string;
  updated_at: string;
}

// Обратная связь по уроку в целом (от куратора)
export interface LessonFeedback extends TimestampFields {
  id: string; // UUID
  user_id: string; // FK к User
  lesson_id: number; // FK к Lesson
  curator_id: string; // FK к User (куратор)
  feedback_text: string;
}

// Сдачи заданий
export type SubmissionStatus = 'submitted' | 'pending_review' | 'approved' | 'rejected';

export interface Submission extends TimestampFields {
  id: number;
  user_id: string; // FK к User
  lesson_id: number; // FK к Lesson (устаревшее, для обратной совместимости)
  assignment_id?: number; // FK к Assignment (новая логика)
  submitted_at?: string;
  first_submitted_at?: string; // Время первоначальной сдачи (для определения опоздания)
  content_text?: string;
  file_url?: string;
  status: SubmissionStatus;
  reviewed_by_curator_id?: string; // FK к User (куратор)
  reviewed_at?: string;
  feedback_text?: string;
  points_awarded: number;
}

// Зачисления на курсы
export interface UserCourseEnrollment extends TimestampFields {
  id: number;
  user_id: string; // FK к User
  course_id: string; // FK к Course
  enrollment_date?: string;
  is_active: boolean;
}

// Прогресс по этапам
export type StageStatus = 'not_started' | 'in_progress' | 'completed';

export interface UserStageProgress extends TimestampFields {
  id: number;
  user_id: string; // FK к User
  stage_id: number; // FK к CourseStage
  status: StageStatus;
  started_at?: string;
  completed_at?: string;
}

// Прогресс по урокам (новая структура)
export interface LessonProgress extends TimestampFields {
  id: number;
  user_id: string; // FK к User
  lesson_id: number; // FK к Lesson
  stream_id?: string | null; // FK к Stream - привязка прогресса к потоку
  started_at?: string;
  completed_at?: string;
  is_completed: boolean;
  submission_id?: number; // FK к Submission, если есть сдача
}



// ============================================================================
// Составные типы для frontend
// ============================================================================

// Урок с его блоками контента
export interface LessonWithBlocks extends Lesson {
  blocks: LessonBlock[];
}

// Прогресс по заданиям урока (из функции get_lesson_assignment_progress)
export interface LessonAssignmentProgress {
  total_assignments: number;
  submitted_assignments: number;
  approved_assignments: number;
}

// Задание с данными о сдаче и черновике
export interface AssignmentWithProgress extends Assignment {
  submission?: Submission;
  draft?: AssignmentDraft;
  is_completed: boolean;
  is_submitted: boolean;
}

// Урок с заданиями и прогрессом
export interface LessonWithAssignments extends Lesson {
  assignments: AssignmentWithProgress[];
  progress: LessonAssignmentProgress;
  feedback?: LessonFeedback;
}

// Прогресс пользователя по уроку с данными о сдаче
export interface LessonProgressWithSubmission extends LessonProgress {
  lesson: Lesson;
  submission?: Submission;
}

// Этап с уроками и прогрессом
export interface StageWithProgress extends CourseStage {
  progress?: UserStageProgress;
  lessons: Lesson[];
  total_lessons: number;
  completed_lessons: number;
}

// Урок с прогрессом пользователя
export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress;
  submission?: Submission;
  blocks: LessonBlock[];
  has_submission?: boolean; // Вычисляемое поле
}

// Данные для главной страницы пользователя
export interface UserDashboardData {
  user: User;
  stages: StageWithProgress[];
  current_stage?: CourseStage;
  total_lessons: number;
  completed_lessons: number;
  next_lesson?: Lesson;
}

// Данные для экрана этапа
export interface StageDetailData {
  stage: CourseStage;
  lessons: LessonWithProgress[];
  user_progress?: UserStageProgress;
}

// Данные для экрана урока
export interface LessonDetailData {
  lesson: LessonWithBlocks;
  progress?: LessonProgress;
  submission?: Submission;
  can_submit_assignment: boolean;
}

// ============================================================================
// Типы для API запросов
// ============================================================================

// Создание/обновление блока контента
export interface CreateLessonBlockRequest {
  lesson_id: number;
  order_num: number;
  title?: string;
  block_type: BlockType;
  content_text?: string;
  content_url?: string;
  material_id?: string;
  meta_json?: Record<string, any>;
}

// Сдача задания
export interface CreateSubmissionRequest {
  lesson_id: number;
  content_text?: string;
  file_url?: string;
}

// Обновление сдачи куратором
export interface UpdateSubmissionRequest {
  status: SubmissionStatus;
  feedback_text?: string;
  points_awarded?: number;
}

// Отметка урока как завершенного
export interface MarkLessonCompletedRequest {
  lesson_id: number;
  user_id?: string; // Опционально, можно брать из auth
}

// Создание/обновление урока (упрощенный)
export interface CreateLessonRequest {
  stage_id: number;
  name: string;
  description?: string;
  order_num: number;
  estimated_duration_minutes?: number;
}

// ============================================================================
// Типы для Supabase функций
// ============================================================================

// Результат функции get_lesson_blocks
export interface GetLessonBlocksResult {
  block_id: number;
  order_num: number;
  title?: string;
  block_type: BlockType;
  content_text?: string;
  content_url?: string;
  meta_json: Record<string, any>;
}

// Результат функции lesson_has_submission
export interface LessonHasSubmissionResult {
  has_submission: boolean;
}

// Результат функции mark_lesson_completed
export interface MarkLessonCompletedResult {
  success: boolean;
}

// ============================================================================
// Типы для представлений (Views)
// ============================================================================

// Представление lesson_with_blocks
export interface LessonWithBlocksView {
  lesson_id: number;
  stage_id: number;
  lesson_name: string;
  description?: string;
  lesson_order: number;
  estimated_duration_minutes?: number;
  block_id?: number;
  block_order?: number;
  block_title?: string;
  block_type?: BlockType;
  content_text?: string;
  content_url?: string;
  meta_json?: Record<string, any>;
  block_created_at?: string;
}

// Представление lesson_progress_view
export interface UserLessonProgressView {
  user_id: string;
  lesson_id: number;
  lesson_name: string;
  stage_id: number;
  started_at?: string;
  completed_at?: string;
  is_completed: boolean;
  submission_id?: number;
  submission_status?: SubmissionStatus;
  points_awarded?: number;
  feedback_text?: string;
  reviewed_at?: string;
  has_submission: boolean; // Вычисляемое поле из VIEW
}

// ============================================================================
// Утилитарные типы
// ============================================================================

// Тип для определения требуемых полей при создании
export type CreateUser = Omit<User, 'id' | 'created_at' | 'updated_at' | 'total_points' | 'lives_remaining'>;
export type CreateCourse = Omit<Course, 'id' | 'created_at' | 'updated_at'>;
export type CreateLesson = Omit<Lesson, 'id' | 'created_at' | 'updated_at'>;
export type CreateLessonBlock = Omit<LessonBlock, 'id' | 'created_at' | 'updated_at'>;
export type CreateSubmission = Omit<Submission, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'points_awarded'>;

// Типы для обновления (все поля опциональны кроме id)
export type UpdateUser = Partial<User> & { id: string };
export type UpdateLesson = Partial<Lesson> & { id: number };
export type UpdateLessonBlock = Partial<LessonBlock> & { id: number };
export type UpdateSubmission = Partial<Submission> & { id: number };

// ============================================================================
// Утилитарные функции для работы с уроками
// ============================================================================

// Проверка есть ли форма сдачи в уроке (через поле has_assignment)
export const lessonHasSubmission = (lesson: Lesson): boolean => {
  return lesson.has_assignment === true;
};

// Helper функция для определения опоздания сдачи
export const isSubmissionLate = (submittedAt: string, deadline?: string, firstSubmittedAt?: string): boolean => {
  if (!deadline) return false;

  // Используем время первоначальной сдачи для определения опоздания (если есть)
  const timeToCheck = firstSubmittedAt || submittedAt;
  const submissionDate = new Date(timeToCheck);
  const deadlineDate = new Date(deadline);

  return submissionDate > deadlineDate;
};

// Функция для получения человекочитаемого статуса с учетом опоздания
export const getSubmissionDisplayStatus = (
  status: SubmissionStatus,
  submittedAt: string,
  deadline?: string,
  firstSubmittedAt?: string
): { text: string; isLate: boolean } => {
  const isLate = isSubmissionLate(submittedAt, deadline, firstSubmittedAt);

  switch (status) {
    case 'submitted':
      return {
        text: isLate ? '⏰ Поздняя сдача' : '📝 Сдано',
        isLate
      };
    case 'pending_review':
      return {
        text: isLate ? '⏰ Поздняя сдача (на проверке)' : '⏳ На проверке',
        isLate
      };
    case 'approved':
      return {
        text: 'Принято',
        isLate
      };
    case 'rejected':
      return {
        text: 'Отклонено',
        isLate
      };
    default:
      return {
        text: status,
        isLate: false
      };
  }
};

// ============================================================================
// Экспорт всех типов базы данных для удобства
// ============================================================================
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: CreateUser;
        Update: Partial<User>;
      };
      courses: {
        Row: Course;
        Insert: CreateCourse;
        Update: Partial<Course>;
      };
      course_stages: {
        Row: CourseStage;
        Insert: Omit<CourseStage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<CourseStage>;
      };
      lessons: {
        Row: Lesson;
        Insert: CreateLesson;
        Update: Partial<Lesson>;
      };
      lesson_blocks: {
        Row: LessonBlock;
        Insert: CreateLessonBlock;
        Update: Partial<LessonBlock>;
      };
      submissions: {
        Row: Submission;
        Insert: CreateSubmission;
        Update: Partial<Submission>;
      };
      user_course_enrollments: {
        Row: UserCourseEnrollment;
        Insert: Omit<UserCourseEnrollment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<UserCourseEnrollment>;
      };
      user_stage_progress: {
        Row: UserStageProgress;
        Insert: Omit<UserStageProgress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<UserStageProgress>;
      };
      lesson_progress: {
        Row: LessonProgress;
        Insert: Omit<LessonProgress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<LessonProgress>;
      };

    };
    Views: {
      lesson_with_blocks: {
        Row: LessonWithBlocksView;
      };
      lesson_progress_view: {
        Row: UserLessonProgressView;
      };
    };
    Functions: {
      get_lesson_blocks: {
        Args: { lesson_id_param: number };
        Returns: GetLessonBlocksResult[];
      };
      lesson_has_submission: {
        Args: { lesson_id_param: number };
        Returns: boolean;
      };
      mark_lesson_completed: {
        Args: { lesson_id_param: number; user_id_param?: string };
        Returns: boolean;
      };
    };
  };
};

// ============================================================================
// Типы для системы техник (аудиопрактик)
// ============================================================================
// МАТЕРИАЛЫ (объединенные materials + techniques)
// ============================================================================

// Статусы материала
export type MaterialStatus = 'free' | 'purchasable' | 'locked';

// Типы условий разблокировки
export type UnlockConditionType =
  | 'after_material'                      // Техника после другой техники
  | 'after_duration'                      // Техника через N дней с регистрации
  | 'requires_purchase_and_material'      // Нужна покупка + доступ к другой технике
  | 'requires_material_with_duration'     // Другая техника + время ожидания
  | null;

// Источник доступа к материалу
export type MaterialAccessSource = 'purchase' | 'tariff' | 'gift' | 'free';

// Значение условия разблокировки
export interface UnlockConditionValue {
  // Для after_material и requires_material_with_duration
  material_id?: string;                   // UUID предыдущего материала
  required_material_id?: string;          // UUID требуемого материала (новый формат)

  // Для условий с временем
  duration_days?: number;                 // Количество дней задержки

  // Для requires_purchase_and_material
  purchase_required?: boolean;            // Требуется оплата
  purchase_price?: number;                // Цена покупки

  // Deprecated (старый формат для обратной совместимости)
  technique_id?: string;                  // Старое название для material_id
}

// Тип материала
export type MaterialType = 'video' | 'audio';

// Материал (объединенная сущность materials + techniques)
export interface Material extends TimestampFields {
  id: string; // UUID
  name: string; // Название материала
  description?: string | null;
  cover_image_path?: string | null; // Путь к обложке в storage
  material_type: MaterialType; // Тип: video или audio
  order_num: number;
  course_id?: string | null; // Привязка к курсу (опционально)
  release_date?: string | null; // Дата релиза

  // Специфичные поля (бывшие techniques)
  audio_url?: string | null; // URL аудиофайла (для audio материалов)
  duration_seconds?: number | null; // Длительность
  status?: MaterialStatus; // Статус доступа
  purchase_url?: string | null; // URL для покупки
  upgrade_tariff_chat_url?: string | null; // URL чата с отделом продаж
  available_from_module?: string | null; // Метка "Доступна с модуля X"
  unlock_condition_type?: UnlockConditionType; // Тип условия разблокировки
  unlock_condition_value?: UnlockConditionValue | null; // Параметры разблокировки
}

// Backwards compatibility: Technique = Material
export type Technique = Material;
export type TechniqueStatus = MaterialStatus;
export type TechniqueAccessSource = MaterialAccessSource;

// Доступ пользователя к материалу
export interface UserMaterialAccess extends TimestampFields {
  id: string; // UUID
  user_id: string; // FK к User
  material_id: string; // FK к Material
  granted_at: string;
  expires_at?: string | null;
  access_source: MaterialAccessSource;
}

// Backwards compatibility
export type UserTechniqueAccess = UserMaterialAccess;

// Результат функции can_user_purchase_material
export interface MaterialPurchaseInfo {
  can_purchase: boolean;
  reason: string;
  unlock_date?: string | null;
  module_name?: string | null; // Название модуля из которого материал
  stream_name?: string | null; // Название потока
}

// Backwards compatibility
export type TechniquePurchaseInfo = MaterialPurchaseInfo;

// Материал с информацией о доступе (результат get_materials_with_access / get_user_techniques_with_schedule)
export interface MaterialWithAccess extends Material {
  has_access: boolean;
  can_purchase: boolean;
  purchase_info: MaterialPurchaseInfo;
  access_granted_at?: string | null;
  access_expires_at?: string | null;
  access_source?: MaterialAccessSource | null;
  // Поля из get_user_techniques_with_schedule для расписания модулей
  unlock_day?: number | null; // День открытия в модуле (unlock_offset_days)
  active_days?: number | null; // Количество дней доступа после разблокировки
  is_unlocked?: boolean; // Открыт ли материал на текущую дату
  module_id?: string | null; // ID модуля
  module_name?: string | null; // Название модуля
  user_access_source?: 'direct' | 'bundle' | 'module' | string | null; // Источник доступа
  user_access_expires_at?: string | null; // Когда истекает доступ
  bundle_id?: string | null; // ID пакета (bundle)
  bundle_name?: string | null; // Название пакета (bundle)
}

// Backwards compatibility
export type TechniqueWithAccess = MaterialWithAccess;

// Типы для создания/обновления материалов
export type CreateMaterial = Omit<Material, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMaterial = Partial<Material> & { id: string };

// Backwards compatibility
export type CreateTechnique = CreateMaterial;
export type UpdateTechnique = UpdateMaterial;

// Типы для предоставления доступа
export interface GrantMaterialAccessRequest {
  user_id: string;
  material_id: string;
  access_source?: MaterialAccessSource;
  expires_at?: string | null;
}

// Backwards compatibility
export type GrantTechniqueAccessRequest = GrantMaterialAccessRequest;

// Блок контента материала
export interface MaterialBlock extends TimestampFields {
  id: number; // BIGSERIAL
  material_id: string; // FK к Material
  order_num: number;
  title?: string | null;
  block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
  content_text?: string | null;
  content_url?: string | null;
  meta_json?: Record<string, any> | null;
}

// Backwards compatibility
export type TechniqueBlock = MaterialBlock;

// =============================================
// ТИПЫ ДЛЯ ПОТОКОВ И МОДУЛЕЙ
// =============================================

// Поток обучения
export interface Stream extends TimestampFields {
  id: string; // UUID
  name: string;
  course_id?: string | null;
  start_date: string; // date
  is_active: boolean;
}

// Модуль в потоке
export interface StreamModule extends TimestampFields {
  id: string; // UUID
  stream_id: string; // FK к Stream
  name: string;
  color?: string;
  order_num: number;
}

// Запись пользователя в поток
export interface UserStreamEnrollment {
  id: string; // UUID
  user_id: string; // FK к User
  stream_id: string; // FK к Stream
  enrolled_at?: string;
}

// Связь материала с модулем потока и день открытия
export interface ModuleMaterial extends TimestampFields {
  id: string; // UUID
  module_id: string; // FK к StreamModule
  material_id: string; // FK к Material
  stream_id?: string | null; // FK к Stream - материалы привязаны к конкретному потоку
  tariff_id?: string | null; // FK к Tariff - материалы привязаны к конкретному тарифу
  release_day: number; // день модуля (1 = первый день)
  active_days?: number | null; // Сколько дней материал активен (NULL = бессрочно)
  order_num: number;
}

// Backwards compatibility
export type StreamModuleTechnique = ModuleMaterial;

// Расширенная информация о материале с расписанием
export interface MaterialWithSchedule extends Material {
  release_day?: number | null; // День открытия в модуле
  unlock_day?: number | null; // Alias для release_day (backwards compatibility)
  active_days?: number | null; // Сколько дней материал активен
  is_unlocked: boolean; // Открыт ли материал на текущую дату
  has_access: boolean; // Есть ли доступ у пользователя
  can_purchase: boolean; // Может ли пользователь купить
  purchase_info: MaterialPurchaseInfo;
}

// Backwards compatibility
export type TechniqueWithSchedule = MaterialWithSchedule;

// Типы для создания/обновления связи материалов с модулями
export interface CreateModuleMaterial {
  module_id: string;
  material_id: string;
  stream_id: string; // Обязательно - привязка к потоку
  tariff_id: string; // Обязательно - привязка к тарифу
  release_day: number; // День модуля (1-21)
  active_days?: number | null; // Сколько дней активен
  order_num?: number;
}

export interface UpdateModuleMaterial {
  id: string;
  stream_id?: string;
  tariff_id?: string;
  release_day?: number;
  active_days?: number | null;
  order_num?: number;
}

// Backwards compatibility
export type CreateStreamModuleTechnique = CreateModuleMaterial;
export type UpdateStreamModuleTechnique = UpdateModuleMaterial;