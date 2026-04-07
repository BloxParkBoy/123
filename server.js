require("dotenv").config();

const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(express.static("public"));

// create checkout
app.post("/checkout", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: process.env.PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: "http://localhost:3000/success.html",
    cancel_url: "http://localhost:3000/index.html",
  });

  res.json({ url: session.url });
});

// FAKE save (for now)
let paidUsers = {};

// simulate saving payment
app.post("/mark-paid", (req, res) => {
  const { userId } = req.body;
  paidUsers[userId] = true;
  res.send("saved");
});

// check if paid
app.get("/check-paid/:userId", (req, res) => {
  const userId = req.params.userId;
  res.json({ paid: paidUsers[userId] === true });
});

app.listen(3000, () => console.log("Server running"));
