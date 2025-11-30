-- Исправление foreign key для user_special_bundle_payments
-- user_id должен ссылаться на public.users, а не на auth.users

-- Удаляем старый foreign key
ALTER TABLE user_special_bundle_payments
  DROP CONSTRAINT IF EXISTS user_special_bundle_payments_user_id_fkey;

-- Добавляем новый foreign key на public.users
ALTER TABLE user_special_bundle_payments
  ADD CONSTRAINT user_special_bundle_payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Также исправим paid_by если нужно
ALTER TABLE user_special_bundle_payments
  DROP CONSTRAINT IF EXISTS user_special_bundle_payments_paid_by_fkey;

ALTER TABLE user_special_bundle_payments
  ADD CONSTRAINT user_special_bundle_payments_paid_by_fkey
  FOREIGN KEY (paid_by) REFERENCES public.users(id) ON DELETE SET NULL;
