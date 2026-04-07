require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.post('/checkout', async (req, res) => {
  try {
    const PRICE_MAP = {
      basic: 500,
      pro: 1500,
      premium: 3000,
    };

    const { plan } = req.body;
    const amount = PRICE_MAP[plan];

    if (!amount) {
      return res.status(400).send('Invalid plan');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan} plan`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error('CHECKOUT ERROR:', error);
    res.status(500).send(error.message);
  }
});

app.get('/success', async (req, res) => {
  try {
    const result = await Promise.all([
      stripe.checkout.sessions.retrieve(req.query.session_id, {
        expand: ['payment_intent.payment_method'],
      }),
      stripe.checkout.sessions.listLineItems(req.query.session_id),
    ]);

    console.log(JSON.stringify(result, null, 2));
    res.send('Your payment was successful');
  } catch (error) {
    console.error('SUCCESS ERROR:', error);
    res.status(500).send(error.message);
  }
});

app.get('/cancel', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
