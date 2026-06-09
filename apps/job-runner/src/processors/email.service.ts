import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

export type EmailNotificationType =
  | 'welcome'
  | 'reset_password'
  | 'new_follower'
  | 'new_comment';

export interface EmailJobData {
  type: EmailNotificationType;
  to: string;
  payload?: Record<string, string>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(data: EmailJobData): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST', '').trim();
    if (!host) {
      this.logger.warn(
        `SMTP not configured — skipping ${data.type} email to ${data.to}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT', 1025),
      auth: {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASS', ''),
      },
    });

    const { subject, html } = this.buildMessage(data);

    try {
      await transporter.sendMail({
        from: 'noreply@sonoria.local',
        to: data.to,
        subject,
        html,
      });
      this.logger.log(`Sent ${data.type} email to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send ${data.type} email to ${data.to}`, error);
      throw error;
    }
  }

  private buildMessage(data: EmailJobData): { subject: string; html: string } {
    const name = data.payload?.name ?? 'there';
    const p = data.payload ?? {};

    switch (data.type) {
      case 'welcome':
        return {
          subject: 'Bienvenue sur Sonoria',
          html: `<p>Bonjour ${name},</p><p>Bienvenue sur Sonoria !</p>`,
        };
      case 'reset_password':
        return {
          subject: 'Réinitialisation de mot de passe',
          html: `<p>Bonjour ${name},</p><p>Utilisez ce lien pour réinitialiser votre mot de passe : ${p.link ?? ''}</p>`,
        };
      case 'new_follower':
        return {
          subject: 'Nouveau follower',
          html: `<p>Bonjour ${name},</p><p>${p.followerName ?? 'Quelqu\'un'} vous suit désormais.</p>`,
        };
      case 'new_comment':
        return {
          subject: 'Nouveau commentaire',
          html: `<p>Bonjour ${name},</p><p>Nouveau commentaire sur <strong>${p.trackTitle ?? 'votre titre'}</strong>.</p>`,
        };
      default:
        return {
          subject: 'Notification Sonoria',
          html: `<p>Bonjour ${name},</p><p>Vous avez une nouvelle notification.</p>`,
        };
    }
  }
}
