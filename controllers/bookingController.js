import Stripe from 'stripe';
import Tour from './../models/tourModel.js';
import Booking from './../models/bookingModel.js';
import User from './../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import { createOne, deleteOne, getAll, getOne, updateOne } from './handlerFactory.js';

const getCheckOutSession = catchAsync(async (req, res, next) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const transformedItems = [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: tour.price * 100,
        product_data: {
          name: `${tour.name} Tour`,
          description: tour.summary,
          images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
        },
      },
    },
  ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: transformedItems,
    mode: 'payment'
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session
  });
});

const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].price_data.unit_amount / 100;
  await Booking.create({ tour, user, price });
};

const webhookCheckout = (req, res, next) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    createBookingCheckout(session);
  }

  res.status(200).json({ received: true });
};

const createBooking = createOne(Booking);
const getBooking = getOne(Booking);
const getAllBookings = getAll(Booking);
const updateBooking = updateOne(Booking);
const deleteBooking = deleteOne(Booking);

export {
  getCheckOutSession,
  createBooking,
  getBooking,
  getAllBookings,
  updateBooking,
  deleteBooking,
  webhookCheckout
};