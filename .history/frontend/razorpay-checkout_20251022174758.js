async function triggerRazorpayCheckout() {
    const checkoutButton = document.getElementById('proceedCheckout');
    const cartTotalElement = document.getElementById("cart-total");

    if (!cartTotalElement) {
        alert("Could not find cart total. Checkout cannot proceed.");
        return;
    }

    const totalText = cartTotalElement.textContent.replace('₹', '');
    const totalAmount = parseFloat(totalText) * 100; // Amount in paise

    if (totalAmount <= 0) {
        alert("Your cart is empty. Please add items before checking out.");
        return;
    }

    checkoutButton.disabled = true;
    checkoutButton.innerHTML = `<div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Processing...`;

    try {
        // 1. Create a Razorpay order from your backend
        const orderResponse = await fetch("/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: totalAmount }),
        });

        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            throw new Error(`Failed to create Razorpay order: ${errorText}`);
        }

        const orderData = await orderResponse.json();
        const { data: { session } } = await window.supabaseClient.auth.getSession();

        const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: "INR",
            name: "Delhi Chicken Brothers",
            description: "Order Payment",
            order_id: orderData.orderId,
            handler: async function (response) {
                // 2. Verify the payment on your backend
                const verificationResponse = await fetch("/verify-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(response),
                });

                const verificationData = await verificationResponse.json();

                const orderStatus = verificationData.success ? 'Accepted' : 'Declined';
                const transactionId = verificationData.success ? response.razorpay_payment_id : 'N/A';

                const orderDetails = await window.createOrderInSupabase('UPI', transactionId, orderStatus);

                if (orderDetails) {
                    window.location.href = `order-status.html?order_id=${orderDetails.id}`;
                } else {
                    alert("There was an issue processing your order. Please contact support.");
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
                ondismiss: function () {
                    console.log("Razorpay modal dismissed.");
                    checkoutButton.disabled = false;
                    checkoutButton.innerHTML = `<i data-lucide="lock" class="h-5 w-5"></i> Proceed to Checkout`;
                    lucide.createIcons();
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (error) {
        console.error("Error during Razorpay checkout:", error);
        alert(`An error occurred: ${error.message}`);
        checkoutButton.disabled = false;
        checkoutButton.innerHTML = `<i data-lucide="lock" class="h-5 w-5"></i> Proceed to Checkout`;
        lucide.createIcons();
    }
}
