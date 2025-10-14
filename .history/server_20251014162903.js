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
app.use(cors({ origin: process.env.FRONTEND_URL }));

// --- ENV SETUP ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- ROUTE 1: Create Order ---
app.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: req.body.amount, // amount in paise
      currency: "INR",
      receipt: "dcb_" + Date.now(),
    };
    const order = await razorpay.orders.create(options);
    res.json({ key: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: options.amount });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating Razorpay order");
  }
});

// --- ROUTE 2: Verify Payment ---
app.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // ✅ Update Supabase orders table
    await supabase.from("orders").insert({
      razorpay_order_id,
      razorpay_payment_id,
      status: "Paid",
      created_at: new Date(),
    });

    // ✅ Trigger Meta CAPI
