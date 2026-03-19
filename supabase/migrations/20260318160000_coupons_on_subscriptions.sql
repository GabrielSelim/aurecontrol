-- Add coupon tracking to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS coupon_discount_applied numeric DEFAULT 0;

-- Allow authenticated users to read active coupons (for front-end preview)
-- The edge function re-validates server-side before applying.
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can validate coupons" ON discount_coupons;
CREATE POLICY "Authenticated users can validate coupons"
  ON discount_coupons
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  );

-- Master admins can manage coupons
DROP POLICY IF EXISTS "Master admins manage coupons" ON discount_coupons;
CREATE POLICY "Master admins manage coupons"
  ON discount_coupons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'master_admin'
    )
  );
