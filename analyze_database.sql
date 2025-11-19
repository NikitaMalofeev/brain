-- =============================================
-- АНАЛИЗ СУЩЕСТВУЮЩЕЙ СТРУКТУРЫ БАЗЫ ДАННЫХ
-- =============================================

-- 1. Показать все таблицы в базе данных
SELECT
  table_name,
  (
    SELECT count(*)
    FROM information_schema.columns c
    WHERE c.table_schema = t.table_schema
      AND c.table_name = t.table_name
  ) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- 2. Показать полную структуру таблицы users
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;


-- 3. Показать все данные из таблицы users (первые 10 записей)
SELECT * FROM public.users LIMIT 10;


-- 4. Показать структуру таблицы techniques
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'techniques'
ORDER BY ordinal_position;


-- 5. Показать структуру таблицы user_technique_access
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_technique_access'
ORDER BY ordinal_position;


-- 6. Показать все foreign keys связанные с users
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name = 'users' OR ccu.table_name = 'users')
ORDER BY tc.table_name, kcu.column_name;


-- 7. Показать все функции, связанные с techniques
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%technique%'
ORDER BY routine_name;


-- 8. Проверить есть ли таблицы связанные с потоками/группами/когортами
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%stream%'
    OR table_name LIKE '%cohort%'
    OR table_name LIKE '%group%'
    OR table_name LIKE '%flow%'
    OR table_name LIKE '%class%'
  )
ORDER BY table_name;


-- 9. Показать все колонки в users, которые могут содержать групповую информацию
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND (
    column_name LIKE '%group%'
    OR column_name LIKE '%stream%'
    OR column_name LIKE '%cohort%'
    OR column_name LIKE '%class%'
    OR column_name LIKE '%tariff%'
    OR column_name LIKE '%plan%'
  )
ORDER BY ordinal_position;


-- 10. Показать текущие техники и их настройки доступа
SELECT
  id,
  title,
  available_from_module,
  status,
  unlock_condition_type,
  unlock_condition_value,
  order_num
FROM public.techniques
ORDER BY order_num, created_at;
