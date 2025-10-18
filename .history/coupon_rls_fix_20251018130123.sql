-- COUPON RLS FIX FOR POS SYSTEM
-- This script fixes the Row Level Security policy to allow coupon creation
-- while maintaining proper security controls

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view active coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Service role full access to coupons" ON discount_coupons;

-- 2. Create new policies that allow authenticated users to manage coupons
-- Policy for SELECT: Allow authenticated users to view all coupons (not just active ones)
CREATE POLICY "Authenticated users can view all coupons" ON discount_coupons
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for INSERT: Allow authenticated users to create new coupons
CREATE POLICY "Authenticated users can create coupons" ON discount_coupons
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for UPDATE: Allow authenticated users to update coupons
CREATE POLICY "Authenticated users can update coupons" ON discount_coupons
FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for DELETE: Allow authenticated users to delete coupons
CREATE POLICY "Authenticated users can delete coupons" ON discount_coupons
FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Keep service role policy for full access (for admin operations)
CREATE POLICY "Service role full access to coupons" ON discount_coupons
FOR ALL USING (auth.role() = 'service_role');

-- 4. Update permissions to ensure authenticated users can perform operations
GRANT INSERT, UPDATE, DELETE ON discount_coupons TO authenticated;

-- 5. Verify the setup by checking current policies
COMMENT ON TABLE discount_coupons IS 'Discount coupons table with proper RLS for POS system access';

-- How to apply this fix:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to the "SQL Editor"
-- 3. Click on "+ New query"
-- 4. Copy and paste this entire script
-- 5. Click "RUN"

-- After applying this fix, the coupon creation should work without RLS violations
