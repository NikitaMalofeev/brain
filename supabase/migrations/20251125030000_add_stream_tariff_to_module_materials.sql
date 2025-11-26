-- ============================================
-- Привязка материалов модуля к потоку и тарифу
-- ============================================
-- Дата: 2025-11-25
-- Описание: Добавляем stream_id и tariff_id в module_materials,
-- чтобы материалы были привязаны к конкретному потоку и тарифу

-- ========== 1. Добавляем новые колонки ==========
ALTER TABLE public.module_materials
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.streams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tariff_id UUID REFERENCES public.tariffs(id) ON DELETE CASCADE;

-- ========== 2. Создаём индексы для производительности ==========
CREATE INDEX IF NOT EXISTS idx_module_materials_stream ON public.module_materials(stream_id);
CREATE INDEX IF NOT EXISTS idx_module_materials_tariff ON public.module_materials(tariff_id);
CREATE INDEX IF NOT EXISTS idx_module_materials_stream_tariff_module
  ON public.module_materials(stream_id, tariff_id, module_id);

-- ========== 3. Обновляем комментарии ==========
COMMENT ON COLUMN public.module_materials.stream_id IS 'Привязка к потоку - материалы специфичны для конкретного потока';
COMMENT ON COLUMN public.module_materials.tariff_id IS 'Привязка к тарифу - материалы специфичны для конкретного тарифа';

-- ========== 4. Обновляем RPC функцию для получения материалов модуля ==========
-- Теперь она учитывает stream_id и tariff_id
CREATE OR REPLACE FUNCTION public.get_module_materials_schedule(
  p_stream_module_id UUID,
  p_stream_id UUID DEFAULT NULL,
  p_tariff_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  module_id UUID,
  material_id UUID,
  material_name TEXT,
  material_type TEXT,
  release_day INTEGER,
  active_days INTEGER,
  order_num INTEGER,
  cover_image_path TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  status TEXT,
  stream_id UUID,
  tariff_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id,
    mm.module_id,
    mm.material_id,
    m.name as material_name,
    m.material_type,
    mm.release_day,
    mm.active_days,
    mm.order_num,
    m.cover_image_path,
    m.audio_url,
    m.duration_seconds,
    m.status,
    mm.stream_id,
    mm.tariff_id
  FROM public.module_materials mm
  JOIN public.materials m ON mm.material_id = m.id
  WHERE mm.module_id = p_stream_module_id
    AND (p_stream_id IS NULL OR mm.stream_id = p_stream_id)
    AND (p_tariff_id IS NULL OR mm.tariff_id = p_tariff_id)
  ORDER BY mm.order_num, mm.release_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 5. Функция для копирования материалов при копировании потока ==========
CREATE OR REPLACE FUNCTION public.copy_stream_module_materials(
  p_source_stream_id UUID,
  p_target_stream_id UUID,
  p_source_tariff_id UUID DEFAULT NULL,
  p_target_tariff_id UUID DEFAULT NULL,
  p_date_offset_days INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  v_copied_count INTEGER := 0;
  v_source_start_date DATE;
  v_target_start_date DATE;
  v_date_diff INTEGER;
BEGIN
  -- Получаем даты начала потоков
  SELECT start_date INTO v_source_start_date
  FROM public.streams WHERE id = p_source_stream_id;

  SELECT start_date INTO v_target_start_date
  FROM public.streams WHERE id = p_target_stream_id;

  -- Вычисляем разницу в днях между потоками
  v_date_diff := COALESCE(p_date_offset_days, (v_target_start_date - v_source_start_date));

  -- Копируем материалы модулей
  INSERT INTO public.module_materials (
    module_id,
    material_id,
    stream_id,
    tariff_id,
    release_day,
    active_days,
    order_num
  )
  SELECT
    mm.module_id,
    mm.material_id,
    p_target_stream_id,
    COALESCE(p_target_tariff_id, mm.tariff_id),
    mm.release_day + v_date_diff, -- Сдвигаем день релиза на разницу дат
    mm.active_days,
    mm.order_num
  FROM public.module_materials mm
  WHERE mm.stream_id = p_source_stream_id
    AND (p_source_tariff_id IS NULL OR mm.tariff_id = p_source_tariff_id);

  GET DIAGNOSTICS v_copied_count = ROW_COUNT;

  RETURN v_copied_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.copy_stream_module_materials IS
  'Копирует материалы модулей из одного потока в другой с пересчётом дат.
   Используется при копировании потока.
   p_date_offset_days - на сколько дней сдвинуть release_day (если NULL, вычисляется автоматически по разнице start_date)';

-- ========== 6. Функция для получения материалов пользователя с учетом потока/тарифа ==========
CREATE OR REPLACE FUNCTION public.get_user_module_materials(
  p_user_id UUID,
  p_stream_id UUID DEFAULT NULL
)
RETURNS TABLE(
  material_id UUID,
  name TEXT,
  description TEXT,
  cover_image_path TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  material_type TEXT,
  status TEXT,
  has_access BOOLEAN,
  can_purchase BOOLEAN,
  module_id UUID,
  module_name TEXT,
  stream_id UUID,
  tariff_id UUID,
  release_day INTEGER,
  active_days INTEGER,
  is_unlocked BOOLEAN,
  order_num INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as material_id,
    m.name,
    m.description,
    m.cover_image_path,
    m.audio_url,
    m.duration_seconds,
    m.material_type,
    m.status,
    EXISTS(
      SELECT 1 FROM public.user_material_access uma
      WHERE uma.user_id = p_user_id AND uma.material_id = m.id
    ) as has_access,
    (m.status = 'purchasable' OR m.status = 'free') as can_purchase,
    mm.module_id,
    sm.name as module_name,
    mm.stream_id,
    mm.tariff_id,
    mm.release_day,
    mm.active_days,
    -- TODO: Добавить логику разблокировки на основе даты начала потока + release_day
    TRUE as is_unlocked,
    mm.order_num
  FROM public.materials m
  JOIN public.module_materials mm ON m.id = mm.material_id
  JOIN public.stream_modules sm ON mm.module_id = sm.id
  WHERE (p_stream_id IS NULL OR mm.stream_id = p_stream_id)
  ORDER BY mm.stream_id, mm.tariff_id, mm.module_id, mm.order_num, mm.release_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 7. Обновляем constraint для уникальности ==========
-- Удаляем старый constraint если есть
ALTER TABLE public.module_materials
DROP CONSTRAINT IF EXISTS module_materials_module_id_material_id_key;

-- Добавляем новый с учетом stream_id и tariff_id
-- Теперь один материал может быть в одном модуле несколько раз,
-- но для разных потоков/тарифов
ALTER TABLE public.module_materials
ADD CONSTRAINT module_materials_unique_stream_tariff_module_material
  UNIQUE (stream_id, tariff_id, module_id, material_id, release_day);

COMMENT ON CONSTRAINT module_materials_unique_stream_tariff_module_material
  ON public.module_materials IS
  'Один материал может быть добавлен в модуль только один раз для конкретной комбинации поток+тариф+день';

-- ========== ИНФОРМАЦИЯ ==========
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция завершена успешно!';
  RAISE NOTICE 'Добавлено:';
  RAISE NOTICE '  - Колонки stream_id и tariff_id в module_materials';
  RAISE NOTICE '  - Индексы для производительности';
  RAISE NOTICE '  - Функция get_module_materials_schedule обновлена';
  RAISE NOTICE '  - Функция copy_stream_module_materials для копирования потоков';
  RAISE NOTICE '  - Функция get_user_module_materials для клиента';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ ВАЖНО: Существующие записи в module_materials имеют NULL в stream_id/tariff_id';
  RAISE NOTICE '   Нужно вручную заполнить эти поля для старых данных или удалить их';
END $$;
