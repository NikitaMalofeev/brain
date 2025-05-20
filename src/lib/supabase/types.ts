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