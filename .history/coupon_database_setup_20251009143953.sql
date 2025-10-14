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
        RETURN QUERY SELECT false, 'Coupon is not valid at this time', 0::DECIMAL, coupon_record.id, coupon_record.coupon_name;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF coupon_record.usage_limit IS NOT NULL AND coupon_record.used_count >= coupon_record.usage_limit THEN
        RETURN QUERY SELECT false, 'Coupon usage limit reached', 0::DECIMAL, coupon_record.id, coupon_record.coupon_name;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_amount < coupon_record.minimum_order_amount THEN
        RETURN QUERY SELECT false, 
            format('Minimum order amount of %s required', coupon_record.minimum_order_amount), 
            0::DECIMAL, coupon_record.id, coupon_record.coupon_name;
        RETURN;
    END IF;
    
    -- Check first-time customer
    IF coupon_record.first_time_customer_only THEN
        SELECT COUNT(*) INTO previous_order_count
        FROM orders 
        WHERE customer_id = p_customer_id;
        
        IF previous_order_count > 0 THEN
            RETURN QUERY SELECT false, 'Coupon is for first-time customers only', 0::DECIMAL, coupon_record.id, coupon_record.coupon_name;
            RETURN;
        END IF;
    END IF;
    
    -- Check single use per customer
    IF coupon_record.single_use_per_customer THEN
        SELECT COUNT(*) INTO previous_usage_count
        FROM coupon_usage 
        WHERE coupon_id = coupon_record.id AND customer_id = p_customer_id;
        
        IF previous_usage_count > 0 THEN
            RETURN QUERY SELECT false, 'Coupon can only be used once per customer', 0::DECIMAL, coupon_record.id, coupon_record.coupon_name;
            RETURN;
        END IF;
    END IF;
    
    -- Calculate discount
    IF coupon_record.discount_type = 'percentage' THEN
        calculated_discount := p_order_amount * (coupon_record.discount_value / 100);
        IF coupon_record.maximum_discount_amount IS NOT NULL AND 
           calculated_discount > coupon_record.maximum_discount_amount THEN
            calculated_discount := coupon_record.maximum_discount_amount;
        END IF;
    ELSE
        calculated_discount := coupon_record.discount_value;
    END IF;
    
    -- Ensure discount doesn't exceed order amount
    calculated_discount := LEAST(calculated_discount, p_order_amount);
    
    RETURN QUERY SELECT true, NULL, calculated_discount, coupon_record.id, coupon_record.coupon_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to automatically update coupon usage count
CREATE OR REPLACE FUNCTION update_coupon_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE discount_coupons 
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = NEW.coupon_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to automatically update coupon usage count
DROP TRIGGER IF EXISTS trigger_update_coupon_usage_count ON coupon_usage;
CREATE TRIGGER trigger_update_coupon_usage_count
    AFTER INSERT ON coupon_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_usage_count();

-- 11. Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON discount_coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON discount_coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_id ON coupon_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- 12. Sample coupon data for testing (optional)
INSERT INTO discount_coupons (
    coupon_code, coupon_name, description, discount_type, discount_value, 
    minimum_order_amount, maximum_discount_amount, usage_limit,
    valid_from, valid_until, applicable_categories, first_time_customer_only, single_use_per_customer
) VALUES 
(
    'WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00,
    200.00, 100.00, 100,
