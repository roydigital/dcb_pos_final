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
      // Check if user is logged in
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        alert("Please sign in to proceed with payment");
        window.location.href = 'auth.html?from=cart';
        return;
      }

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

      const razor = new Razorpay(options);
      razor.open();
      checkoutButton.innerText = "Proceed to Checkout";
      checkoutButton.disabled = false;
    } catch (err) {
      console.error(err);
      alert("Error initiating payment!");
      checkoutButton.innerText = "Proceed to Checkout";
      checkoutButton.disabled = false;
    }
  });
});
