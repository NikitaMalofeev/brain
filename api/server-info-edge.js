// Edge-compatible API endpoint для получения информации о сервере
export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  // Для OPTIONS запросов сразу отвечаем успехом (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  // Принимаем только GET запросы
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Собираем информацию о сервере (Edge runtime имеет ограниченный доступ к API)
  const serverInfo = {
    timestamp: new Date().toISOString(),
    runtime: 'edge',
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
  console.log(`[${new Date().toISOString()}] Server info requested (Edge runtime)`);
  
  // Отправляем информацию
  return new Response(JSON.stringify(serverInfo), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
} 