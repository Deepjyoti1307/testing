import nodemailer from 'nodemailer';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';

export class SenderService {
  /**
   * Retrieves all sender accounts for a given user.
   * If none exist, automatically provisions an Ethereal fake SMTP account for seamless testing.
   */
  static async getUserSenders(userId: string) {
    let senders = await prisma.senderAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (senders.length === 0) {
      const defaultSender = await this.provisionEtherealSender(userId);
      senders = [defaultSender];
    }

    return senders;
  }

  /**
   * Generates a new Ethereal test SMTP account and associates it with the user
   */
  static async provisionEtherealSender(userId: string, customName?: string) {
    // If pre-configured in ENV, use that; otherwise generate a live test account
    let user = ENV.ETHEREAL_USER;
    let pass = ENV.ETHEREAL_PASS;

    if (!user || !pass) {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
    }

    const sender = await prisma.senderAccount.create({
      data: {
        userId,
        email: user,
        name: customName || `Ethereal Sender (${user.split('@')[0]})`,
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: user,
        smtpPass: pass,
        hourlyLimit: ENV.DEFAULT_HOURLY_LIMIT_PER_SENDER,
      },
    });

    return sender;
  }

  /**
   * Creates a custom sender account with specific SMTP credentials
   */
  static async createSender(userId: string, data: {
    email: string;
    name: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser: string;
    smtpPass: string;
    hourlyLimit?: number;
  }) {
    return prisma.senderAccount.create({
      data: {
        userId,
        email: data.email,
        name: data.name,
        smtpHost: data.smtpHost || 'smtp.ethereal.email',
        smtpPort: data.smtpPort || 587,
        smtpUser: data.smtpUser,
        smtpPass: data.smtpPass,
        hourlyLimit: data.hourlyLimit || ENV.DEFAULT_HOURLY_LIMIT_PER_SENDER,
      },
    });
  }
}
