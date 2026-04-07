require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin
const serviceAccount = require("./firebase-service-account.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// create checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "Missing userId or email" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price: process.env.PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/success.html",
      cancel_url: "http://localhost:3000/index.html",
      metadata: {
        userId,
        email,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// webhook needs raw body
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session.metadata.userId;
      const email = session.metadata.email;

      try {
        await db.collection("users").doc(userId).set(
          {
            email: email,
            paid: true,
            plan: "premium",
            stripeCustomerEmail: session.customer_email || email,
            stripeSessionId: session.id,
            paidAt: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log(`Saved paid status for user ${userId}`);
      } catch (dbError) {
        console.error("Firestore save error:", dbError.message);
      }
    }

    res.json({ received: true });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
