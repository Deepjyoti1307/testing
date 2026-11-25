import { Request, Response } from 'express';
import { SlackService } from '../services/slack.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ENV } from '../config/env.js';

export class SlackController {
  /**
   * GET /api/slack/connect
   * Returns Slack OAuth authorization URL
   */
  static getConnectUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const url = SlackService.getSlackAuthUrl(userId);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate Slack OAuth URL', details: err.message });
    }
  }

  /**
   * GET /api/slack/callback
   * Slack OAuth redirect target
   */
  static async handleCallback(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      const stateUserId = req.query.state as string;

      if (!code || !stateUserId) {
        res.redirect(`${ENV.FRONTEND_URL}?slack_error=missing_code_or_state`);
        return;
      }

      await SlackService.handleOAuthCallback(code, stateUserId);
      res.redirect(`${ENV.FRONTEND_URL}?slack=connected`);
    } catch (err: any) {
      console.error('Slack OAuth Callback Error:', err.message);
      res.redirect(`${ENV.FRONTEND_URL}?slack_error=oauth_failed`);
    }
  }

  /**
   * POST /api/slack/webhook
   * Allows connecting Slack directly via Incoming Webhook URL
   */
  static async connectWebhook(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { webhookUrl, channelName } = req.body;

      if (!webhookUrl) {
        res.status(400).json({ error: 'webhookUrl is required' });
        return;
      }

      const integration = await SlackService.connectWebhook(userId, webhookUrl, channelName);
      res.json({
        message: 'Slack webhook connected successfully',
        integration: {
          teamName: integration.teamName,
          channelName: integration.channelName,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to connect Slack webhook', details: err.message });
    }
  }

  /**
   * GET /api/slack/status
   */
  static async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const status = await SlackService.getStatus(userId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch Slack status', details: err.message });
    }
  }

  /**
   * POST /api/slack/test
   * Sends a live test alert to verify the Slack channel
   */
  static async sendTestAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await SlackService.sendTestAlert(userId);
      res.json({ message: 'Test message sent to Slack successfully!', result });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to send Slack test alert', details: err.message });
    }
  }

  /**
   * POST /api/slack/disconnect
   */
  static async disconnect(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      await SlackService.disconnect(userId);
      res.json({ message: 'Slack integration disconnected successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to disconnect Slack', details: err.message });
    }
  }
}
