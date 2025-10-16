# Razorpay Payment Gateway Integration Guide

## Overview

This document explains how the Razorpay payment gateway integration works in the Delhi Chicken Brothers POS system. When a user selects UPI payment method and clicks "Proceed to Checkout", they are redirected to the Razorpay payment gateway, and upon successful payment, they are redirected to the order status page with live order tracking.

## How It Works

### 1. Frontend Flow (index.html)

**Payment Method Selection:**
- User selects UPI as payment method in the cart sidebar
- Clicks "Proceed to Checkout" button

**Razorpay Checkout Trigger:**
- `triggerRazorpayCheckout()` function is called from `razorpay-checkout.js`
- Calculates total amount from cart (including any applied discounts)
- Sends request to backend to create Razorpay order
- Opens Razorpay payment modal

**Payment Handler:**
- After successful payment, Razorpay calls the handler function
- Payment is verified with backend
- Order is created in Supabase with status 'Accepted'
- User is redirected to `order-status.html` with order details

### 2. Backend Flow (server.js)

**Endpoints:**
- `POST /create-order` - Creates Razorpay order
- `POST /verify-payment` - Verifies payment signature

**Order Creation:**
- Uses Razorpay SDK to create orders
- Returns order ID and key to frontend

**Payment Verification:**
- Verifies payment signature using Razorpay webhook secret
- Ensures payment authenticity

### 3. Database Integration

**Orders Table:**
- `status` set to 'Accepted' for UPI payments (since payment is verified)
- `payment_mode` set to 'UPI'
- Transaction ID stored in `note` field

**Order Items:**
- All cart items are stored with quantities and prices
- Supports variants and custom pricing

## Key Features

### ✅ Payment Security
- Payment verification using Razorpay signatures
- Secure API key management
- Transaction ID tracking

### ✅ Order Management
- Automatic order creation after successful payment
- Real-time order status updates
- Live order tracking on order-status.html

### ✅ User Experience
- Seamless payment flow
- Clear order confirmation
- Live status updates with notifications

### ✅ Analytics Integration
- Facebook Pixel tracking for:
  - Add to Cart events
  - Initiate Checkout events
  - Purchase events

## Environment Variables Required

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxx
```

## Testing the Integration

### 1. Test Backend Endpoints
```bash
# Test order creation
curl -X POST https://dcb-pos-final.onrender.com/create-order \
  -H "Content-Type: application/json" \
  -d "{\"amount\": 10000}"

# Expected response:
{"key":"rzp_live_xxxxxxxx","orderId":"order_xxxxxxxx","amount":10000}
```

### 2. Test Frontend Flow
1. Add items to cart
2. Select UPI payment method
3. Click "Proceed to Checkout"
4. Complete payment in Razorpay modal
5. Verify redirection to order status page

### 3. Test Order Status Page
- Verify order details are displayed
- Check real-time status updates work
- Confirm notification permissions

## Troubleshooting

### Common Issues

1. **Payment Verification Failed**
   - Check Razorpay webhook secret
   - Verify signature calculation

2. **Order Not Created**
   - Check Supabase connection
   - Verify customer record exists
   - Check order items insertion

3. **Razorpay Modal Not Opening**
   - Check Razorpay script loading
   - Verify API key is correct
   - Check network connectivity

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify backend server is running
3. Check Supabase tables for order data
4. Test with test Razorpay credentials

## Deployment Notes

- Backend deployed on Render.com
- Frontend served from dcbchicken.com
- Uses production Razorpay keys
- SSL certificates properly configured

## Support

For payment-related issues, contact:
- Razorpay Support: support@razorpay.com
- Technical Support: 9211022131

## Security Considerations

- Never expose Razorpay key secret in frontend
- Always verify payment signatures
- Use HTTPS for all payment requests
- Store transaction IDs for audit trails
