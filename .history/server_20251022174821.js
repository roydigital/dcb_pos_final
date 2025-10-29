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

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

app.listen(8081, () => console.log("✅ DCB Razorpay Server running on port 8081"));
