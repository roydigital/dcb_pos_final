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
