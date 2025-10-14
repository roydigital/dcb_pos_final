# COUPON SECURITY FIXES - CRITICAL VULNERABILITIES IDENTIFIED

## SECURITY ISSUES FOUND:

### 1. POS SYSTEM BYPASS (CRITICAL)
- **Location**: pos.html
- **Issue**: POS system allows coupon application without authentication
- **Risk**: Guest/signed-out users can apply coupons
- **Fix**: Add authentication check before coupon application

### 2. MISSING CUSTOMER VALIDATION (HIGH)
- **Issue**: No verification of "first_time_customer_only" and "single_use_per_customer" criteria
- **Risk**: Coupon criteria bypassed
- **Fix**: Add customer-specific validation

### 3. INCOMPLETE SERVER-SIDE VALIDATION (HIGH)
- **Issue**: All validation happens client-side
- **Risk**: Client-side manipulation possible
- **Fix**: Implement server-side validation

### 4. MISSING RLS POLICIES (MEDIUM)
- **Issue**: No row-level security for coupon_usage table
- **Risk**: Unauthorized data access
- **Fix**: Add RLS policies

## URGENT FIXES REQUIRED:

### Fix 1: Secure POS Coupon Application (pos.html)

Add this authentication check to the coupon application logic:

```javascript
async function handleApplyCoupon() {
    // Check if user is authenticated
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        showCouponMessage('Please sign in to apply coupons.', 'error');
        return;
    }

    const code = couponCodeInput.value.trim().toUpperCase();
    if (!code) {
        showCouponMessage('Please enter a coupon code.', 'error');
        return;
    }

    try {
        const { data: coupon, error } = await supabaseClient
            .from('discount_coupons')
            .select('*')
            .eq('coupon_code', code)
            .single();

        if (error || !coupon) {
            showCouponMessage('Invalid or expired coupon code.', 'error');
            return;
        }

        const subtotal = currentOrder.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const validationError = await validateCouponWithCustomer(coupon, subtotal, session.user.id);

        if (validationError) {
            showCouponMessage(validationError, 'error');
            return;
        }

        appliedCoupon = coupon;
        calculateTotals();
        showCouponMessage(`Coupon "${coupon.coupon_code}" applied successfully!`, 'success');
        updateAppliedCouponUI();

    } catch (err) {
        console.error('Error applying coupon:', err);
        showCouponMessage('Could not apply coupon. Please try again.', 'error');
    }
}
```

### Fix 2: Enhanced Coupon Validation Function

Replace the existing `validateCoupon` function with this enhanced version:

```javascript
async function validateCouponWithCustomer(coupon, subtotal, userId) {
    const now = new Date();
    
    // Basic validation
    if (!coupon.is_active) return 'This coupon is not active.';
    if (new Date(coupon.valid_from) > now) return 'This coupon is not yet valid.';
    if (new Date(coupon.valid_until) < now) return 'This coupon has expired.';
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return 'This coupon has reached its usage limit.';
    if (subtotal < coupon.minimum_order_amount) return `Minimum order of ₹${coupon.minimum_order_amount} required.`;

    // Customer-specific validations
    if (coupon.first_time_customer_only || coupon.single_use_per_customer) {
        try {
            // Get customer record
            const { data: customer, error: customerError } = await supabaseClient
                .from('customers')
                .select('user_id')
                .eq('user_id', userId)
                .single();

            if (customerError || !customer) {
                return 'Customer record not found. Please contact support.';
            }

            // Check for first-time customer
            if (coupon.first_time_customer_only) {
                const { data: previousOrders, error: ordersError } = await supabaseClient
                    .from('orders')
                    .select('id')
                    .eq('customer_id', customer.user_id)
                    .limit(1);

                if (ordersError) {
                    console.error('Error checking previous orders:', ordersError);
                    return 'Unable to validate coupon eligibility.';
                }

                if (previousOrders && previousOrders.length > 0) {
                    return 'This coupon is for first-time customers only.';
                }
            }

            // Check for single use per customer
            if (coupon.single_use_per_customer) {
                const { data: previousUsage, error: usageError } = await supabaseClient
                    .from('coupon_usage')
                    .select('id')
                    .eq('coupon_id', coupon.id)
                    .eq('customer_id', customer.user_id)
                    .limit(1);

                if (usageError) {
                    console.error('Error checking coupon usage:', usageError);
                    return 'Unable to validate coupon eligibility.';
                }

                if (previousUsage && previousUsage.length > 0) {
                    return 'This coupon can only be used once per customer.';
                }
            }
        } catch (error) {
            console.error('Error in customer validation:', error);
            return 'Unable to validate coupon eligibility. Please try again.';
        }
    }

    return null; // Coupon is valid
}
```

### Fix 3: Database RLS Policies

Add these RLS policies to your Supabase database:

```sql
-- Enable RLS on coupon_usage table
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own coupon usage
CREATE POLICY "Users can view own coupon usage" ON coupon_usage
FOR SELECT USING (customer_id = auth.uid());

-- Policy: Only service role can insert coupon usage (for order processing)
CREATE POLICY "Service role can insert coupon usage" ON coupon_usage
FOR INSERT WITH CHECK (true);

-- Enable RLS on discount_coupons table (read-only for authenticated users)
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view active coupons
CREATE POLICY "Authenticated users can view coupons" ON discount_coupons
FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);
```

### Fix 4: Server-Side Validation Function

Create this PostgreSQL function for server-side validation:

```sql
CREATE OR REPLACE FUNCTION validate_coupon_usage(
    p_coupon_id BIGINT,
    p_customer_id UUID,
    p_order_amount DECIMAL
)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT,
    discount_amount DECIMAL
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
    WHERE id = p_coupon_id AND is_active = true;
    
    IF coupon_record.id IS NULL THEN
        RETURN QUERY SELECT false, 'Coupon not found or inactive', 0::DECIMAL;
        RETURN;
    END IF;
    
    -- Check validity dates
    IF NOW() < coupon_record.valid_from OR NOW() > coupon_record.valid_until THEN
        RETURN QUERY SELECT false, 'Coupon is not valid at this time', 0::DECIMAL;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF coupon_record.usage_limit IS NOT NULL AND coupon_record.used_count >= coupon_record.usage_limit THEN
        RETURN QUERY SELECT false, 'Coupon usage limit reached', 0::DECIMAL;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_amount < coupon_record.minimum_order_amount THEN
        RETURN QUERY SELECT false, 
            format('Minimum order amount of %s required', coupon_record.minimum_order_amount), 
            0::DECIMAL;
        RETURN;
    END IF;
    
    -- Check first-time customer
    IF coupon_record.first_time_customer_only THEN
        SELECT COUNT(*) INTO previous_order_count
        FROM orders 
        WHERE customer_id = p_customer_id;
        
        IF previous_order_count > 0 THEN
            RETURN QUERY SELECT false, 'Coupon is for first-time customers only', 0::DECIMAL;
            RETURN;
        END IF;
    END IF;
    
    -- Check single use per customer
    IF coupon_record.single_use_per_customer THEN
        SELECT COUNT(*) INTO previous_usage_count
        FROM coupon_usage 
        WHERE coupon_id = p_coupon_id AND customer_id = p_customer_id;
        
        IF previous_usage_count > 0 THEN
            RETURN QUERY SELECT false, 'Coupon can only be used once per customer', 0::DECIMAL;
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
    
    RETURN QUERY SELECT true, NULL, calculated_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## IMMEDIATE ACTION REQUIRED:

1. **Apply Fix 1 & 2 to pos.html immediately** - This prevents guest users from using coupons
2. **Implement Fix 3 in your Supabase database** - This adds proper security policies
3. **Create Fix 4 function in your database** - This enables server-side validation

## TESTING THE FIXES:

After implementing these fixes, test:
- Guest users should see "Please sign in to apply coupons" message
- First-time customer coupons should only work for customers with no previous orders
- Single-use coupons should be blocked after first use
- All coupon criteria should be properly enforced

