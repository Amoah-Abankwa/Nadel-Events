import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Env } from '../../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailSender {
  private readonly logger = new Logger(EmailSender.name);
  private readonly client?: Resend;
  private readonly from?: string;
  private readonly replyTo?: string;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.replyTo = config.get('EMAIL_REPLY_TO', { infer: true });
    if (key) this.client = new Resend(key);
  }

  async send(msg: EmailMessage): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.log(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
      return;
    }
    const { error } = await this.client.emails.send({ from: this.from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, ...(this.replyTo ? { replyTo: this.replyTo } : {}) });
    if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
  }
}
