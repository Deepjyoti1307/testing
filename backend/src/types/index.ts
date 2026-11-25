export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  googleId: string;
}

export interface ScheduleBatchInput {
  senderId: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  recipients: string[];
  startTime: string; // ISO string
  delayBetweenEmailsSeconds: number;
  hourlyLimit?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  rescheduleDelayMs?: number;
}

export interface EmailJobData {
  jobRecordId: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  scheduledAt: string;
  hourlyLimit: number;
  delayBetweenEmailsMs: number;
}
