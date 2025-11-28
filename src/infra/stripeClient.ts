import Stripe from 'stripe';

import { config } from '../config/env';

export const stripeClient = new Stripe(config.stripeSecretKey);
