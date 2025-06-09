CREATE OR REPLACE FUNCTION redeem_access_token(token_to_redeem TEXT, user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
-- `volatile` означает, что функция имеет побочные эффекты (изменяет базу данных)
VOLATILE
-- `security definer` позволяет функции выполняться с правами создателя (в данном случае, с правами для изменения всех нужных таблиц)
SECURITY DEFINER
AS $$
DECLARE
  token_record RECORD;
  profile_record RECORD;
BEGIN
  -- 1. Проверяем, передан ли user_id
  IF user_id_param IS NULL THEN
    RETURN json_build_object('error', 'User ID не передан');
  END IF;

  -- 2. Находим пользователя
  SELECT * INTO profile_record FROM public.users WHERE id = user_id_param;
  IF NOT FOUND THEN
      RETURN json_build_object('error', 'Пользователь не найден');
  END IF;

  -- 3. Находим токен и блокируем строку для обновления (FOR UPDATE), чтобы избежать race conditions
  SELECT * INTO token_record
  FROM public.access_tokens
  WHERE token = token_to_redeem
  FOR UPDATE;

  -- 4. Проверяем валидность токена
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Токен не найден');
  END IF;

  IF token_record.status != 'created' THEN
    IF token_record.status = 'used' THEN
        RETURN json_build_object('error', 'Токен уже был использован');
    ELSE
        RETURN json_build_object('error', 'Токен не активен');
    END IF;
  END IF;

  -- 5. Атомарно выполняем все изменения в базе данных
  -- а. Создаем связь пользователя с тарифом (используем INSERT только если связи еще нет)
  INSERT INTO public.user_tariffs (user_id, tariff_id, is_active)
  SELECT user_id_param, token_record.tariff_id, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_tariffs 
    WHERE user_id = user_id_param AND tariff_id = token_record.tariff_id
  );

  -- Обновляем статус тарифа на активный, если связь уже существует
  UPDATE public.user_tariffs 
  SET is_active = true
  WHERE user_id = user_id_param AND tariff_id = token_record.tariff_id;

  -- б. Добавляем пользователя на курс, если его там еще нет
  INSERT INTO public.user_course_enrollments (user_id, course_id, enrollment_date, is_active)
  SELECT user_id_param, token_record.course_id, now(), true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_course_enrollments 
    WHERE user_id = user_id_param AND course_id = token_record.course_id
  );

  -- в. Помечаем токен как использованный
  UPDATE public.access_tokens
  SET
    status = 'used',
    used_by_user_id = profile_record.id,
    used_at = now()
  WHERE id = token_record.id;
  
  -- 6. Возвращаем успешный результат
  RETURN json_build_object('ok', true, 'tariffId', token_record.tariff_id, 'courseId', token_record.course_id);

EXCEPTION
  WHEN OTHERS THEN
    -- В случае любой ошибки транзакция автоматически откатывается.
    -- Не показываем необработанные ошибки SQL клиенту из соображений безопасности.
    RETURN json_build_object('error', 'Произошла непредвиденная ошибка при активации токена.');
END;
$$; 