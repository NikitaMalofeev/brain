-- Migration: Fix bundles to use techniques instead of materials
-- Date: 2025-11-25
-- Description: Исправление системы пакетов для работы с техниками вместо материалов

-- Удаляем старую таблицу bundle_materials
DROP TABLE IF EXISTS bundle_materials CASCADE;

-- Создаем новую таблицу bundle_techniques
CREATE TABLE IF NOT EXISTS bundle_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  order_num INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bundle_id, technique_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_bundle_techniques_bundle_id ON bundle_techniques(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_techniques_technique_id ON bundle_techniques(technique_id);

-- RLS политики для bundle_techniques
ALTER TABLE bundle_techniques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bundle techniques" ON bundle_techniques;
CREATE POLICY "Admins can manage bundle techniques"
  ON bundle_techniques
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view bundle techniques" ON bundle_techniques;
CREATE POLICY "Users can view bundle techniques"
  ON bundle_techniques
  FOR SELECT
  USING (true);

-- Обновляем функцию для получения техник пользователя из пакетов
DROP FUNCTION IF EXISTS get_user_bundle_materials(UUID);

CREATE OR REPLACE FUNCTION get_user_bundle_techniques(p_user_id UUID)
RETURNS TABLE (
  technique_id UUID,
  technique_name TEXT,
  material_type TEXT,
  bundle_id UUID,
  bundle_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as technique_id,
    t.name as technique_name,
    t.material_type as material_type,
    b.id as bundle_id,
    b.name as bundle_name
  FROM user_bundles ub
  JOIN bundles b ON b.id = ub.bundle_id
  JOIN bundle_techniques bt ON bt.bundle_id = b.id
  JOIN materials t ON t.id = bt.technique_id
  WHERE ub.user_id = p_user_id
  ORDER BY b.order_num, bt.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_bundle_techniques IS 'Получает все техники из пакетов, назначенных пользователю';

-- Информация
DO $$
BEGIN
  RAISE NOTICE '✅ Система пакетов исправлена:';
  RAISE NOTICE '   - bundle_techniques: связь пакетов и техник (вместо материалов)';
  RAISE NOTICE '   - get_user_bundle_techniques(): функция для получения техник пользователя';
END $$;
