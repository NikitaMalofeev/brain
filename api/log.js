// Простой сервер для логов, который записывает их в Vercel logs
export default function handler(req, res) {
  // Принимаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Получаем данные логов
  const logData = req.body;

  // Пишем лог в стандартный вывод Vercel
  console.log(`[LOG] ${logData.level.toUpperCase()}: ${logData.message}`, 
    JSON.stringify({
      timestamp: logData.timestamp,
      userId: logData.userId,
      url: logData.url,
      data: logData.data
    })
  );

  // Для ошибок используем console.error чтобы они отображались отдельно
  if (logData.level === 'error') {
    console.error(`[ERROR] ${logData.message}`, 
      JSON.stringify({
        timestamp: logData.timestamp,
        userId: logData.userId,
        url: logData.url,
        data: logData.data
      })
    );
  }

  // Отправляем успешный ответ
  return res.status(200).json({ success: true });
} 