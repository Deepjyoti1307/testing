export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  googleId: string;
}

export interface SenderAccount {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hourlyLimit: number;
}

export interface ScheduledEmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'RESCHEDULED' | 'CANCELLED';
  rescheduledCount?: number;
  errorMessage?: string | null;
  sender?: {
    email: string;
    name: string;
  };
}

export interface SentEmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
  etherealUrl?: string | null;
  errorMessage?: string | null;
  sender?: {
    email: string;
    name: string;
  };
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  channelName?: string;
}

export interface SchedulePayload {
  senderId: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  recipients: string[];
  startTime?: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit?: number;
}
