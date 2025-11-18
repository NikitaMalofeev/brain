// Edge Function для отправки пуш-уведомлений о событиях календаря
// Запускается ежедневно в 19:00 и отправляет уведомления о событиях на следующий день

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  external_url: string | null;
  cover_image: string | null;
  module_name: string | null;
  module_color: string | null;
}

interface UserEnrollment {
  user_id: string;
  telegram_id: string;
}

/**
 * Отправка уведомления через Telegram Bot API
 */
async function sendTelegramNotification(
  telegramId: string,
  event: CalendarEvent
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return false;
  }

  const eventTime = event.event_time
    ? ` в ${event.event_time.substring(0, 5)}`
    : '';

  const eventTypeEmoji: Record<string, string> = {
    zoom: '🎥',
    offline: '📍',
    lesson_unlock: '📖',
    material_unlock: '📄',
    technique_unlock: '🎧',
  };

  const emoji = eventTypeEmoji[event.event_type] || '📅';

  const message = `${emoji} <b>Напоминание о событии</b>\n\nЗавтра${eventTime}: <b>${event.title}</b>${
    event.description ? `\n\n${event.description}` : ''
  }${event.module_name ? `\n\n📚 Модуль: ${event.module_name}` : ''}`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to send notification to ${telegramId}:`,
        errorText
      );
      return false;
    }

    console.log(`Notification sent successfully to ${telegramId}`);
    return true;
  } catch (error) {
    console.error(`Error sending notification to ${telegramId}:`, error);
    return false;
  }
}

/**
 * Получение событий на завтра
 */
async function getTomorrowEvents(supabase: any): Promise<CalendarEvent[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('calendar_events')
    .select(
      `
      id,
      title,
      description,
      event_date,
      event_time,
      event_type,
      external_url,
      cover_image,
      stream_modules (
        module_name,
        color
      )
    `
    )
    .eq('event_date', tomorrowDateStr);

  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }

  // Преобразуем данные в нужный формат
  return (data || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    event_date: event.event_date,
    event_time: event.event_time,
    event_type: event.event_type,
    external_url: event.external_url,
    cover_image: event.cover_image,
    module_name: event.stream_modules?.module_name || null,
    module_color: event.stream_modules?.color || null,
  }));
}

/**
 * Получение пользователей, записанных на поток события
 */
async function getUsersForEvent(
  supabase: any,
  eventId: string
): Promise<UserEnrollment[]> {
  const { data, error } = await supabase.rpc('get_users_for_event', {
    p_event_id: eventId,
  });

  if (error) {
    console.error(`Error fetching users for event ${eventId}:`, error);
    return [];
  }

  return data || [];
}

serve(async (req) => {
  try {
    console.log('Starting send-event-notifications function...');

    // Проверка переменных окружения
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }

    // Создаем клиент Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем события на завтра
    const events = await getTomorrowEvents(supabase);
    console.log(`Found ${events.length} events for tomorrow`);

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No events for tomorrow' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Счетчики для статистики
    let totalNotificationsSent = 0;
    let totalErrors = 0;

    // Отправляем уведомления для каждого события
    for (const event of events) {
      console.log(`Processing event: ${event.title} (${event.id})`);

      // Получаем пользователей для этого события
      const users = await getUsersForEvent(supabase, event.id);
      console.log(`Found ${users.length} users for event ${event.id}`);

      // Отправляем уведомление каждому пользователю
      for (const user of users) {
        const success = await sendTelegramNotification(
          user.telegram_id,
          event
        );

        if (success) {
          totalNotificationsSent++;
        } else {
          totalErrors++;
        }

        // Небольшая задержка между отправками для избежания rate limit
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `Notifications sent: ${totalNotificationsSent}, Errors: ${totalErrors}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        events_processed: events.length,
        notifications_sent: totalNotificationsSent,
        errors: totalErrors,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-event-notifications function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
