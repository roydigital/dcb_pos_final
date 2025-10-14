-- COUPON DATABASE SETUP & SECURITY POLICIES
-- Run this SQL in your Supabase SQL Editor to set up proper coupon security

-- 1. Add missing columns to orders table for coupon tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- 2. Create coupon_usage table for tracking coupon usage per customer
CREATE TABLE IF NOT EXISTS coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT NOT NULL REFERENCES discount_coupons(id),
    order_id BIGINT NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(user_id),
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combination to prevent duplicate usage
    UNIQUE(coupon_id, order_id),
    UNIQUE(coupon_id, customer_id) -- For single_use_per_customer enforcement
);

-- 3. Enable Row Level Security (RLS) for all tables
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for discount_coupons (Read-only for authenticated users)
CREATE POLICY "Authenticated users can view active coupons" ON discount_coupons
FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Policy: Service role (admin) can do everything
CREATE POLICY "Service role full access to coupons" ON discount_coupons
FOR ALL USING (auth.role() = 'service_role');

-- 5. RLS Policies for coupon_usage
-- Users can only see their own coupon usage
CREATE POLICY "Users can view own coupon usage" ON coupon_usage
FOR SELECT USING (customer_id = auth.uid());

-- Only service role can insert coupon usage records
CREATE POLICY "Service role can insert coupon usage" ON coupon_usage
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service role can update coupon usage
CREATE POLICY "Service role can update coupon usage" ON coupon_usage
FOR UPDATE USING (auth.role() = 'service_role');

-- Only service role can delete coupon usage
CREATE POLICY "Service role can delete coupon usage" ON coupon_usage
FOR DELETE USING (auth.role() = 'service_role');

-- 6. RLS Policies for orders
-- Users can only see their own orders
CREATE POLICY "Users can view own orders" ON orders
FOR SELECT USING (customer_id = auth.uid());

-- Service role can do everything with orders
CREATE POLICY "Service role full access to orders" ON orders
FOR ALL USING (auth.role() = 'service_role');

-- 7. RLS Policies for customers
-- Users can only see their own customer record
CREATE POLICY "Users can view own customer data" ON customers
FOR SELECT USING (user_id = auth.uid());

-- Service role can do everything with customers
CREATE POLICY "Service role full access to customers" ON customers
FOR ALL USING (auth.role() = 'service_role');

-- 8. Server-side coupon validation function
CREATE OR REPLACE FUNCTION validate_coupon_usage(
    p_coupon_code VARCHAR,
    p_customer_id UUID,
    p_order_amount DECIMAL
)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT,
    discount_amount DECIMAL,
    coupon_id BIGINT,
    coupon_name VARCHAR
) AS $$
DECLARE
    coupon_record discount_coupons%ROWTYPE;
    previous_usage_count INTEGER;
    previous_order_count INTEGER;
    calculated_discount DECIMAL;
BEGIN
    -- Get coupon details
    SELECT * INTO coupon_record 
    FROM discount_coupons 
    WHERE coupon_code = p_coupon_code AND is_active = true;
    
    IF coupon_record.id IS NULL THEN
        RETURN QUERY SELECT false, 'Coupon not found or inactive', 0::DECIMAL, 0::BIGINT, ''::VARCHAR;
        RETURN;
    END IF;
    
    -- Check validity dates
    IF NOW() < coupon_record.valid_from OR NOW() > coupon_record.valid_until THEN
