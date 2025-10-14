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
    await supabase.from("orders").insert({
      razorpay_order_id,
      razorpay_payment_id,
      status: "Paid",
      created_at: new Date(),
    });

    await axios.post(`https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events`, {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: process.env.FRONTEND_URL,
        custom_data: { currency: "INR", value: 1 }
      }],
      access_token: process.env.META_ACCESS_TOKEN
    });

    res.json({
      success: true,
      redirectUrl: `${process.env.FRONTEND_URL}/order-status.html?order_id=${razorpay_order_id}`
    });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
});

app.listen(8080, () => console.log("✅ DCB Razorpay Server running on port 8080"));
