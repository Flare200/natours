import axios from "axios";
import { showAlert } from './alerts.js';
const stripe = Stripe('pk_test_51S8P8aRvM0IC8u9l4X1wM1AtVlMlRtB7YXKMIFe0tgVnc0LLAMepqo1w2NUnjNLGFl8yeZsf7OGvVpuUSXciF6c800CxNwPKHj');

const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
  const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

  // 2) Create checkout form + charge credit card
  await stripe.redirectToCheckout({ sessionId: session.data.session.id });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

export { bookTour };