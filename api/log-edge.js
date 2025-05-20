// Edge-compatible версия обработчика логов для Vercel Edge Functions
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Принимаем только POST запросы
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // Обработка OPTIONS для CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  try {
    // Получаем данные логов из тела запроса
    const logData = await request.json();
    
    // Формируем строку лога
    const logString = `[LOG] ${logData.level.toUpperCase()}: ${logData.message}`;
    const logDetails = JSON.stringify({
      timestamp: logData.timestamp,
      userId: logData.userId,
      url: logData.url,
      data: logData.data,
      userAgent: logData.userAgent
    });
    
    // Пишем лог в стандартный вывод Vercel
    console.log(logString, logDetails);
    
    // Для ошибок используем console.error
    if (logData.level === 'error') {
      console.error(`[ERROR] ${logData.message}`, logDetails);
    }
    
    // Отправляем успешный ответ
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    // В случае ошибки обработки запроса
    console.error('[LOG-ERROR] Failed to process log', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process log', 
      details: error.message 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 