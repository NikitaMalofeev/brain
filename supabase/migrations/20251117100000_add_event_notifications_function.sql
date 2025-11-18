-- Миграция для добавления функции получения пользователей события
-- Используется Edge Function для отправки пуш-уведомлений

-- Функция для получения пользователей, записанных на поток события
CREATE OR REPLACE FUNCTION get_users_for_event(p_event_id UUID)
RETURNS TABLE (
  user_id UUID,
  telegram_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id AS user_id,
    u.telegram_id::TEXT AS telegram_id
  FROM calendar_events ce
  JOIN user_stream_enrollments use ON use.stream_id = ce.stream_id
  JOIN users u ON u.id = use.user_id
  WHERE ce.id = p_event_id
    AND u.telegram_id IS NOT NULL; -- Только пользователи с telegram_id
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION get_users_for_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_event(UUID) TO service_role;

-- Комментарий для документации
COMMENT ON FUNCTION get_users_for_event(UUID) IS 'Получает список пользователей (user_id, telegram_id) для отправки уведомлений о событии календаря';
