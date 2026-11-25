import { Router } from 'express';
import { SlackController } from '../controllers/slack.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// OAuth callback is called by Slack's server without Bearer token
router.get('/callback', SlackController.handleCallback);

// Authenticated Slack management endpoints
router.get('/connect', requireAuth, SlackController.getConnectUrl);
router.post('/webhook', requireAuth, SlackController.connectWebhook);
router.get('/status', requireAuth, SlackController.getStatus);
router.post('/test', requireAuth, SlackController.sendTestAlert);
router.post('/disconnect', requireAuth, SlackController.disconnect);

export default router;
