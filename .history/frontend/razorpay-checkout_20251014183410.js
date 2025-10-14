// Razorpay Payment Integration
function initRazorpayPayment() {
  const checkoutButton = document.getElementById("proceedCheckout");

  if (!checkoutButton) {
    console.error("Checkout button not found");
    return;
  }

  // Remove any existing event listeners to prevent conflicts
  const newCheckoutButton = checkoutButton.cloneNode(true);
  checkoutButton.parentNode.replaceChild(newCheckoutButton, checkoutButton);

  newCheckoutButton.addEventListener("click", async function () {
    console.log("Razorpay checkout button clicked");
    
    try {
      // Check if supabaseClient is available
      if (typeof supabaseClient === 'undefined') {
        console.error('supabaseClient is not defined. Make sure it is initialized in the main script.');
        alert('Payment system is not ready. Please refresh the page and try again.');
        return;
      }
      
      // Check if user is logged in
      // Check if cart is empty
      const cartTotalElement = document.getElementById("cart-total");
      if (!cartTotalElement) {
        alert("Cart is empty. Please add items before checking out.");
        return;
      }

      const totalText = cartTotalElement.textContent.replace('₹', '');
      const totalAmount = parseFloat(totalText) * 100; // Convert to paise

      if (totalAmount <= 0) {
        alert("Cart is empty. Please add items before checking out.");
        return;
      }

      console.log("Total amount for Razorpay:", totalAmount);

      // Disable button and show processing
      newCheckoutButton.disabled = true;
      newCheckoutButton.innerHTML = `<div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Processing...`;

      // Get payment method
      const paymentMode = document.querySelector('input[name="paymentMethod"]:checked').value;
      
      if (paymentMode !== "UPI") {
        alert("Razorpay integration is only for UPI payments. Please select UPI payment method.");
        newCheckoutButton.disabled = false;
        newCheckoutButton.innerHTML = `
          <i data-lucide="lock" class="h-5 w-5"></i>
          Proceed to Checkout
        `;
        lucide.createIcons();
        return;
      }

      console.log("Creating Razorpay order with amount:", totalAmount);

      // Create Razorpay order
      const response = await fetch("https://dcb-pos-final.onrender.com/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Razorpay order created:", data);

      if (!data.key || !data.orderId || !data.amount) {
        throw new Error("Invalid response from Razorpay server");
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: "INR",
        name: "Delhi Chicken Brothers",
        description: "Order Payment",
        order_id: data.orderId,
        handler: async function (paymentResponse) {
          console.log("Payment response:", paymentResponse);
          
          try {
            const verifyRes = await fetch("https://dcb-pos-final.onrender.com/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paymentResponse),
            });

            const verifyData = await verifyRes.json();
            console.log("Verification response:", verifyData);

            if (verifyData.success) {
              // Clear cart and redirect
              localStorage.removeItem('dcb_unauthenticated_cart');
              window.location.href = verifyData.redirectUrl;
            } else {
              alert("Payment verification failed! Please contact support.");
            }
          } catch (verifyError) {
            console.error("Verification error:", verifyError);
            alert("Payment verification error. Please contact support.");
          }
        },
        prefill: {
          name: session.user.user_metadata?.first_name || "Customer",
          email: session.user.email,
        },
        theme: { 
          color: "#D12727" 
        },
        modal: {
          ondismiss: function() {
            console.log("Razorpay modal dismissed");
            newCheckoutButton.disabled = false;
            newCheckoutButton.innerHTML = `
              <i data-lucide="lock" class="h-5 w-5"></i>
              Proceed to Checkout
            `;
            lucide.createIcons();
          }
        }
      };

      console.log("Opening Razorpay checkout...");
      const razor = new Razorpay(options);
      razor.open();

    } catch (err) {
      console.error("Razorpay error:", err);
      alert("Error initiating payment: " + err.message);
      
      // Reset button state
      newCheckoutButton.disabled = false;
      newCheckoutButton.innerHTML = `
        <i data-lucide="lock" class="h-5 w-5"></i>
        Proceed to Checkout
      `;
      lucide.createIcons();
    }
  });

  console.log("Razorpay payment integration initialized");
}

// Initialize when DOM is ready and Razorpay SDK is loaded
function initializeRazorpay() {
  if (typeof Razorpay === 'undefined') {
    console.error("Razorpay SDK not loaded");
    setTimeout(initializeRazorpay, 100);
    return;
  }
  
  console.log("Razorpay SDK loaded, initializing payment integration");
  initRazorpayPayment();
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRazorpay);
} else {
  initializeRazorpay();
}
