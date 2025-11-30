-- ============================================
-- Миграция: Специальные пакеты техник с цепочкой разблокировок
-- ============================================

-- 1. Специальные пакеты (отдельно от bundles)
CREATE TABLE IF NOT EXISTS special_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_special_bundles_order ON special_bundles(order_num);

-- 2. Техники в специальном пакете с настройками цепочки
CREATE TABLE IF NOT EXISTS special_bundle_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_bundle_id UUID NOT NULL REFERENCES special_bundles(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  technique_position INTEGER NOT NULL,  -- Позиция в цепочке (1, 2, 3...)
  delay_days INTEGER DEFAULT 30,  -- Задержка в днях от предыдущей техники (для technique_position > 1)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(special_bundle_id, technique_id),
  UNIQUE(special_bundle_id, technique_position)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_special_bundle_techniques_bundle ON special_bundle_techniques(special_bundle_id);
CREATE INDEX IF NOT EXISTS idx_special_bundle_techniques_technique ON special_bundle_techniques(technique_id);

-- 3. Размещение специального пакета в модуле тарифа
CREATE TABLE IF NOT EXISTS special_bundle_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_bundle_id UUID NOT NULL REFERENCES special_bundles(id) ON DELETE CASCADE,
  tariff_stream_module_id UUID NOT NULL REFERENCES tariff_stream_modules(id) ON DELETE CASCADE,
  start_unlock_offset_days INTEGER NOT NULL DEFAULT 0,  -- День открытия 1-й техники от начала модуля
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(special_bundle_id, tariff_stream_module_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_special_bundle_placements_bundle ON special_bundle_placements(special_bundle_id);
CREATE INDEX IF NOT EXISTS idx_special_bundle_placements_module ON special_bundle_placements(tariff_stream_module_id);

-- 4. Оплата техник специального пакета пользователем
CREATE TABLE IF NOT EXISTS user_special_bundle_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  special_bundle_id UUID NOT NULL REFERENCES special_bundles(id) ON DELETE CASCADE,
  technique_position INTEGER NOT NULL,  -- Позиция техники которая оплачена
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  paid_by UUID REFERENCES auth.users(id),  -- Кто отметил оплату (админ)
  UNIQUE(user_id, special_bundle_id, technique_position)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_special_bundle_payments_user ON user_special_bundle_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_special_bundle_payments_bundle ON user_special_bundle_payments(special_bundle_id);

-- ============================================
-- RLS Политики
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE special_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_bundle_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_bundle_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_special_bundle_payments ENABLE ROW LEVEL SECURITY;

-- special_bundles: чтение для всех авторизованных, запись для админов
CREATE POLICY "special_bundles_select" ON special_bundles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "special_bundles_insert" ON special_bundles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "special_bundles_update" ON special_bundles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "special_bundles_delete" ON special_bundles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- special_bundle_techniques: чтение для всех, запись для админов
CREATE POLICY "special_bundle_techniques_select" ON special_bundle_techniques
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "special_bundle_techniques_insert" ON special_bundle_techniques
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "special_bundle_techniques_update" ON special_bundle_techniques
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "special_bundle_techniques_delete" ON special_bundle_techniques
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- special_bundle_placements: чтение для всех, запись для админов
CREATE POLICY "special_bundle_placements_select" ON special_bundle_placements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "special_bundle_placements_insert" ON special_bundle_placements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "special_bundle_placements_update" ON special_bundle_placements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "special_bundle_placements_delete" ON special_bundle_placements
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- user_special_bundle_payments: пользователь видит свои, админ все
CREATE POLICY "user_special_bundle_payments_select" ON user_special_bundle_payments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_special_bundle_payments_insert" ON user_special_bundle_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_special_bundle_payments_update" ON user_special_bundle_payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_special_bundle_payments_delete" ON user_special_bundle_payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- RPC функция для получения техник пользователя из специальных пакетов
-- ============================================

CREATE OR REPLACE FUNCTION get_user_special_bundle_techniques(p_user_id UUID)
RETURNS TABLE (
  technique_id UUID,
  technique_name TEXT,
  technique_cover TEXT,
  special_bundle_id UUID,
  special_bundle_name TEXT,
  technique_position INTEGER,
  delay_days INTEGER,
  unlock_date DATE,
  is_time_unlocked BOOLEAN,
  is_paid BOOLEAN,
  is_available BOOLEAN,
  previous_technique_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stream_start_date DATE;
BEGIN
  -- Получаем дату начала потока пользователя
  SELECT s.start_date INTO v_stream_start_date
  FROM user_stream_enrollments use
  JOIN streams s ON s.id = use.stream_id
  WHERE use.user_id = p_user_id
  LIMIT 1;

  IF v_stream_start_date IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_tariff AS (
    -- Получаем тариф пользователя
    SELECT ut.tariff_id
    FROM user_tariffs ut
    WHERE ut.user_id = p_user_id
    LIMIT 1
  ),
  placements_with_dates AS (
    -- Получаем все размещения специальных пакетов для тарифа пользователя
    SELECT
      sbp.special_bundle_id,
      sbp.start_unlock_offset_days,
      tsm.unlock_offset_days as module_unlock_offset,
      sb.name as bundle_name
    FROM special_bundle_placements sbp
    JOIN tariff_stream_modules tsm ON tsm.id = sbp.tariff_stream_module_id
    JOIN special_bundles sb ON sb.id = sbp.special_bundle_id
    WHERE tsm.tariff_id = (SELECT tariff_id FROM user_tariff)
  ),
  techniques_with_unlock AS (
    -- Рассчитываем даты разблокировки для каждой техники
    SELECT
      sbt.technique_id,
      m.name as tech_name,
      m.cover_image_path as tech_cover,
      sbt.special_bundle_id,
      pwd.bundle_name as sb_name,
      sbt.technique_position as tech_position,
      sbt.delay_days as tech_delay_days,
      -- Дата разблокировки = дата начала потока + offset модуля + offset размещения + сумма delay предыдущих техник
      (v_stream_start_date + pwd.module_unlock_offset + pwd.start_unlock_offset_days +
        COALESCE((
          SELECT SUM(sbt2.delay_days)
          FROM special_bundle_techniques sbt2
          WHERE sbt2.special_bundle_id = sbt.special_bundle_id
            AND sbt2.technique_position < sbt.technique_position
        ), 0)
      )::DATE as calculated_unlock_date,
      -- Название предыдущей техники
      (
        SELECT m2.name
        FROM special_bundle_techniques sbt2
        JOIN materials m2 ON m2.id = sbt2.technique_id
        WHERE sbt2.special_bundle_id = sbt.special_bundle_id
          AND sbt2.technique_position = sbt.technique_position - 1
      ) as prev_technique_name
    FROM special_bundle_techniques sbt
    JOIN materials m ON m.id = sbt.technique_id
    JOIN placements_with_dates pwd ON pwd.special_bundle_id = sbt.special_bundle_id
  )
  SELECT
    twu.technique_id,
    twu.tech_name,
    twu.tech_cover,
    twu.special_bundle_id,
    twu.sb_name,
    twu.tech_position,
    twu.tech_delay_days,
    twu.calculated_unlock_date as unlock_date,
    (CURRENT_DATE >= twu.calculated_unlock_date) as is_time_unlocked,
    EXISTS (
      SELECT 1 FROM user_special_bundle_payments usbp
      WHERE usbp.user_id = p_user_id
        AND usbp.special_bundle_id = twu.special_bundle_id
        AND usbp.technique_position = twu.tech_position
    ) as is_paid,
    -- Доступна если время прошло И оплачена
    (CURRENT_DATE >= twu.calculated_unlock_date) AND EXISTS (
      SELECT 1 FROM user_special_bundle_payments usbp
      WHERE usbp.user_id = p_user_id
        AND usbp.special_bundle_id = twu.special_bundle_id
        AND usbp.technique_position = twu.tech_position
    ) as is_available,
    twu.prev_technique_name as previous_technique_name
  FROM techniques_with_unlock twu
  ORDER BY twu.special_bundle_id, twu.tech_position;
END;
$$;

-- ============================================
-- RPC функция для проверки доступа к технике из спец.пакета
-- ============================================

CREATE OR REPLACE FUNCTION check_special_technique_access(p_user_id UUID, p_technique_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT is_available INTO v_has_access
  FROM get_user_special_bundle_techniques(p_user_id)
  WHERE technique_id = p_technique_id
  LIMIT 1;

  RETURN COALESCE(v_has_access, FALSE);
END;
$$;

-- Гранты на выполнение функций
GRANT EXECUTE ON FUNCTION get_user_special_bundle_techniques(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_special_technique_access(UUID, UUID) TO authenticated;
