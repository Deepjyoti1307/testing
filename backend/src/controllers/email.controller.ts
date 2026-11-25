import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { EmailService } from '../services/email.service.js';
import { extractEmailsFromContent } from '../utils/parser.js';

export class EmailController {
  /**
   * POST /api/emails/schedule
   */
  static async scheduleEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        senderId,
        subject,
        bodyText,
        bodyHtml,
        recipients,
        startTime,
        delayBetweenEmailsSeconds,
        hourlyLimit,
      } = req.body;

      if (!senderId || !subject || !bodyText) {
        res.status(400).json({ error: 'senderId, subject, and bodyText are required' });
        return;
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'Recipients list must contain at least one valid email address' });
        return;
      }

      const result = await EmailService.scheduleBatch(userId, {
        senderId,
        subject,
        bodyText,
        bodyHtml,
        recipients,
        startTime,
        delayBetweenEmailsSeconds: delayBetweenEmailsSeconds ? Number(delayBetweenEmailsSeconds) : 2,
        hourlyLimit: hourlyLimit ? Number(hourlyLimit) : 200,
      });

      res.status(202).json({
        message: 'Emails scheduled successfully',
        data: result,
      });
    } catch (err: any) {
      console.error('Schedule Emails Error:', err);
      res.status(500).json({ error: 'Failed to schedule emails', details: err.message });
    }
  }

  /**
   * POST /api/emails/parse-leads
   * Parses raw CSV/text content and returns count + detected emails
   */
  static parseLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Content string is required' });
        return;
      }

      const emails = extractEmailsFromContent(content);
      res.json({
        count: emails.length,
        emails,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to parse lead content', details: err.message });
    }
  }

  /**
   * GET /api/emails/search
   * Full-text search via Elasticsearch
   */
  static async searchEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const query = req.query.q as string | undefined;
      const status = req.query.status as string | undefined;

      const results = await EmailService.searchEmails(userId, query, status);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: 'Search failed', details: err.message });
    }
  }

  /**
   * GET /api/emails/scheduled
   */
  static async getScheduledEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const search = req.query.q as string | undefined;
      const emails = await EmailService.getScheduledEmails(userId, search);
      res.json({ emails });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve scheduled emails', details: err.message });
    }
  }

  /**
   * GET /api/emails/sent
   */
  static async getSentEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const search = req.query.q as string | undefined;
      const emails = await EmailService.getSentEmails(userId, search);
      res.json({ emails });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve sent emails', details: err.message });
    }
  }

  /**
   * DELETE /api/emails/:id
   */
  static async cancelEmail(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const emailId = req.params.id;
      await EmailService.cancelEmail(userId, emailId);
      res.json({ message: 'Email scheduled job cancelled successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to cancel email job', details: err.message });
    }
  }
}
