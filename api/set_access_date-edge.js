// API эндпоинт для установки даты окончания доступа пользователя (Edge Runtime)
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента
const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Добавляем CORS заголовки
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Обработка предварительного запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Поддержка только POST запросов
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed, use POST' }),
      { status: 405, headers }
    );
  }

  try {
    // Получаем данные из запроса
    const requestBody = await req.json();
    const { userid, date } = requestBody;

    if (!userid || !date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userid and date are required' }),
        { status: 400, headers }
      );
    }

    // Логируем входящий запрос в webhook_logs
    await logWebhook(req, requestBody);

    // Проверяем формат userId (может быть текстом или числом)
    const telegramId = typeof userid === 'string' ? parseInt(userid, 10) : userid;

    if (isNaN(telegramId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid userid format, must be a valid numeric Telegram ID' }),
        { status: 400, headers }
      );
    }

    // Проверяем формат даты
    const accessTill = new Date(date);
    if (isNaN(accessTill.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format' }),
        { status: 400, headers }
      );
    }

    // Находим пользователя по telegram_id
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, telegram_id, is_admin')
      .eq('telegram_id', telegramId)
      .single();

    if (findError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found', details: findError?.message }),
        { status: 404, headers }
      );
    }

    // Обновляем дату доступа для пользователя
    const { error: updateError } = await supabase
      .from('users')
      .update({ access_till: accessTill.toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update access date', details: updateError.message }),
        { status: 500, headers }
      );
    }

    // Обновляем запись в логах с информацией об успешном ответе
    updateWebhookLog('/api/set_access_date-edge', 200, {
      success: true,
      message: `Access date updated for user ${telegramId}`,
      user_id: user.id,
      access_till: accessTill.toISOString()
    });

    // Возвращаем успешный ответ
    return new Response(
      JSON.stringify({
        success: true,
        message: `Access date updated for user ${telegramId}`,
        user_id: user.id,
        access_till: accessTill.toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Error processing set_access_date request:', error);
    
    // Обновляем запись в логах с информацией об ошибке
    updateWebhookLog('/api/set_access_date-edge', 500, {
      error: 'Internal server error',
      details: error.message
    });
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers }
    );
  }
}

// Функция для логирования вебхука
async function logWebhook(req, body) {
  try {
    // Получаем заголовки запроса
    const requestHeaders = {};
    req.headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });

    // Сохраняем запрос в логи
    await supabase.from('webhook_logs').insert({
      endpoint: '/api/set_access_date-edge',
      request_method: req.method,
      request_headers: requestHeaders,
      request_body: body,
      response_status: null, // Заполнится после ответа
      response_body: null,
    });
  } catch (logError) {
    console.error('Error logging webhook:', logError);
    // Ошибка логирования не должна влиять на основной процесс
  }
}

// Функция для обновления записи лога с информацией об ответе
async function updateWebhookLog(endpoint, status, responseBody) {
  try {
    await supabase.from('webhook_logs').update({
      response_status: status,
      response_body: JSON.stringify(responseBody)
    }).eq('endpoint', endpoint).is('response_status', null);
  } catch (updateError) {
    console.error('Error updating webhook log:', updateError);
  }
} 