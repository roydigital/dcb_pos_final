-- RLS Policy to allow authenticated users to manage discount coupons
-- This policy grants full access (SELECT, INSERT, UPDATE, DELETE) to the 'discount_coupons' table
-- for any user who is logged in (authenticated). This is suitable for a POS system where
-- all users are trusted staff members.

-- 1. Enable Row Level Security on the table (if not already enabled)
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that allows full access for authenticated users
CREATE POLICY "Allow full access for authenticated users"
ON public.discount_coupons
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- How to apply this fix:
-- 1. Go to your Supabase project dashboard.
-- 2. Navigate to the "SQL Editor".
-- 3. Click on "+ New query".
-- 4. Copy and paste the content of this file into the editor.
-- 5. Click "RUN".

