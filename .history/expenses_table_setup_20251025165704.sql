-- Create expenses table for DCB POS system
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_time TIME NOT NULL DEFAULT CURRENT_TIME,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    vendor_name TEXT,
    reference_number TEXT,
    is_raw_material BOOLEAN DEFAULT FALSE,
    inventory_item_id UUID REFERENCES inventory(id),
    quantity_used DECIMAL(10,3),
    unit TEXT,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    receipt_image_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_is_raw_material ON expenses(is_raw_material);
CREATE INDEX IF NOT EXISTS idx_expenses_inventory_item ON expenses(inventory_item_id);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policy for expenses (allow all operations for authenticated users)
CREATE POLICY "Allow all operations for authenticated users" ON expenses
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories
INSERT INTO expenses (category, subcategory, description, amount, total_amount, is_raw_material) VALUES
('Raw Materials', 'Chicken', 'Chicken Purchase', 0, 0, true),
('Raw Materials', 'Spices', 'Spices Purchase', 0, 0, true),
('Raw Materials', 'Vegetables', 'Vegetables Purchase', 0, 0, true),
('Raw Materials', 'Oil', 'Cooking Oil Purchase', 0, 0, true),
('Raw Materials', 'Flour', 'Flour Purchase', 0, 0, true),
('Utilities', 'Electricity', 'Electricity Bill', 0, 0, false),
('Utilities', 'Water', 'Water Bill', 0, 0, false),
('Utilities', 'Gas', 'Gas Cylinder', 0, 0, false),
('Rent', 'Shop Rent', 'Monthly Shop Rent', 0, 0, false),
('Staff', 'Salaries', 'Staff Salaries', 0, 0, false),
('Staff', 'Uniforms', 'Staff Uniforms', 0, 0, false),
('Marketing', 'Digital', 'Online Marketing', 0, 0, false),
('Marketing', 'Print', 'Flyers & Posters', 0, 0, false),
('Maintenance', 'Equipment', 'Equipment Repair', 0, 0, false),
('Maintenance', 'Kitchen', 'Kitchen Maintenance', 0, 0, false),
('Packaging', 'Boxes', 'Food Packaging', 0, 0, false),
('Packaging', 'Bags', 'Carry Bags', 0, 0, false),
('Other', 'Miscellaneous', 'Other Expenses', 0, 0, false)
ON CONFLICT DO NOTHING;
