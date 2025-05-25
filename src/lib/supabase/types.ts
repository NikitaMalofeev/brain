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
  is_admin?: boolean; // boolean, default false - флаг администратора
  access_till?: string | null; // timestamptz, nullable - дата окончания доступа
  total_points?: number | null; // integer, default 0 - общее количество очков пользователя
  lives_remaining?: number | null; // integer, default 3 - количество оставшихся жизней
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
  name: string;
  description?: string;
  order_num: number;
  unlock_condition_type?: string;
  unlock_condition_value?: string;
}

// Уроки (упрощенные, без полей сдачи)
export interface Lesson extends TimestampFields {
  id: number;
  stage_id: number; // FK к CourseStage
  name: string;
  description?: string;
  order_num: number;
  estimated_duration_minutes?: number;
}

// Блоки контента урока
export type BlockType = 'text' | 'video' | 'audio' | 'image' | 'pdf' | 'assignment_instruction';

export interface LessonBlock extends TimestampFields {
  id: number;
  lesson_id: number; // FK к Lesson
  order_num: number;
  title?: string; // Заголовок блока, например "Задание 1"
  block_type: BlockType;
  content_text?: string; // Для text-блоков и assignment_instruction
  content_url?: string; // Для файлов/медиа
  meta_json?: Record<string, any>; // Дополнительные поля
}

// Сдачи заданий
export type SubmissionStatus = 'submitted' | 'pending_review' | 'approved' | 'rejected' | 'late';

export interface Submission extends TimestampFields {
  id: number;
  user_id: string; // FK к User
  lesson_id: number; // FK к Lesson
  submitted_at?: string;
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
  has_submission?: boolean; // Вычисляемое поле - есть ли assignment_instruction блоки
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

// Проверка есть ли форма сдачи в уроке (через блоки)
export const lessonHasSubmission = (blocks: LessonBlock[]): boolean => {
  return blocks.some(block => block.block_type === 'assignment_instruction');
};

// Получение инструкций к сдаче из блоков
export const getSubmissionInstructions = (blocks: LessonBlock[]): string[] => {
  return blocks
    .filter(block => block.block_type === 'assignment_instruction')
    .map(block => block.content_text || '')
    .filter(text => text.length > 0);
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