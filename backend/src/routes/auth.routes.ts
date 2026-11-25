import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/google/url', AuthController.getGoogleAuthUrl);
router.get('/google/callback', AuthController.handleGoogleCallback);
router.get('/me', requireAuth, AuthController.getCurrentUser);
router.post('/logout', requireAuth, AuthController.logout);

export default router;
