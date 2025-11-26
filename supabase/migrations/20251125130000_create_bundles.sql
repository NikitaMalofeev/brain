-- Migration: Create bundles system
-- Date: 2025-11-25
-- Description: Создание системы пакетов техник, которые можно назначать пользователям

-- Таблица пакетов
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_num INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица связи пакетов и материалов (техник)
CREATE TABLE IF NOT EXISTS bundle_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  order_num INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bundle_id, material_id)
);

-- Таблица связи пользователей и пакетов
CREATE TABLE IF NOT EXISTS user_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, bundle_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_bundle_materials_bundle_id ON bundle_materials(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_materials_material_id ON bundle_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_user_bundles_user_id ON user_bundles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bundles_bundle_id ON user_bundles(bundle_id);

-- RLS политики для bundles
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bundles" ON bundles;
CREATE POLICY "Admins can manage bundles"
  ON bundles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view bundles" ON bundles;
CREATE POLICY "Users can view bundles"
  ON bundles
  FOR SELECT
  USING (true);

-- RLS политики для bundle_materials
ALTER TABLE bundle_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bundle materials" ON bundle_materials;
CREATE POLICY "Admins can manage bundle materials"
  ON bundle_materials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view bundle materials" ON bundle_materials;
CREATE POLICY "Users can view bundle materials"
  ON bundle_materials
  FOR SELECT
  USING (true);

-- RLS политики для user_bundles
ALTER TABLE user_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage user bundles" ON user_bundles;
CREATE POLICY "Admins can manage user bundles"
  ON user_bundles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own bundles" ON user_bundles;
CREATE POLICY "Users can view their own bundles"
  ON user_bundles
  FOR SELECT
  USING (user_id = auth.uid());

-- Функция для получения материалов пользователя из пакетов
CREATE OR REPLACE FUNCTION get_user_bundle_materials(p_user_id UUID)
RETURNS TABLE (
  material_id UUID,
  material_name TEXT,
  material_type TEXT,
  bundle_id UUID,
  bundle_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as material_id,
    m.name as material_name,
    m.material_type as material_type,
    b.id as bundle_id,
    b.name as bundle_name
  FROM user_bundles ub
  JOIN bundles b ON b.id = ub.bundle_id
  JOIN bundle_materials bm ON bm.bundle_id = b.id
  JOIN materials m ON m.id = bm.material_id
  WHERE ub.user_id = p_user_id
  ORDER BY b.order_num, bm.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_bundle_materials IS 'Получает все материалы из пакетов, назначенных пользователю';

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Система пакетов создана:';
  RAISE NOTICE '   - bundles: таблица пакетов';
  RAISE NOTICE '   - bundle_materials: связь пакетов и материалов';
  RAISE NOTICE '   - user_bundles: назначение пакетов пользователям';
  RAISE NOTICE '   - get_user_bundle_materials(): функция для получения материалов пользователя';
END $$;
