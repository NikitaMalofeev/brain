-- Простые запросы для понимания текущей структуры

-- 1. Все тарифы
SELECT * FROM tariffs;

-- 2. Все потоки
SELECT * FROM streams;

-- 3. Структура user_tariffs (связь пользователя с тарифом)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_tariffs'
ORDER BY ordinal_position;

-- 4. Структура user_stream_enrollments (связь пользователя с потоком)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stream_enrollments'
ORDER BY ordinal_position;

-- 5. Модули в потоках
SELECT
  sm.id,
  sm.stream_id,
  s.name as stream_name,
  sm.name as module_name,
  sm.order_num
FROM stream_modules sm
JOIN streams s ON s.id = sm.stream_id
ORDER BY s.name, sm.order_num;

-- 6. Есть ли связь stream_id в tariffs или tariff_id в streams?
SELECT 'tariffs' as table_name, column_name
FROM information_schema.columns
WHERE table_name = 'tariffs' AND column_name LIKE '%stream%'
UNION
SELECT 'streams' as table_name, column_name
FROM information_schema.columns
WHERE table_name = 'streams' AND column_name LIKE '%tariff%';
