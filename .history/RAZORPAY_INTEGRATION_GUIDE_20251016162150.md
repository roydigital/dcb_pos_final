# Razorpay Payment Gateway Integration Guide

## Overview

This document explains how the Razorpay payment gateway integration works in the Delhi Chicken Brothers POS system. When a user selects UPI payment method and clicks "Proceed to Checkout", they are redirected to the Razorpay payment gateway, and upon successful payment, they are redirected to the order status page with live order tracking.

## How It Works

### 1. Frontend Flow (index.html)

**Payment Method Selection:**
- User selects UPI as payment method in the cart sidebar
- Clicks "Proceed to Checkout" button

**Razorpay Checkout Trigger:**
