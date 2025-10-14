-- Discount Coupons Table for DCB POS
CREATE TABLE IF NOT EXISTS discount_coupons (
    id BIGSERIAL PRIMARY KEY,
    coupon_code VARCHAR(50) UNIQUE NOT NULL,
    coupon_name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    maximum_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applicable_categories TEXT[], -- Array of categories this coupon applies to
    applicable_items TEXT[], -- Array of specific item IDs this coupon applies to
    first_time_customer_only BOOLEAN DEFAULT false,
    single_use_per_customer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Usage Tracking Table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT REFERENCES discount_coupons(id),
    order_id BIGINT REFERENCES orders(id),
    customer_id UUID REFERENCES customers(user_id),
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add coupon fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON discount_coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON discount_coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_id ON coupon_usage(customer_id);

-- Function to update coupon usage count
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

-- Trigger to automatically update coupon usage count
CREATE OR REPLACE TRIGGER trigger_update_coupon_usage_count
    AFTER INSERT ON coupon_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_usage_count();

-- Sample coupon data for testing
INSERT INTO discount_coupons (
    coupon_code, coupon_name, description, discount_type, discount_value, 
    minimum_order_amount, maximum_discount_amount, usage_limit,
    valid_from, valid_until, applicable_categories, first_time_customer_only
) VALUES 
(
    'WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00,
    200.00, 100.00, 100,
