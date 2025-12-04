-- Добавляем поле animation_url для хранения mp4 анимации в плеере техники
-- Поле добавляется в таблицу materials (объединённая таблица techniques + materials)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS animation_url TEXT DEFAULT NULL;

COMMENT ON COLUMN materials.animation_url IS 'URL mp4 видео-анимации для отображения на фоне плеера техники';

-- Создаём view techniques для обратной совместимости с кодом админки
CREATE OR REPLACE VIEW techniques AS
SELECT
  id,
  name AS title,
  description,
  cover_image_path AS cover_image,
  audio_url,
  animation_url,
  duration_seconds,
  material_type,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num,
  is_standalone,
  course_id,
  release_date,
  created_at,
  updated_at
FROM materials
WHERE material_type = 'audio';

COMMENT ON VIEW techniques IS 'View для обратной совместимости - показывает audio материалы как техники';

-- Создаём INSTEAD OF триггеры для поддержки INSERT/UPDATE/DELETE через view

-- Триггер для INSERT
CREATE OR REPLACE FUNCTION techniques_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO materials (
    name, description, cover_image_path, audio_url, animation_url, duration_seconds,
    material_type, status, purchase_url, upgrade_tariff_chat_url,
    available_from_module, unlock_condition_type, unlock_condition_value,
    order_num, is_standalone, course_id, release_date
  ) VALUES (
    NEW.title, NEW.description, NEW.cover_image, NEW.audio_url, NEW.animation_url, NEW.duration_seconds,
    'audio', COALESCE(NEW.status, 'purchasable'), NEW.purchase_url, NEW.upgrade_tariff_chat_url,
    NEW.available_from_module, NEW.unlock_condition_type, NEW.unlock_condition_value,
    COALESCE(NEW.order_num, 0), COALESCE(NEW.is_standalone, false), NEW.course_id, NEW.release_date
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS techniques_insert ON techniques;
CREATE TRIGGER techniques_insert
  INSTEAD OF INSERT ON techniques
  FOR EACH ROW
  EXECUTE FUNCTION techniques_insert_trigger();

-- Триггер для UPDATE
CREATE OR REPLACE FUNCTION techniques_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materials SET
    name = NEW.title,
    description = NEW.description,
    cover_image_path = NEW.cover_image,
    audio_url = NEW.audio_url,
    animation_url = NEW.animation_url,
    duration_seconds = NEW.duration_seconds,
    status = NEW.status,
    purchase_url = NEW.purchase_url,
    upgrade_tariff_chat_url = NEW.upgrade_tariff_chat_url,
    available_from_module = NEW.available_from_module,
    unlock_condition_type = NEW.unlock_condition_type,
    unlock_condition_value = NEW.unlock_condition_value,
    order_num = NEW.order_num,
    is_standalone = NEW.is_standalone,
    course_id = NEW.course_id,
    release_date = NEW.release_date,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS techniques_update ON techniques;
CREATE TRIGGER techniques_update
  INSTEAD OF UPDATE ON techniques
  FOR EACH ROW
  EXECUTE FUNCTION techniques_update_trigger();

-- Триггер для DELETE
CREATE OR REPLACE FUNCTION techniques_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM materials WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS techniques_delete ON techniques;
CREATE TRIGGER techniques_delete
  INSTEAD OF DELETE ON techniques
  FOR EACH ROW
  EXECUTE FUNCTION techniques_delete_trigger();
