-- ============================================
-- Объединение materials и techniques в единую таблицу materials
-- ============================================
-- Дата: 2025-11-25
-- Описание: Объединяем таблицы materials и techniques в одну сущность
-- Techniques становится устаревшей таблицей, все данные переносим в materials

-- ========== ШАГ 1: Переименовываем старую таблицу materials ==========
ALTER TABLE IF EXISTS public.materials RENAME TO materials_old;

-- ========== ШАГ 2: Переименовываем techniques в materials ==========
ALTER TABLE public.techniques RENAME TO materials;

-- ========== ШАГ 3: Переименовываем поля для унификации ==========
-- title -> name (для соответствия старой таблице materials)
ALTER TABLE public.materials RENAME COLUMN title TO name;

-- cover_image -> cover_image_path (для соответствия старой таблице)
ALTER TABLE public.materials RENAME COLUMN cover_image TO cover_image_path;

-- ========== ШАГ 4: Добавляем недостающие поля если их нет ==========
-- Эти поля уже добавлены в миграции 20251120000001, но на всякий случай проверяем
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS material_type TEXT DEFAULT 'audio' CHECK (material_type IN ('video', 'audio')),
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ;

-- Делаем audio_url nullable для video материалов
ALTER TABLE public.materials ALTER COLUMN audio_url DROP NOT NULL;

-- ========== ШАГ 5: Мигрируем данные из materials_old ==========
-- Переносим старые materials в новую объединённую таблицу
INSERT INTO public.materials (
    id, name, description, cover_image_path, material_type,
    order_num, course_id, release_date, created_at, updated_at,
    -- Техничные поля, которых не было в старых materials (ставим defaults)
    audio_url, duration_seconds, status, purchase_url,
    upgrade_tariff_chat_url, available_from_module,
    unlock_condition_type, unlock_condition_value
)
SELECT
    id, name, description, cover_image_path, material_type,
    order_num, course_id, release_date, created_at, updated_at,
    -- Defaults для новых полей
    NULL as audio_url, -- старые materials не имели audio_url
    NULL as duration_seconds,
    'free' as status, -- старые materials были бесплатными через тарифы
    NULL as purchase_url,
    NULL as upgrade_tariff_chat_url,
    NULL as available_from_module,
    NULL as unlock_condition_type,
    NULL as unlock_condition_value
FROM public.materials_old
WHERE NOT EXISTS (
    SELECT 1 FROM public.materials WHERE id = materials_old.id
);

-- ========== ШАГ 6: Обновляем связанные таблицы ==========

-- 6.1. Переименовываем technique_blocks в material_blocks (если еще не существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'technique_blocks') THEN
        -- Если material_blocks уже существует, переносим данные
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'material_blocks') THEN
            INSERT INTO public.material_blocks (
                id, material_id, order_num, title, block_type,
                content_text, content_url, meta_json, created_at, updated_at
            )
            SELECT
                id, technique_id as material_id, order_num, title, block_type,
                content_text, content_url, meta_json, created_at, NOW() as updated_at
            FROM public.technique_blocks
            WHERE NOT EXISTS (
                SELECT 1 FROM public.material_blocks WHERE id = technique_blocks.id
            );

            DROP TABLE public.technique_blocks;
        ELSE
            -- Просто переименовываем
            ALTER TABLE public.technique_blocks RENAME TO material_blocks;
            ALTER TABLE public.material_blocks RENAME COLUMN technique_id TO material_id;

            -- Добавляем updated_at если его нет
            ALTER TABLE public.material_blocks
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- 6.2. Обновляем индексы для material_blocks
DROP INDEX IF EXISTS idx_technique_blocks_technique_id;
DROP INDEX IF EXISTS idx_technique_blocks_order;
CREATE INDEX IF NOT EXISTS idx_material_blocks_material_id ON public.material_blocks(material_id);
CREATE INDEX IF NOT EXISTS idx_material_blocks_order ON public.material_blocks(material_id, order_num);

-- 6.3. Переименовываем user_technique_access в user_material_access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_technique_access') THEN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_material_access') THEN
            -- Если таблица уже существует, переносим данные
            INSERT INTO public.user_material_access (
                id, user_id, material_id, granted_at, expires_at, access_source, created_at
            )
            SELECT
                id, user_id, technique_id as material_id, granted_at, expires_at, access_source, created_at
            FROM public.user_technique_access
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_material_access
                WHERE user_id = user_technique_access.user_id
                AND material_id = user_technique_access.technique_id
            );

            DROP TABLE public.user_technique_access;
        ELSE
            -- Просто переименовываем
            ALTER TABLE public.user_technique_access RENAME TO user_material_access;
            ALTER TABLE public.user_material_access RENAME COLUMN technique_id TO material_id;
        END IF;
    END IF;
END $$;

-- Обновляем индексы для user_material_access
DROP INDEX IF EXISTS idx_user_technique_access_user;
DROP INDEX IF EXISTS idx_user_technique_access_technique;
CREATE INDEX IF NOT EXISTS idx_user_material_access_user ON public.user_material_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_material_access_material ON public.user_material_access(material_id);

-- 6.4. Переименовываем technique_tariff_access в material_tariff_access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'technique_tariff_access') THEN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'material_tariff_access') THEN
            -- Если таблица уже существует, переносим данные
            INSERT INTO public.material_tariff_access (
                id, material_id, tariff_id, created_at
            )
            SELECT
                id, technique_id as material_id, tariff_id, created_at
            FROM public.technique_tariff_access
            WHERE NOT EXISTS (
                SELECT 1 FROM public.material_tariff_access
                WHERE material_id = technique_tariff_access.technique_id
                AND tariff_id = technique_tariff_access.tariff_id
            );

            DROP TABLE public.technique_tariff_access;
        ELSE
            -- Просто переименовываем
            ALTER TABLE public.technique_tariff_access RENAME TO material_tariff_access;
            ALTER TABLE public.material_tariff_access RENAME COLUMN technique_id TO material_id;
        END IF;
    END IF;
END $$;

-- Обновляем индексы для material_tariff_access
DROP INDEX IF EXISTS idx_technique_tariff_access_technique;
DROP INDEX IF EXISTS idx_technique_tariff_access_tariff;
CREATE INDEX IF NOT EXISTS idx_material_tariff_access_material ON public.material_tariff_access(material_id);
CREATE INDEX IF NOT EXISTS idx_material_tariff_access_tariff ON public.material_tariff_access(tariff_id);

-- 6.5. Переименовываем stream_module_techniques в stream_module_materials
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stream_module_techniques') THEN
        -- Удаляем старые данные из module_materials которые дублируются
        -- Оставляем stream_module_materials как источник истины для привязки к модулям
        ALTER TABLE public.stream_module_techniques RENAME TO stream_module_materials_temp;

        -- Удаляем старую таблицу module_materials если она есть
        DROP TABLE IF EXISTS public.module_materials;

        -- Переименовываем temp в module_materials
        ALTER TABLE public.stream_module_materials_temp RENAME TO module_materials;

        -- Переименовываем колонки
        ALTER TABLE public.module_materials RENAME COLUMN stream_module_id TO module_id;
        ALTER TABLE public.module_materials RENAME COLUMN technique_id TO material_id;
        ALTER TABLE public.module_materials RENAME COLUMN unlock_day TO release_day;

        -- Добавляем active_days если его нет
        ALTER TABLE public.module_materials
        ADD COLUMN IF NOT EXISTS active_days INTEGER DEFAULT NULL;
    END IF;
END $$;

-- Обновляем индексы для module_materials
DROP INDEX IF EXISTS idx_stream_module_techniques_stream_module;
DROP INDEX IF EXISTS idx_stream_module_techniques_technique;
CREATE INDEX IF NOT EXISTS idx_module_materials_module ON public.module_materials(module_id);
CREATE INDEX IF NOT EXISTS idx_module_materials_material ON public.module_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_module_materials_order ON public.module_materials(module_id, order_num);

-- 6.6. Переименовываем tariff_module_techniques в tariff_module_materials
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tariff_module_techniques') THEN
        ALTER TABLE public.tariff_module_techniques RENAME TO tariff_module_materials;
        ALTER TABLE public.tariff_module_materials RENAME COLUMN technique_id TO material_id;
    END IF;
END $$;

-- ========== ШАГ 7: Обновляем триггеры и функции ==========

-- Переименовываем функцию update_techniques_updated_at
DROP TRIGGER IF EXISTS trigger_update_techniques_updated_at ON public.materials;
DROP FUNCTION IF EXISTS update_techniques_updated_at();

CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_materials_updated_at();

-- ========== ШАГ 8: Обновляем комментарии ==========

COMMENT ON TABLE public.materials IS 'Материалы (техники, аудио, видео) с условным доступом и блоками контента';
COMMENT ON COLUMN public.materials.name IS 'Название материала';
COMMENT ON COLUMN public.materials.material_type IS 'Тип материала: video или audio';
COMMENT ON COLUMN public.materials.audio_url IS 'URL аудиофайла (для аудио материалов)';
COMMENT ON COLUMN public.materials.status IS 'Статус: free (бесплатный), purchasable (доступен к покупке), locked (заблокирован по условию)';
COMMENT ON COLUMN public.materials.unlock_condition_type IS 'Тип условия разблокировки: after_technique (после получения другого материала), after_duration (через время)';
COMMENT ON COLUMN public.materials.unlock_condition_value IS 'Параметры условия в формате JSON';

-- ========== ШАГ 9: Удаляем старые индексы и таблицы ==========

-- Удаляем старые индексы от techniques
DROP INDEX IF EXISTS idx_techniques_status;
DROP INDEX IF EXISTS idx_techniques_order;

-- Создаем новые индексы
CREATE INDEX IF NOT EXISTS idx_materials_status ON public.materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_order ON public.materials(order_num);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_course ON public.materials(course_id);

-- Удаляем старую таблицу materials_old (если все прошло успешно)
-- DROP TABLE IF EXISTS public.materials_old;

-- ========== ИНФОРМАЦИЯ ==========
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция завершена успешно!';
  RAISE NOTICE 'Таблицы объединены:';
  RAISE NOTICE '  - materials (новая объединенная таблица)';
  RAISE NOTICE '  - material_blocks (объединенные блоки)';
  RAISE NOTICE '  - user_material_access (доступ пользователей)';
  RAISE NOTICE '  - material_tariff_access (доступ по тарифам)';
  RAISE NOTICE '  - module_materials (привязка к модулям)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ Старая таблица materials_old сохранена для безопасности';
  RAISE NOTICE '   Удалите её вручную после проверки: DROP TABLE public.materials_old;';
END $$;
