-- Миграция: присвоение базового тарифа всем существующим пользователям
-- Дата: 2025-01-01
-- Описание: Переходим на систему доступа только через токены/тарифы.
--           Всем существующим пользователям присваиваем базовый тариф T1.

-- Получаем ID базового тарифа T1
DO $$
DECLARE
  base_tariff_id UUID;
BEGIN
  -- Находим тариф T1 (базовый тариф)
  SELECT id INTO base_tariff_id 
  FROM public.tariffs 
  WHERE code = 'T1'
  LIMIT 1;

  -- Проверяем, что тариф T1 существует
  IF base_tariff_id IS NULL THEN
    RAISE EXCEPTION 'Базовый тариф T1 не найден в системе';
  END IF;

  -- Присваиваем базовый тариф всем пользователям, у которых нет активного тарифа
  INSERT INTO public.user_tariffs (user_id, tariff_id, is_active, created_at, updated_at)
  SELECT 
    u.id as user_id,
    base_tariff_id as tariff_id,
    true as is_active,
    now() as created_at,
    now() as updated_at
  FROM public.users u
  WHERE NOT EXISTS (
    -- Исключаем пользователей, у которых уже есть активный тариф
    SELECT 1 
    FROM public.user_tariffs ut 
    WHERE ut.user_id = u.id AND ut.is_active = true
  )
  -- Исключаем системных пользователей (админов и кураторов)
  AND u.telegram_id NOT LIKE 'web_%_system';

  -- Логгируем результат
  RAISE NOTICE 'Базовый тариф T1 присвоен % пользователям', 
    (SELECT count(*) FROM public.user_tariffs WHERE tariff_id = base_tariff_id AND is_active = true);

END $$;

-- Комментарий к миграции
COMMENT ON TABLE public.user_tariffs IS 
'Привязка пользователей к их активным тарифам. Обновлено: 2025-01-01 - добавлен базовый тариф для существующих пользователей.'; 