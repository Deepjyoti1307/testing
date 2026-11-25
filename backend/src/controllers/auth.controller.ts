import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ENV } from '../config/env.js';

export class AuthController {
  /**
   * GET /api/auth/google/url
   */
  static getGoogleAuthUrl(_req: Request, res: Response) {
    try {
      const url = AuthService.getGoogleAuthUrl();
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate auth url', details: err.message });
    }
  }

  /**
   * GET /api/auth/google/callback
   */
  static async handleGoogleCallback(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).json({ error: 'Missing authorization code' });
        return;
      }

      const { user, token } = await AuthService.handleGoogleCallback(code);

      // Redirect to frontend with token in query param
      res.redirect(`${ENV.FRONTEND_URL}/auth/callback?token=${token}&email=${encodeURIComponent(user.email)}`);
    } catch (err: any) {
      console.error('Google Callback Error:', err);
      res.redirect(`${ENV.FRONTEND_URL}/login?error=auth_failed`);
    }
  }

  /**
   * GET /api/auth/me
   */
  static getCurrentUser(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json({ user: req.user });
  }

  /**
   * POST /api/auth/logout
   */
  static logout(_req: Request, res: Response) {
    res.json({ success: true, message: 'Logged out successfully' });
  }
}
