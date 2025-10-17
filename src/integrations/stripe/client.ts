import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = "pk_live_51RpC4O2WGHZ3r9wpNW6nzaUn4HbxgQ0F9gkLgFZKZDAYvTUUnsJoupSnmXKF3IGtYqCA4kKS0wqifYIifCXff1c3002lmKoys1";

export const getStripe = () => {
  return loadStripe(STRIPE_PUBLISHABLE_KEY);
};