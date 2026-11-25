import axios from 'axios';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';
import { rateLimitEvents } from './rate-limiter.service.js';

export interface RateLimitAlertData {
  userId: string;
  senderId: string;
  senderEmail: string;
  limit: number;
  currentCount: number;
  nextWindow: Date;
}

export class SlackService {
  /**
   * Generates Slack OAuth v2 authorize URL
   */
  static getSlackAuthUrl(userId: string): string {
    const scopes = 'incoming-webhook,chat:write';
    const redirectUri = encodeURIComponent(ENV.SLACK_REDIRECT_URI);
    return `https://slack.com/oauth/v2/authorize?client_id=${ENV.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${userId}`;
  }

  /**
   * Exchanges authorization code for Slack access token and incoming webhook
   */
  static async handleOAuthCallback(code: string, stateUserId: string) {
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      null,
      {
        params: {
          client_id: ENV.SLACK_CLIENT_ID,
          client_secret: ENV.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: ENV.SLACK_REDIRECT_URI,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data;
    if (!data.ok) {
      throw new Error(`Slack OAuth exchange failed: ${data.error}`);
    }

    const teamId = data.team?.id || 'unknown_team';
    const teamName = data.team?.name || 'Slack Workspace';
    const accessToken = data.access_token;
    const incomingWebhook = data.incoming_webhook?.url || null;
    const channelName = data.incoming_webhook?.channel || null;
    const channelId = data.incoming_webhook?.channel_id || null;

    // Upsert integration into database
    const integration = await prisma.slackIntegration.upsert({
      where: { userId: stateUserId },
      update: {
        teamId,
        teamName,
        accessToken,
        incomingWebhook,
        channelName,
        channelId,
        isActive: true,
      },
      create: {
        userId: stateUserId,
        teamId,
        teamName,
        accessToken,
        incomingWebhook,
        channelName,
        channelId,
        isActive: true,
      },
    });

    return integration;
  }

  /**
   * Connects or updates Slack via direct incoming webhook URL
   */
  static async connectWebhook(userId: string, webhookUrl: string, channelName?: string) {
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('Invalid Slack webhook URL');
    }

    return prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        teamId: 'manual_webhook',
        teamName: 'Connected Slack Channel',
        accessToken: 'manual_token',
        incomingWebhook: webhookUrl,
        channelName: channelName || '#general',
        isActive: true,
      },
      create: {
        userId,
        teamId: 'manual_webhook',
        teamName: 'Connected Slack Channel',
        accessToken: 'manual_token',
        incomingWebhook: webhookUrl,
        channelName: channelName || '#general',
        isActive: true,
      },
    });
  }

  /**
   * Retrieves current Slack connection status
   */
  static async getStatus(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!integration || !integration.isActive) {
      return { connected: false };
    }

    return {
      connected: true,
      teamName: integration.teamName,
      channelName: integration.channelName,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * Disconnects Slack integration
   */
  static async disconnect(userId: string) {
    return prisma.slackIntegration.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  /**
   * Dispatches live Slack Alert when rate limit is exceeded
   */
  static async sendRateLimitAlert(data: RateLimitAlertData): Promise<{ notified: boolean; reason?: string }> {
    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId: data.userId },
      });

      // Graceful degradation: if user hasn't connected Slack, do not crash!
      if (!integration || !integration.isActive || !integration.incomingWebhook) {
        console.log(`ℹ️ [Slack] User ${data.userId} has no active Slack integration. Skipping notification.`);
        return { notified: false, reason: 'NOT_CONNECTED' };
      }

      const formattedNextTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(data.nextWindow);

      // Block Kit formatted Slack alert
      const payload = {
        text: `🚨 [Rate Limit Alert] Hourly limit reached for sender ${data.senderEmail}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Sender Hourly Limit Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Outbound Sender:*\n\`${data.senderEmail}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Quota:*\n*${data.limit}* emails/hr`,
              },
              {
                type: 'mrkdwn',
                text: `*Trigger Count:*\n*${data.currentCount}* attempts`,
              },
              {
                type: 'mrkdwn',
                text: `*Next Resume Window:*\n*${formattedNextTime} UTC*`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🔒 *Zero-Drop Policy Active:* All remaining jobs have been safely auto-delayed into the next hour window. No jobs were lost or dropped.',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ReachInbox Email Job Scheduler • ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      };

      await axios.post(integration.incomingWebhook, payload, { timeout: 10000 });
      console.log(`🔔 [Slack Alert] Live rate-limit alert sent to Slack (${integration.teamName}) for sender ${data.senderEmail}`);

      return { notified: true };
    } catch (err: any) {
      console.error('❌ Failed to dispatch Slack notification:', err.message);
      return { notified: false, reason: err.message };
    }
  }

  /**
   * Dispatches a verification test message to confirm Slack connectivity
   */
  static async sendTestAlert(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!integration || !integration.isActive || !integration.incomingWebhook) {
      throw new Error('Slack is not connected. Please connect Slack first.');
    }

    const payload = {
      text: '✅ ReachInbox Email Scheduler: Slack Integration Connected Successfully!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Slack Integration Connected',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hello! Your ReachInbox Email Job Scheduler is now linked to *${integration.teamName}* (${integration.channelName || 'Webhook channel'}).\n\nYou will receive instant alerts here whenever an outbound sender reaches their hourly rate limit.`,
          },
        },
      ],
    };

    await axios.post(integration.incomingWebhook, payload, { timeout: 10000 });
    return { success: true, teamName: integration.teamName };
  }
}

// Global Event Listener: Automatically dispatch Slack alerts whenever a rate-limit breach occurs
rateLimitEvents.on('rate_limit_hit', async (data: RateLimitAlertData) => {
  try {
    await SlackService.sendRateLimitAlert(data);
  } catch (err: any) {
    console.error('Background Slack Alert Error:', err.message);
  }
});
