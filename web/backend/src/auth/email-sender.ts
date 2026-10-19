import { APIError } from 'better-auth/api';
import type { AppConfig } from '../config/config.js';

type EmailContent = { to: string; subject: string; text: string; html: string };

export class ResendEmailSender {
  constructor(private readonly config: AppConfig, private readonly fetcher: typeof fetch = fetch) {}

  get configured(): boolean {
    return Boolean(this.config.resendApiKey && this.config.emailFrom);
  }

  async send(message: EmailContent): Promise<void> {
    if (!this.config.resendApiKey || !this.config.emailFrom) {
      throw new APIError('SERVICE_UNAVAILABLE', { code: 'EMAIL_UNAVAILABLE', message: 'Email delivery is not configured.' });
    }

    let response: Response;
    try {
      response = await this.fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.config.emailFrom, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new APIError('SERVICE_UNAVAILABLE', { code: 'EMAIL_UNAVAILABLE', message: 'Email delivery is temporarily unavailable.' });
    }
    try { await response.body?.cancel(); } catch {}
    if (!response.ok) {
      throw new APIError('SERVICE_UNAVAILABLE', { code: 'EMAIL_UNAVAILABLE', message: 'Email delivery is temporarily unavailable.' });
    }
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}
