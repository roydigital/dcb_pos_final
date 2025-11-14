-- Inventory Purchases Table Setup for DCB POS
-- This SQL creates the inventory_purchases table for tracking stock purchases

CREATE TABLE IF NOT EXISTS public.inventory_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    cost_per_unit NUMERIC NOT NULL CHECK (cost_per_unit >= 0),
    total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
    supplier TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_ingredient_id ON public.inventory_purchases(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_created_at ON public.inventory_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_supplier ON public.inventory_purchases(supplier);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow all operations for authenticated users (adjust as per your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON public.inventory_purchases
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow read access for anon users (if needed for your app)
CREATE POLICY "Allow read access for anon users" ON public.inventory_purchases
    FOR SELECT
    TO anon
    USING (true);

-- Add comments to the table and columns
COMMENT ON TABLE public.inventory_purchases IS 'Tracks inventory purchases and stock additions';
COMMENT ON COLUMN public.inventory_purchases.ingredient_id IS 'Foreign key to inventory table';
COMMENT ON COLUMN public.inventory_purchases.quantity IS 'Quantity purchased';
COMMENT ON COLUMN public.inventory_purchases.cost_per_unit IS 'Cost per unit at time of purchase';
COMMENT ON COLUMN public.inventory_purchases.total_cost IS 'Total cost (quantity * cost_per_unit)';
COMMENT ON COLUMN public.inventory_purchases.supplier IS 'Supplier name';
COMMENT ON COLUMN public.inventory_purchases.notes IS 'Additional notes about the purchase';

-- Optional: Create a view for purchase summaries
CREATE OR REPLACE VIEW public.inventory_purchase_summary AS
SELECT 
    ip.ingredient_id,
    i.name as ingredient_name,
    i.unit,
    SUM(ip.quantity) as total_quantity_purchased,
    AVG(ip.cost_per_unit) as avg_cost_per_unit,
    SUM(ip.total_cost) as total_cost,
    COUNT(ip.id) as purchase_count,
    MAX(ip.created_at) as last_purchase_date
FROM public.inventory_purchases ip
JOIN public.inventory i ON ip.ingredient_id = i.id
GROUP BY ip.ingredient_id, i.name, i.unit;

-- Optional: Create a view for monthly purchase reports
CREATE OR REPLACE VIEW public.monthly_purchase_reports AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    ingredient_id,
    i.name as ingredient_name,
    i.unit,
    SUM(quantity) as monthly_quantity,
    AVG(cost_per_unit) as avg_monthly_cost,
    SUM(total_cost) as monthly_total_cost,
    COUNT(*) as monthly_purchase_count
FROM public.inventory_purchases ip
JOIN public.inventory i ON ip.ingredient_id = i.id
GROUP BY DATE_TRUNC('month', created_at), ingredient_id, i.name, i.unit
ORDER BY month DESC, monthly_total_cost DESC;
