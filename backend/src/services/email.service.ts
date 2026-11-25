import prisma from '../config/db.js';
import { emailQueue } from '../queues/email.queue.js';
import { ScheduleBatchInput } from '../types/index.js';
import { ElasticsearchService } from './elasticsearch.service.js';

export class EmailService {
  /**
   * Schedules a bulk list of emails with zero cron jobs using BullMQ delayed execution.
   * Synchronously indexes into PostgreSQL and Elasticsearch.
   */
  static async scheduleBatch(userId: string, input: ScheduleBatchInput) {
    const {
      senderId,
      subject,
      bodyText,
      bodyHtml,
      recipients,
      startTime,
      delayBetweenEmailsSeconds,
      hourlyLimit,
    } = input;

    // Fetch sender to index sender email in Elasticsearch
    const sender = await prisma.senderAccount.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      throw new Error(`Sender account ${senderId} not found`);
    }

    const startTimestamp = startTime ? new Date(startTime).getTime() : Date.now();
    const delayStepMs = Math.max(0, (delayBetweenEmailsSeconds || 2) * 1000);
    const now = Date.now();

    const createdJobs = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipientEmail = recipients[i].trim().toLowerCase();
      if (!recipientEmail) continue;

      // Compute exact target dispatch timestamp for this email in sequence
      const targetTimeMs = Math.max(startTimestamp + i * delayStepMs, now);
      const scheduledAt = new Date(targetTimeMs);
      const bullDelay = Math.max(0, targetTimeMs - now);

      // 1. Create record in PostgreSQL
      const emailRecord = await prisma.emailJob.create({
        data: {
          userId,
          senderId,
          recipientEmail,
          subject,
          bodyText,
          bodyHtml,
          scheduledAt,
          status: 'SCHEDULED',
        },
      });

      // 2. Add to BullMQ with deterministic Job ID (idempotent, restart-safe)
      const bullJobId = `job_${emailRecord.id}`;
      const job = await emailQueue.add(
        'sendEmail',
        {
          jobRecordId: emailRecord.id,
          userId,
          senderId,
          recipientEmail,
          subject,
          bodyText,
          bodyHtml,
          scheduledAt: scheduledAt.toISOString(),
          hourlyLimit: hourlyLimit || sender.hourlyLimit || 200,
          delayBetweenEmailsMs: delayStepMs,
        },
        {
          delay: bullDelay,
          jobId: bullJobId,
        }
      );

      // Link bullJobId in database
      await prisma.emailJob.update({
        where: { id: emailRecord.id },
        data: { bullJobId: job.id },
      });

      // 3. Index record in Elasticsearch
      await ElasticsearchService.indexEmail({
        id: emailRecord.id,
        userId,
        senderId,
        senderEmail: sender.email,
        recipientEmail,
        subject,
        bodyText,
        status: 'SCHEDULED',
        scheduledAt: scheduledAt.toISOString(),
        rescheduledCount: 0,
      });

      createdJobs.push(emailRecord);
    }

    return {
      count: createdJobs.length,
      firstScheduledAt: createdJobs[0]?.scheduledAt,
      lastScheduledAt: createdJobs[createdJobs.length - 1]?.scheduledAt,
    };
  }

  /**
   * Full-text search across emails using Elasticsearch (with PostgreSQL fallback)
   */
  static async searchEmails(userId: string, query?: string, status?: string) {
    return ElasticsearchService.searchEmails(userId, query, status);
  }

  /**
   * Fetches scheduled (future or pending) email jobs
   */
  static async getScheduledEmails(userId: string, search?: string) {
    if (search && search.trim()) {
      const searchRes = await ElasticsearchService.searchEmails(userId, search, 'SCHEDULED');
      return searchRes.hits;
    }

    return prisma.emailJob.findMany({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'PROCESSING', 'RESCHEDULED'] },
      },
      include: {
        sender: { select: { email: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Fetches sent or failed email jobs
   */
  static async getSentEmails(userId: string, search?: string) {
    if (search && search.trim()) {
      const searchRes = await ElasticsearchService.searchEmails(userId, search, 'SENT');
      return searchRes.hits;
    }

    return prisma.emailJob.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'FAILED'] },
      },
      include: {
        sender: { select: { email: true, name: true } },
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  /**
   * Cancels a scheduled email
   */
  static async cancelEmail(userId: string, emailId: string) {
    const emailJob = await prisma.emailJob.findFirst({
      where: { id: emailId, userId },
    });

    if (!emailJob) {
      throw new Error('Email job not found');
    }

    if (emailJob.bullJobId) {
      const bullJob = await emailQueue.getJob(emailJob.bullJobId);
      if (bullJob) {
        await bullJob.remove();
      }
    }

    // Update in database
    const updated = await prisma.emailJob.update({
      where: { id: emailId },
      data: { status: 'CANCELLED' },
    });

    // Update in Elasticsearch
    await ElasticsearchService.updateEmailStatus(emailId, { status: 'CANCELLED' });

    return updated;
  }
}
