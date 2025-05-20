// API endpoint для получения информации о сервере
export default function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Для OPTIONS запросов сразу отвечаем успехом (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Принимаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Собираем информацию о сервере
  const serverInfo = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'unknown',
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    // Добавляем информацию о Vercel окружении, если доступно
    vercel: {
      environment: process.env.VERCEL_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID || 'unknown'
    },
    // Добавляем информацию о публичных env переменных проекта
    env: {
      NEXT_PUBLIC_ALLOW_BROWSER_ACCESS: process.env.NEXT_PUBLIC_ALLOW_BROWSER_ACCESS || 'not-set',
      NEXT_PUBLIC_DEBUG_LOGS: process.env.NEXT_PUBLIC_DEBUG_LOGS || 'not-set',
      NEXT_PUBLIC_FORCE_LOGS: process.env.NEXT_PUBLIC_FORCE_LOGS || 'not-set',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not-set',
      NEXT_PUBLIC_IGNORE_BUILD_ERROR: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR || 'not-set'
    }
  };
  
  // Логируем запрос
  console.log(`[${new Date().toISOString()}] Server info requested`);
  
  // Отправляем информацию
  return res.status(200).json(serverInfo);
} 