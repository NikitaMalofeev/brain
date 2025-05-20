/**
 * Скрипт для тестирования инициализации пользователя Telegram в Supabase
 * Этот скрипт демонстрирует как создать пользователя в Supabase на основе данных Telegram
 * до полной инициализации Mini App.
 */

import { createClient } from '@supabase/supabase-js';

// Тестовые данные пользователя Telegram (замените на реальные при тестировании)
const MOCK_TELEGRAM_USER = {
  id: 123456789,
  first_name: 'Имя',
  last_name: 'Фамилия',
  username: 'username',
  photo_url: 'https://t.me/i/userpic/320/example.jpg',
  auth_date: Math.floor(Date.now() / 1000),
  hash: 'example-hash-would-go-here'
};

// Функция для инициализации и создания пользователя в Supabase
async function createTelegramUserWithServiceRole() {
  // Supabase URL и SERVICE_ROLE ключ (ВАЖНО: не используйте в клиентском коде!)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Необходимо указать SUPABASE_URL и SUPABASE_SERVICE_KEY!');
    return null;
  }

  // Создаем клиент с сервисным ключом для полного доступа
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Проверяем наличие пользователя...');
    
    // Проверяем, существует ли уже пользователь с этим Telegram ID
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', MOCK_TELEGRAM_USER.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = не найдено
      console.error('Ошибка при проверке пользователя:', checkError);
      return null;
    }

    if (existingUser) {
      console.log('Пользователь уже существует:', existingUser);
      return existingUser;
    }

    console.log('Создаем нового пользователя...');

    // Генерируем уникальный email на основе Telegram ID для авторизации
    const email = `${MOCK_TELEGRAM_USER.id}@telegram.user`;
    // Генерируем случайный пароль
    const password = Math.random().toString(36).slice(-8);

    // Создаем пользователя через Auth API, используя сервисный ключ
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Автоматически подтверждаем email
      user_metadata: {
        telegram_id: MOCK_TELEGRAM_USER.id,
        first_name: MOCK_TELEGRAM_USER.first_name,
        last_name: MOCK_TELEGRAM_USER.last_name,
        username: MOCK_TELEGRAM_USER.username,
        photo_url: MOCK_TELEGRAM_USER.photo_url,
      }
    });

    if (authError) {
      console.error('Ошибка при создании пользователя через Auth API:', authError);
      return null;
    }

    if (!authData?.user?.id) {
      console.error('Не удалось получить ID пользователя после создания');
      return null;
    }

    // Вставляем пользователя в публичную таблицу users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        telegram_id: MOCK_TELEGRAM_USER.id,
        first_name: MOCK_TELEGRAM_USER.first_name,
        last_name: MOCK_TELEGRAM_USER.last_name || null,
        username: MOCK_TELEGRAM_USER.username || null,
        photo_url: MOCK_TELEGRAM_USER.photo_url || null,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('Ошибка при создании пользователя в таблице users:', userError);
      return null;
    }

    console.log('Пользователь успешно создан:', userData);
    return userData;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    return null;
  }
}

// Запуск функции для тестирования
// Примечание: в реальном использовании это должен быть API-эндпоинт или серверная функция
createTelegramUserWithServiceRole()
  .then(result => {
    console.log('Результат операции:', result);
  })
  .catch(error => {
    console.error('Необработанная ошибка:', error);
  });

// Пример запуска из командной строки:
// NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_KEY=your-service-key node telegram-initialization.js 