-- Добавляем поле technique_ids для поддержки множественной привязки техник к блоку
-- Сохраняем technique_id для обратной совместимости

-- Добавляем массив UUID для техник
ALTER TABLE lesson_blocks
ADD COLUMN IF NOT EXISTS technique_ids UUID[] DEFAULT '{}';

-- Миграция данных: копируем technique_id в technique_ids если он есть
UPDATE lesson_blocks
SET technique_ids = ARRAY[technique_id]
WHERE technique_id IS NOT NULL AND (technique_ids IS NULL OR technique_ids = '{}');

-- Индекс для поиска по массиву техник (GIN индекс для массивов)
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_technique_ids ON lesson_blocks USING GIN(technique_ids) WHERE technique_ids IS NOT NULL AND technique_ids != '{}';

COMMENT ON COLUMN lesson_blocks.technique_ids IS 'Массив ID техник (материалов) привязанных к этому блоку. Позволяет привязать несколько техник к одному блоку.';

-- Функция для автоматического удаления technique_id из technique_ids при удалении техники из tariff_module_materials
-- Триггер срабатывает когда техника удаляется из сетки модуля
CREATE OR REPLACE FUNCTION remove_technique_from_lesson_blocks()
RETURNS TRIGGER AS $$
DECLARE
    v_module_id UUID;
    v_technique_id UUID;
BEGIN
    v_technique_id := OLD.material_id;

    -- Получаем stream_module_id из tariff_stream_modules
    SELECT sm.id INTO v_module_id
    FROM tariff_stream_modules tsm
    JOIN stream_modules sm ON sm.id = tsm.stream_module_id
    WHERE tsm.id = OLD.tariff_stream_module_id;

    IF v_module_id IS NOT NULL THEN
        -- Удаляем technique_id из technique_ids в блоках уроков этого модуля
        UPDATE lesson_blocks lb
        SET technique_ids = array_remove(technique_ids, v_technique_id),
            technique_id = CASE
                WHEN technique_id = v_technique_id THEN NULL
                ELSE technique_id
            END
        FROM lessons l
        WHERE lb.lesson_id = l.id
          AND l.stream_module_id = v_module_id
          AND (lb.technique_id = v_technique_id OR v_technique_id = ANY(lb.technique_ids));
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер на удаление из tariff_module_materials
DROP TRIGGER IF EXISTS trigger_remove_technique_from_blocks ON tariff_module_materials;
CREATE TRIGGER trigger_remove_technique_from_blocks
    AFTER DELETE ON tariff_module_materials
    FOR EACH ROW
    EXECUTE FUNCTION remove_technique_from_lesson_blocks();

-- Аналогичный триггер для special_bundle_placements (когда удаляется размещение спец.пакета)
CREATE OR REPLACE FUNCTION remove_special_bundle_techniques_from_lesson_blocks()
RETURNS TRIGGER AS $$
DECLARE
    v_module_id UUID;
    v_technique_ids UUID[];
BEGIN
    -- Получаем все technique_id из спец.пакета
    SELECT ARRAY_AGG(sbt.technique_id) INTO v_technique_ids
    FROM special_bundle_techniques sbt
    WHERE sbt.special_bundle_id = OLD.special_bundle_id;

    -- Получаем stream_module_id из tariff_stream_modules
    SELECT sm.id INTO v_module_id
    FROM tariff_stream_modules tsm
    JOIN stream_modules sm ON sm.id = tsm.stream_module_id
    WHERE tsm.id = OLD.tariff_stream_module_id;

    IF v_module_id IS NOT NULL AND v_technique_ids IS NOT NULL THEN
        -- Удаляем все техники спец.пакета из блоков уроков этого модуля
        UPDATE lesson_blocks lb
        SET technique_ids = (
            SELECT COALESCE(array_agg(elem), '{}')
            FROM unnest(technique_ids) AS elem
            WHERE NOT (elem = ANY(v_technique_ids))
        ),
        technique_id = CASE
            WHEN technique_id = ANY(v_technique_ids) THEN NULL
            ELSE technique_id
        END
        FROM lessons l
        WHERE lb.lesson_id = l.id
          AND l.stream_module_id = v_module_id
          AND (lb.technique_id = ANY(v_technique_ids) OR technique_ids && v_technique_ids);
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер на удаление размещения спец.пакета
DROP TRIGGER IF EXISTS trigger_remove_special_bundle_techniques_from_blocks ON special_bundle_placements;
CREATE TRIGGER trigger_remove_special_bundle_techniques_from_blocks
    AFTER DELETE ON special_bundle_placements
    FOR EACH ROW
    EXECUTE FUNCTION remove_special_bundle_techniques_from_lesson_blocks();
