-- SQL для проверки почему "Медитация изобилия" показывается по-разному

-- 1. Найти технику "Медитация изобилия"
SELECT
  id,
  title,
  status,
  unlock_condition_type,
  unlock_condition_value
FROM techniques
WHERE title ILIKE '%медитация изобилия%';

-- 2. Проверить в каких модулях она есть и с какими датами
SELECT
  t.title as technique_title,
  s.name as stream_name,
  sm.name as module_name,
  smt.unlock_date,
  smt.order_num,
  CASE
    WHEN smt.unlock_date IS NULL THEN 'NO_DATE'
    WHEN smt.unlock_date <= CURRENT_DATE THEN 'UNLOCKED'
    ELSE 'LOCKED'
  END as unlock_status
FROM stream_module_techniques smt
JOIN techniques t ON t.id = smt.technique_id
JOIN stream_modules sm ON sm.id = smt.stream_module_id
JOIN streams s ON s.id = sm.stream_id
WHERE t.title ILIKE '%медитация изобилия%';

-- 3. Найти тестового пользователя и его поток
SELECT
  u.id as user_id,
  u.first_name,
  u.telegram_id,
  s.id as stream_id,
  s.name as stream_name
FROM users u
LEFT JOIN user_stream_enrollments use ON use.user_id = u.id
LEFT JOIN streams s ON s.id = use.stream_id
WHERE u.telegram_id = 'test123' OR u.first_name ILIKE '%тест%'
LIMIT 5;

-- 4. Проверить что возвращает функция can_user_purchase_technique для этого пользователя
-- (замените USER_ID и TECHNIQUE_ID на реальные значения из запросов выше)
-- SELECT can_user_purchase_technique('USER_ID'::uuid, 'TECHNIQUE_ID'::uuid);

-- 5. Проверить текущую дату сервера
SELECT
  CURRENT_DATE as current_date,
  NOW() as current_timestamp,
  NOW() AT TIME ZONE 'Europe/Moscow' as moscow_time;
