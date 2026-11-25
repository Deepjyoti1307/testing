import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { EMAIL_QUEUE_NAME, emailQueue } from './email.queue.js';
import { EmailJobData } from '../types/index.js';
import { SmtpService } from '../services/smtp.service.js';
import { RateLimiterService, rateLimitEvents } from '../services/rate-limiter.service.js';
import { ElasticsearchService } from '../services/elasticsearch.service.js';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const data = job.data;
    console.log(`[Worker] Picking up Job ${job.id} for recipient: ${data.recipientEmail}`);

    // Fetch Sender Account details & configured limit
    const sender = await prisma.senderAccount.findUnique({
      where: { id: data.senderId },
    });

    if (!sender) {
      const err = new Error(`Sender account ${data.senderId} not found`);
      await prisma.emailJob.update({
        where: { id: data.jobRecordId },
        data: { status: 'FAILED', errorMessage: err.message },
      });
      await ElasticsearchService.updateEmailStatus(data.jobRecordId, {
        status: 'FAILED',
        errorMessage: err.message,
      });
      throw err;
    }

    const effectiveHourlyLimit = sender.hourlyLimit || data.hourlyLimit || ENV.DEFAULT_HOURLY_LIMIT_PER_SENDER;

    // 1. ATOMIC RATE LIMIT CHECK (Redis Lua Token Bucket)
    const rateCheck = await RateLimiterService.checkAndIncrement(sender.id, effectiveHourlyLimit);

    if (!rateCheck.allowed) {
      console.warn(
        `⚠️ [RateLimit] Hourly limit of ${effectiveHourlyLimit} reached for sender ${sender.email}. ` +
        `Current count: ${rateCheck.currentCount}. Auto-rescheduling job into next hour window (+${Math.round(rateCheck.rescheduleDelayMs / 1000)}s)...`
      );

      // Re-enqueue job into BullMQ for the next available hour window (Zero-drop policy)
      const rescheduledJobId = `resched_${data.jobRecordId}_${Date.now()}`;
      await emailQueue.add(
        'sendEmail',
        {
          ...data,
          scheduledAt: rateCheck.nextWindow.toISOString(),
        },
        {
          delay: rateCheck.rescheduleDelayMs,
          jobId: rescheduledJobId,
        }
      );

      // Update Database state to RESCHEDULED
      await prisma.emailJob.update({
        where: { id: data.jobRecordId },
        data: {
          status: 'RESCHEDULED',
          scheduledAt: rateCheck.nextWindow,
          rescheduledCount: { increment: 1 },
          errorMessage: `Hourly limit reached (${rateCheck.currentCount}/${effectiveHourlyLimit}). Rescheduled to next hour window: ${rateCheck.nextWindow.toISOString()}`,
        },
      });

      // Update Elasticsearch state to RESCHEDULED
      await ElasticsearchService.updateEmailStatus(data.jobRecordId, {
        status: 'RESCHEDULED',
        scheduledAt: rateCheck.nextWindow.toISOString(),
      });

      // Emit event for real-time Slack alerting
      rateLimitEvents.emit('rate_limit_hit', {
        userId: data.userId,
        senderId: sender.id,
        senderEmail: sender.email,
        limit: effectiveHourlyLimit,
        currentCount: rateCheck.currentCount,
        nextWindow: rateCheck.nextWindow,
      });

      // Acknowledge job cleanly without throwing an error
      return {
        rescheduled: true,
        reason: 'HOURLY_LIMIT_EXCEEDED',
        nextWindow: rateCheck.nextWindow,
      };
    }

    // 2. MARK AS PROCESSING IN DATABASE & ELASTICSEARCH
    await prisma.emailJob.update({
      where: { id: data.jobRecordId },
      data: { status: 'PROCESSING' },
    });
    await ElasticsearchService.updateEmailStatus(data.jobRecordId, { status: 'PROCESSING' });

    // 3. DISPATCH VIA SMTP
    try {
      const { messageId, etherealUrl } = await SmtpService.sendEmail({
        smtpHost: sender.smtpHost,
        smtpPort: sender.smtpPort,
        smtpUser: sender.smtpUser,
        smtpPass: sender.smtpPass,
        fromName: sender.name,
        fromEmail: sender.email,
        to: data.recipientEmail,
        subject: data.subject,
        text: data.bodyText,
        html: data.bodyHtml,
      });

      const sentAtDate = new Date();

      // Update database status to SENT
      await prisma.emailJob.update({
        where: { id: data.jobRecordId },
        data: {
          status: 'SENT',
          sentAt: sentAtDate,
          etherealUrl: etherealUrl,
          errorMessage: null,
        },
      });

      // Synchronize update to Elasticsearch
      await ElasticsearchService.updateEmailStatus(data.jobRecordId, {
        status: 'SENT',
        sentAt: sentAtDate.toISOString(),
        etherealUrl: etherealUrl,
      });

      return { success: true, messageId, etherealUrl };
    } catch (err: any) {
      console.error(`[Worker] Failed to dispatch email for job ${job.id}:`, err.message);

      // Rollback counter if SMTP connection failed before send
      await RateLimiterService.rollbackIncrement(sender.id);

      // Record error on job in DB & Elasticsearch
      await prisma.emailJob.update({
        where: { id: data.jobRecordId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      });

      await ElasticsearchService.updateEmailStatus(data.jobRecordId, {
        status: 'FAILED',
        errorMessage: err.message,
      });

      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: ENV.WORKER_CONCURRENCY,
    limiter: {
      max: 1,
      duration: ENV.DEFAULT_MIN_DELAY_MS, // Inter-email throttle to mimic human behavior & avoid greylisting
    },
  }
);

emailWorker.on('completed', (job: Job) => {
  console.log(`[Worker] Job ${job.id} execution finalized.`);
});

emailWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});
