import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ["https://dcbchicken.com", "http://localhost:5500", "http://localhost:3000", "http://localhost:8081", "http://localhost:8080", "http://127.0.0.1:5500", "http://127.0.0.1:3000", "http://127.0.0.1:8080"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'menu-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/create-order", async (req, res) => {
  console.log("📦 Received create-order request:", req.body);
  
  try {
    if (!req.body.amount) {
      console.error("❌ Missing amount in request");
      return res.status(400).json({ error: "Amount is required" });
    }

    const options = { 
      amount: req.body.amount, 
      currency: "INR", 
      receipt: "dcb_" + Date.now() 
    };
    
    console.log("🔑 Creating Razorpay order with options:", options);
    
    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay order created:", order.id);
    
    res.json({ 
      key: process.env.RAZORPAY_KEY_ID, 
      orderId: order.id, 
      amount: options.amount 
    });
  } catch (err) {
    console.error("❌ Error creating Razorpay order:", err);
    res.status(500).json({ 
      error: "Error creating Razorpay order",
      details: err.message 
    });
  }
});

app.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                         .update(body.toString())
                         .digest("hex");

  if (expected === razorpay_signature) {
    // Payment verification successful
    res.json({
      success: true,
      message: "Payment verified successfully"
    });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("discount_coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// File upload endpoint for menu item images
app.post("/api/upload-image", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate the URL for the uploaded file
    // In production, this would be your VPS domain
    const baseUrl = process.env.VPS_BASE_URL || `http://localhost:8081`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename,
      message: "Image uploaded successfully"
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// 🔍 Search Customer Endpoint
app.post("/api/search-customer", async (req, res) => {
  const { mobile_number, email } = req.body;
  if (!mobile_number && !email) return res.status(400).json({ error: "Provide mobile or email" });

  try {
    const query = supabase.from("customers").select("*").limit(5);
    if (mobile_number) query.eq("mobile_number", mobile_number);
    if (email) query.eq("email", email);

    const { data, error } = await query;
    if (error) throw error;

    if (data.length > 0) res.json({ exists: true, customers: data });
    else res.json({ exists: false });
  } catch (error) {
    console.error("Error searching customer:", error);
    res.status(500).json({ error: "Failed to search customer" });
  }
});

// ✅ Create Customer Endpoint (already exists but ensuring it's present)
app.post("/api/create-customer", async (req, res) => {
  const { full_name, email, mobile_number } = req.body;
  console.log("Received request to create customer:", { full_name, email, mobile_number });

  if (!full_name || !mobile_number) {
    console.error("Validation failed: Full name and mobile number are required.");
    return res.status(400).json({ error: "Full name and mobile number are required" });
  }

  try {
    // Split full name into first and last name
    const nameParts = full_name.trim().split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || null;

    console.log("Inserting into Supabase:", { first_name, last_name, email, mobile_number });

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          first_name,
          last_name,
          email: email || null,
          mobile_number
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    console.log("Supabase insert success, data:", data);

    res.json({ 
      success: true, 
      data: data,
      message: "Customer created successfully" 
    });
  } catch (error) {
    console.error("Error creating customer:", error.message);
    res.status(500).json({ error: "Failed to create customer", details: error.message });
  }
});

// --- Inventory Management API Endpoints ---

// GET /inventory - Get all inventory items
app.get("/inventory", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /inventory/add-item - Add new inventory item
app.post("/inventory/add-item", async (req, res) => {
    try {
        const { name, stock, unit, minimum_stock, cost_per_unit, supplier_info } = req.body;
        
        if (!name || !unit || minimum_stock === undefined || cost_per_unit === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const itemData = {
            name: name.trim(),
            stock: parseFloat(stock) || 0,
            unit,
            minimum_stock: parseFloat(minimum_stock),
            cost_per_unit: parseFloat(cost_per_unit),
            supplier_info: supplier_info?.trim() || null,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('inventory')
            .insert([itemData])
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ error: 'Failed to add inventory item' });
    }
});

// POST /inventory/add-stock - Add stock (purchase)
app.post("/inventory/add-stock", async (req, res) => {
    try {
        const { ingredient_id, quantity, cost_per_unit, supplier, notes } = req.body;
        
        if (!ingredient_id || !quantity || !cost_per_unit || !supplier) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get current ingredient
        const { data: ingredient, error: ingredientError } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', ingredient_id)
            .single();

        if (ingredientError) throw ingredientError;
        if (!ingredient) {
            return res.status(404).json({ error: 'Ingredient not found' });
        }

        // Update inventory stock and cost
        const newStock = ingredient.stock + parseFloat(quantity);
        const { error: updateError } = await supabase
            .from('inventory')
            .update({
                stock: newStock,
                cost_per_unit: parseFloat(cost_per_unit),
                last_updated: new Date().toISOString()
            })
            .eq('id', ingredient_id);

        if (updateError) throw updateError;

        // Record purchase
        const purchaseData = {
            ingredient_id,
            quantity: parseFloat(quantity),
            cost_per_unit: parseFloat(cost_per_unit),
            total_cost: parseFloat(quantity) * parseFloat(cost_per_unit),
            supplier: supplier.trim(),
            notes: notes?.trim() || null,
            created_at: new Date().toISOString()
        };

        const { error: purchaseError } = await supabase
            .from('inventory_purchases')
            .insert([purchaseData]);

        if (purchaseError) throw purchaseError;

        res.json({ success: true, message: 'Stock added successfully' });
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({ error: 'Failed to add stock' });
    }
});

// POST /inventory/use-stock - Use stock (usage)
app.post("/inventory/use-stock", async (req, res) => {
    try {
        const { ingredient_id, quantity_used, usage_type, order_id, notes } = req.body;
        
        if (!ingredient_id || !quantity_used || !usage_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get current ingredient
        const { data: ingredient, error: ingredientError } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', ingredient_id)
            .single();

        if (ingredientError) throw ingredientError;
        if (!ingredient) {
            return res.status(404).json({ error: 'Ingredient not found' });
        }

        // Check stock availability
        if (ingredient.stock < parseFloat(quantity_used)) {
            return res.status(400).json({ error: 'Not enough stock available' });
        }

        // Update inventory stock
        const newStock = ingredient.stock - parseFloat(quantity_used);
        const { error: updateError } = await supabase
            .from('inventory')
            .update({
                stock: newStock,
                last_updated: new Date().toISOString()
            })
            .eq('id', ingredient_id);

        if (updateError) throw updateError;

        // Record usage
        const usageData = {
            ingredient_id,
            quantity_used: parseFloat(quantity_used),
            cost_incurred: parseFloat(quantity_used) * (ingredient.cost_per_unit || 0),
            usage_type,
            order_id: order_id?.trim() || null,
            notes: notes?.trim() || null,
            created_at: new Date().toISOString()
        };

        const { error: usageError } = await supabase
            .from('inventory_usage')
            .insert([usageData]);

        if (usageError) throw usageError;

        res.json({ success: true, message: 'Stock used successfully' });
    } catch (error) {
        console.error('Error using stock:', error);
        res.status(500).json({ error: 'Failed to use stock' });
    }
});

// GET /inventory/reports - Get inventory reports
app.get("/inventory/reports", async (req, res) => {
    try {
        const { period } = req.query;
        let startDate, endDate;

        // Calculate date range based on period
        switch (period) {
            case 'today':
                startDate = new Date();
                endDate = new Date();
                break;
            case 'yesterday':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 1);
                endDate = new Date();
                endDate.setDate(endDate.getDate() - 1);
                break;
            case 'last7':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                endDate = new Date();
                break;
            case 'last30':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                endDate = new Date();
                break;
            default:
                // Default to last 7 days
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                endDate = new Date();
        }

        // Fetch data for the period
        const [usageData, purchaseData] = await Promise.all([
            supabase
                .from('inventory_usage')
                .select('*')
                .gte('created_at', startDate.toISOString().split('T')[0])
                .lte('created_at', endDate.toISOString().split('T')[0]),
            supabase
                .from('inventory_purchases')
                .select('*')
                .gte('created_at', startDate.toISOString().split('T')[0])
                .lte('created_at', endDate.toISOString().split('T')[0])
        ]);

        if (usageData.error) throw usageData.error;
        if (purchaseData.error) throw purchaseData.error;

        // Get inventory for ingredient names
        const { data: inventory, error: inventoryError } = await supabase
            .from('inventory')
            .select('id, name');

        if (inventoryError) throw inventoryError;

        const report = {
            period,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            summary: {
                totalStockInQty: purchaseData.data.reduce((sum, purchase) => sum + purchase.quantity, 0),
                totalStockInValue: purchaseData.data.reduce((sum, purchase) => sum + purchase.total_cost, 0),
                totalStockOutQty: usageData.data.reduce((sum, usage) => sum + usage.quantity_used, 0),
                totalStockOutValue: usageData.data.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0),
                wastageQty: usageData.data.filter(usage => !usage.order_id).reduce((sum, usage) => sum + usage.quantity_used, 0),
                wastageValue: usageData.data.filter(usage => !usage.order_id).reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0),
                cogs: usageData.data.filter(usage => usage.order_id).reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0)
            },
            itemUsage: {},
            wastageBreakdown: usageData.data.filter(usage => !usage.order_id).map(usage => {
                const ingredient = inventory.find(item => item.id === usage.ingredient_id);
                return {
                    itemName: ingredient ? ingredient.name : 'Unknown',
                    quantity: usage.quantity_used,
                    cost: usage.cost_incurred || 0,
                    date: usage.created_at
                };
            })
        };

        // Calculate item-wise usage
        usageData.data.forEach(usage => {
            const ingredient = inventory.find(item => item.id === usage.ingredient_id);
            if (ingredient) {
                if (!report.itemUsage[ingredient.name]) {
                    report.itemUsage[ingredient.name] = {
                        stockIn: 0,
                        stockOut: 0,
                        wastage: 0,
                        cost: 0
                    };
                }
                report.itemUsage[ingredient.name].stockOut += usage.quantity_used;
                report.itemUsage[ingredient.name].cost += usage.cost_incurred || 0;
                
                if (!usage.order_id) {
                    report.itemUsage[ingredient.name].wastage += usage.quantity_used;
                }
            }
        });

        // Add purchase data to item usage
        purchaseData.data.forEach(purchase => {
            const ingredient = inventory.find(item => item.id === purchase.ingredient_id);
            if (ingredient && report.itemUsage[ingredient.name]) {
                report.itemUsage[ingredient.name].stockIn += purchase.quantity;
            }
        });

        res.json(report);
    } catch (error) {
        console.error('Error generating reports:', error);
        res.status(500).json({ error: 'Failed to generate reports' });
    }
});

// GET /inventory/dashboard - Get dashboard metrics
app.get("/inventory/dashboard", async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Fetch all required data
        const [inventoryData, todayUsage, weekUsage, purchases] = await Promise.all([
            supabase.from('inventory').select('*'),
            supabase
                .from('inventory_usage')
                .select('*')
                .gte('created_at', today),
            supabase
                .from('inventory_usage')
                .select('*')
                .gte('created_at', weekAgo.toISOString().split('T')[0]),
            supabase
                .from('inventory_purchases')
                .select('*')
                .gte('created_at', today)
        ]);

        if (inventoryData.error) throw inventoryData.error;
        if (todayUsage.error) throw todayUsage.error;
        if (weekUsage.error) throw weekUsage.error;
        if (purchases.error) throw purchases.error;

        // Calculate metrics
        const totalStockValue = inventoryData.data.reduce((sum, item) => {
            return sum + (item.stock * (item.cost_per_unit || 0));
        }, 0);

        const todayUsageCost = todayUsage.data.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);
        const weekUsageCost = weekUsage.data.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);
        const lowStockCount = inventoryData.data.filter(item => item.stock <= item.minimum_stock).length;
        const wastageCost = todayUsage.data.filter(usage => !usage.order_id).reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);
        const cogsToday = todayUsage.data.filter(usage => usage.order_id).reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);

        // Top 5 consumed ingredients today
        const ingredientUsage = {};
        todayUsage.data.forEach(usage => {
            const ingredient = inventoryData.data.find(item => item.id === usage.ingredient_id);
            if (ingredient) {
                if (!ingredientUsage[ingredient.name]) {
                    ingredientUsage[ingredient.name] = 0;
                }
                ingredientUsage[ingredient.name] += usage.quantity_used;
            }
        });

        const topIngredients = Object.entries(ingredientUsage)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));

        const dashboardData = {
            totalStockValue,
            todayUsageCost,
            weekUsageCost,
            lowStockCount,
            wastageCost,
            cogsToday,
            topIngredients
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 8083; // Use PORT from environment or default to 8083
app.listen(PORT, () => console.log(`✅ DCB Razorpay Server running on port ${PORT}`));
