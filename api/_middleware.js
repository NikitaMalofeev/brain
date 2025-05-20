// Middleware для обработки Vercel API запросов
export default function middleware(req, res, next) {
  // Проверка типа среды исполнения (Edge runtime или Node.js)
  const isEdgeRuntime = typeof Response !== 'undefined' && req instanceof Request;
  
  if (isEdgeRuntime) {
    // Edge Runtime (заголовки CORS добавляются через Response)
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Если это предварительный запрос OPTIONS, сразу отвечаем успехом
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
          'Access-Control-Allow-Headers': 'X-Requested-With,content-type,Authorization'
        }
      });
    }
    
    // Продолжаем обработку запроса
    return next(req);
  } else {
    // Node.js Runtime
    // Обрабатываем CORS для API запросов
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    
    // Если это предварительный запрос OPTIONS, сразу отвечаем успехом
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    // Добавляем информацию о запросе в логи
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Продолжаем обработку запроса
    return next();
  }
} 