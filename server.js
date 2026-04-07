require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.post('/checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Node.js and Express book'
            },
            unit_amount: 50 * 100
          },
          quantity: 1
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'JavaScript T-Shirt'
            },
            unit_amount: 20 * 100
          },
          quantity: 2
        }
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`
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
        expand: ['payment_intent.payment_method']
      }),
      stripe.checkout.sessions.listLineItems(req.query.session_id)
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
  console.log(`Server running on port ${PORT}`);
});

Also make sure Ren
