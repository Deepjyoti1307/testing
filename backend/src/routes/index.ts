import { Router } from 'express';
import authRoutes from './auth.routes.js';
import senderRoutes from './sender.routes.js';
import emailRoutes from './email.routes.js';
import slackRoutes from './slack.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/senders', senderRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);

export default router;
