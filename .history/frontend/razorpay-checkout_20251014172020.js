document.addEventListener("DOMContentLoaded", function () {
  const checkoutButton = document.getElementById("proceedCheckout");

  if (!checkoutButton) return;

  checkoutButton.addEventListener("click", async function () {
    try {
      checkoutButton.disabled = true;
      checkoutButton.innerText = "Processing...";

      const totalAmount = localStorage.getItem("cartTotal")
        ? parseFloat(localStorage.getItem("cartTotal")) * 100
        : 0;

      const response = await fetch("https://dcb-pos-final.onrender.com/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount }),
      });

      const data = await response.json();
      const options = {
        key: data.key,
        amount: data.amount,
        currency: "INR",
        name: "Delhi Chicken Brothers",
        description: "Order Payment",
        order_id: data.orderId,
        handler: async function (response) {
          const verifyRes = await fetch("https://dcb-pos-final.onrender.com/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            window.location.href = verifyData.redirectUrl;
          } else {
            alert("Payment verification failed!");
          }
        },
        theme: { color: "#f54242" },
      };

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
