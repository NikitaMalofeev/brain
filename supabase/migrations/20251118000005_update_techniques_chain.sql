-- Migration: Update Techniques Chain
-- Date: 2025-11-18
-- Description: Обновление техник согласно новой цепочке доступов

-- Удаляем все существующие доступы (тестовые данные)
DELETE FROM public.user_technique_access;

-- Удаляем все существующие техники
DELETE FROM public.techniques;

-- === ТЕХНИКИ С ЦЕПОЧКОЙ ДОСТУПА ===

-- 1. Императрица - доступна к покупке сразу
INSERT INTO public.techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Императрица',
  'Аудиопрактика для раскрытия женской энергии',
  '/techniques/empress.mp3',
  '/techniques/empress-cover.jpg',
  1800,
  'purchasable',
  'https://brainprogramming.ru/buy/empress',
  'https://t.me/brainprogramming_sales',
  'Тестовый модуль',
  NULL,
  NULL,
  1
);

-- 2. Верховная жрица - доступна через 1 месяц после получения Императрицы
INSERT INTO public.techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Верховная жрица',
  'Углубленная практика для духовного развития',
  '/techniques/priestess.mp3',
  '/techniques/priestess-cover.jpg',
  2100,
  'locked',
  'https://brainprogramming.ru/buy/priestess',
  'https://t.me/brainprogramming_sales',
  'Тестовый модуль',
  'after_technique',
  '{"technique_id": "00000000-0000-0000-0000-000000000001", "duration_days": 30}',
  2
);

-- 3. Богиня - доступна через 1 месяц после получения Верховной жрицы
INSERT INTO public.techniques (
  id,
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Богиня',
  'Высшая практика для достижения мастерства',
  '/techniques/goddess.mp3',
  '/techniques/goddess-cover.jpg',
  2400,
  'locked',
  'https://brainprogramming.ru/buy/goddess',
  'https://t.me/brainprogramming_sales',
  'Тестовый модуль',
  'after_technique',
  '{"technique_id": "00000000-0000-0000-0000-000000000002", "duration_days": 30}',
  3
);

-- === ОСТАЛЬНЫЕ ТЕХНИКИ - ДОСТУПНЫ К ПОКУПКЕ СРАЗУ ===

-- 4. Медитация изобилия
INSERT INTO public.techniques (
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  'Медитация изобилия',
  'Практика для привлечения изобилия и благополучия',
  '/techniques/abundance.mp3',
  '/techniques/abundance-cover.jpg',
  1500,
  'purchasable',
  'https://brainprogramming.ru/buy/abundance',
  'https://t.me/brainprogramming_sales',
  'Тестовый модуль',
  NULL,
  NULL,
  4
);

-- 5. Уверенность и сила
INSERT INTO public.techniques (
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  'Уверенность и сила',
  'Аудиопрактика для развития внутренней силы',
  '/techniques/confidence.mp3',
  '/techniques/confidence-cover.jpg',
  1200,
  'purchasable',
  'https://brainprogramming.ru/buy/confidence',
  'https://t.me/brainprogramming_sales',
  'Тестовый модуль',
  NULL,
  NULL,
  5
);

-- 6. Исцеление сердца
INSERT INTO public.techniques (
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  purchase_url,
  upgrade_tariff_chat_url,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  'Исцеление сердца',
  'Практика для эмоционального исцеления и гармонии',
  '/techniques/healing.mp3',
  '/techniques/healing-cover.jpg',
  1800,
  'purchasable',
  'https://brainprogramming.ru/buy/healing',
  'https://t.me/brainprogramming_sales',
  'Тестовый модуль',
  NULL,
  NULL,
  6
);

-- === БЕСПЛАТНЫЕ ТЕХНИКИ ДЛЯ ВСЕХ ===

-- 7. Введение в медитацию (бесплатная)
INSERT INTO public.techniques (
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  'Введение в медитацию',
  'Вводная бесплатная практика для новичков',
  '/techniques/intro.mp3',
  '/techniques/intro-cover.jpg',
  900,
  'free',
  'Вводный модуль',
  NULL,
  NULL,
  0
);

-- 8. Дыхательная практика (бесплатная)
INSERT INTO public.techniques (
  title,
  description,
  audio_url,
  cover_image,
  duration_seconds,
  status,
  available_from_module,
  unlock_condition_type,
  unlock_condition_value,
  order_num
) VALUES (
  'Дыхательная практика',
  'Базовая дыхательная техника для релаксации',
  '/techniques/breathing.mp3',
  '/techniques/breathing-cover.jpg',
  600,
  'free',
  'Вводный модуль',
  NULL,
  NULL,
  0
);
