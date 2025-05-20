// API эндпоинт для установки даты окончания доступа пользователя
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента
const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Поддержка только POST запросов
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, use POST' });
  }
  
  try {
    // Получаем данные из запроса
    const { userid, date } = req.body;
    
    if (!userid || !date) {
      return res.status(400).json({ error: 'Missing required fields: userid and date are required' });
    }
    
    // Логируем входящий запрос в webhook_logs
    await logWebhook(req, res);
    
    // Проверяем формат userId (может быть текстом или числом)
    const telegramId = typeof userid === 'string' ? parseInt(userid, 10) : userid;
    
    if (isNaN(telegramId)) {
      return res.status(400).json({ error: 'Invalid userid format, must be a valid numeric Telegram ID' });
    }
    
    // Проверяем формат даты
    const accessTill = new Date(date);
    if (isNaN(accessTill.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Находим пользователя по telegram_id
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', telegramId)
      .single();
    
    if (findError || !user) {
      return res.status(404).json({ error: 'User not found', details: findError?.message });
    }
    
    // Обновляем дату доступа для пользователя
    const { error: updateError } = await supabase
      .from('users')
      .update({ access_till: accessTill.toISOString() })
      .eq('id', user.id);
    
    if (updateError) {
      return res.status(500).json({ error: 'Failed to update access date', details: updateError.message });
    }
    
    // Возвращаем успешный ответ
    return res.status(200).json({ 
      success: true, 
      message: `Access date updated for user ${telegramId}`,
      user_id: user.id,
      access_till: accessTill.toISOString()
    });
    
  } catch (error) {
    console.error('Error processing set_access_date request:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Функция для логирования вебхука
async function logWebhook(req, res) {
  try {
    // Сохраняем все данные запроса
    const requestHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      requestHeaders[key] = value;
    }
    
    await supabase.from('webhook_logs').insert({
      endpoint: '/api/set_access_date',
      request_method: req.method,
      request_headers: requestHeaders,
      request_body: req.body || {},
      response_status: null, // Заполнится после ответа
      response_body: null,
    });
    
    // Обработчик для логирования ответа
    const originalEnd = res.end;
    res.end = async function(chunk, encoding) {
      const responseBody = chunk ? chunk.toString() : '';
      
      // Обновляем запись с данными ответа
      await supabase.from('webhook_logs').update({
        response_status: res.statusCode,
        response_body: responseBody
      }).eq('endpoint', '/api/set_access_date').is('response_status', null);
      
      // Вызываем оригинальный метод end
      return originalEnd.call(this, chunk, encoding);
    };
    
  } catch (logError) {
    console.error('Error logging webhook:', logError);
    // Ошибка логирования не должна влиять на основной процесс
  }
} 