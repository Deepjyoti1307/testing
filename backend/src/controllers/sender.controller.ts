import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { SenderService } from '../services/sender.service.js';
import { RateLimiterService } from '../services/rate-limiter.service.js';
import prisma from '../config/db.js';

export class SenderController {
  /**
   * GET /api/senders
   */
  static async listSenders(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const senders = await SenderService.getUserSenders(userId);
      res.json({ senders });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch senders', details: err.message });
    }
  }

  /**
   * GET /api/senders/:id/stats
   * Returns live hourly rate limit usage from Redis
   */
  static async getSenderStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const senderId = req.params.id;

      const sender = await prisma.senderAccount.findFirst({
        where: { id: senderId, userId },
      });

      if (!sender) {
        res.status(404).json({ error: 'Sender account not found' });
        return;
      }

      const stats = await RateLimiterService.getSenderHourlyUsage(sender.id, sender.hourlyLimit);
      res.json({
        sender: {
          id: sender.id,
          name: sender.name,
          email: sender.email,
        },
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve sender stats', details: err.message });
    }
  }

  /**
   * POST /api/senders
   */
  static async createSender(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { email, name, smtpHost, smtpPort, smtpUser, smtpPass, hourlyLimit } = req.body;

      if (!email || !name || !smtpUser || !smtpPass) {
        res.status(400).json({ error: 'Missing required sender credentials' });
        return;
      }

      const sender = await SenderService.createSender(userId, {
        email,
        name,
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
        smtpUser,
        smtpPass,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : undefined,
      });

      res.status(201).json({ sender });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create sender', details: err.message });
    }
  }

  /**
   * POST /api/senders/provision-ethereal
   */
  static async provisionEthereal(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { name } = req.body;
      const sender = await SenderService.provisionEtherealSender(userId, name);
      res.status(201).json({ sender });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to provision Ethereal sender', details: err.message });
    }
  }
}
