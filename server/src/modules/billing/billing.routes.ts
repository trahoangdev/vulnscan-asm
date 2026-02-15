import { Router } from 'express';
import express from 'express';
import { authenticate } from '../../middleware/auth';
import { billingController } from './billing.controller';

const router = Router();

// Polar.sh webhook — needs raw body for signature verification, no auth
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.webhook);

// Authenticated billing routes
router.use(authenticate);
router.get('/subscription', billingController.getSubscription);
router.post('/checkout', billingController.createCheckout);
router.post('/portal', billingController.createPortal);
router.post('/cancel', billingController.cancelSubscription);
router.post('/resume', billingController.resumeSubscription);

export default router;
