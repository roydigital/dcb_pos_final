-- FIX FOR MISSING COUPON COLUMNS IN ORDERS TABLE
-- Run this SQL in your Supabase SQL Editor to add the missing columns

-- 1. First, check if the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('coupon_code', 'discount_amount');

-- 2. If the above query returns no rows for these columns, then add them:
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- 3. Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('coupon_code', 'discount_amount');

-- 4. If you're still having issues, try dropping and recreating the columns:
-- ALTER TABLE orders DROP COLUMN IF EXISTS coupon_code;
-- ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;
-- ALTER TABLE orders 
-- ADD COLUMN coupon_code VARCHAR(50),
-- ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;

-- 5. Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;

-- 6. Clear any cached schema (this helps with the schema cache error)
-- No direct SQL command for this, but you can:
-- - Wait 1-2 minutes after running the ALTER TABLE
-- - Refresh your browser page
-- - Restart your Supabase local development if using local
-- - Clear browser cache and hard refresh (Ctrl+F5)

-- 7. Test the columns work
INSERT INTO orders (grand_total, payment_mode, order_type, status, coupon_code, discount_amount)
