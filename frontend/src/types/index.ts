export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  googleId: string;
}

export interface ScheduledEmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'RESCHEDULED' | 'CANCELLED';
  senderEmail?: string;
}

export interface SentEmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
  etherealUrl?: string;
  senderEmail?: string;
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
}
