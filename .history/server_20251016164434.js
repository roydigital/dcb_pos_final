import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ["https://dcbchicken.com", "http://localhost:5500", "http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/create-order", async (req, res) => {
  try {
    const options = { amount: req.body.amount, currency: "INR", receipt: "dcb_" + Date.now() };
    const order = await razorpay.orders.create(options);
    res.json({ key: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: options.amount });
  } catch (err) {
    res.status(500).send("Error creating Razorpay order");
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

app.listen(8081, () => console.log("✅ DCB Razorpay Server running on port 8081"));
